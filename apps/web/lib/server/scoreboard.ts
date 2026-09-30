import {
  addDays,
  predict,
  combineScoreboard,
  esportsUrls,
  nhlUrls,
  parseLiveOdds,
  parseNhlScore,
  parseScoreboard,
  parseScoreboardAlt,
  pragueDate,
  type Game,
} from "@hokejhub/core";
import { dbAvailable } from "./db";
import { getEloState } from "./model";
import { findTeamByAbbrev, getTeamLogos } from "./queries";
import type { ScoreboardResponse } from "../types";
import { fetchJson } from "./fetcher";

/** North American date of the NHL night shown under a Prague date. */
export const nhlNightOf = (pragueDay: string) => addDays(pragueDay, -1);

/** Prague date an NHL game is listed under, from its start time. */
export function nhlListDate(startAt: string): string {
  const na = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(startAt));
  return addDays(na, 1);
}

/** Cache lifetime in seconds for a scoreboard date: short for today, long for the past. */
export function revalidateFor(date: string): number {
  const today = pragueDate();
  if (date === today || date === addDays(today, -1)) return 20;
  return date < today ? 3600 : 600;
}

const isLive = (g: Game) => g.status === "live" || g.status === "intermission";

export async function getScoreboard(date: string): Promise<ScoreboardResponse> {
  const revalidate = revalidateFor(date);
  // A Prague day shows two NHL nights: the one just played (North American date D − 1, read in
  // the morning as results) and the one ahead (date D, faced off tonight from our evening on).
  const [es, nhlPast, nhlNext] = await Promise.all([
    fetchJson(esportsUrls.scoreboard(date), parseScoreboard, { revalidate, notFoundIsEmpty: true }),
    fetchJson(nhlUrls.score(nhlNightOf(date)), parseNhlScore, { revalidate }),
    fetchJson(nhlUrls.score(date), parseNhlScore, { revalidate }),
  ]);
  const seen = new Set<string>();
  const nhlList = [...(nhlPast.data ?? []), ...(nhlNext.data ?? [])].filter((g) => !seen.has(g.id) && seen.add(g.id));
  const nhl = { data: nhlPast.data || nhlNext.data ? nhlList : null, state: nhlPast.state === "ok" ? nhlNext.state : nhlPast.state };

  // If the main feed fails outright (not a plain 404), fall back to the older ELH-only variant.
  let esGames = es.data ?? [];
  let esState = es.state;
  if (es.state === "error") {
    const alt = await fetchJson(esportsUrls.scoreboardAlt(date), parseScoreboardAlt, {
      revalidate,
      notFoundIsEmpty: true,
    });
    if (alt.data) {
      esGames = alt.data;
      esState = "stale";
    }
  }

  const games = combineScoreboard(esGames, nhl.data).sort(
    (a, b) => a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id),
  );

  let liveOdds: ScoreboardResponse["liveOdds"] = {};
  let oddsState: ScoreboardResponse["sources"][string] = "empty";
  if (games.some(isLive)) {
    const odds = await fetchJson(esportsUrls.liveOdds(), parseLiveOdds, { revalidate: 20 });
    oddsState = odds.state;
    if (odds.data) liveOdds = Object.fromEntries(odds.data);
  }

  // Extraliga: hokej.cz club ids (the main feed lacks them; the ELH-only variant has them, same
  // onlajny team ids), then the model for games not started and the current crests from our
  // database — the live feed's S3 logos lag behind rebrands.
  const predictions: NonNullable<ScoreboardResponse["predictions"]> = {};
  const elhAll = games.filter((g) => g.leagueKey === "cz-elh");
  const elh = elhAll.filter((g) => g.status === "scheduled");
  if (elhAll.length && dbAvailable()) {
    try {
      const clubOf = new Map<string, number>();
      for (const g of elhAll) for (const t of [g.home, g.away]) if (t.hokejczClubId) clubOf.set(t.id, t.hokejczClubId);
      if (elhAll.some((g) => !clubOf.has(g.home.id) || !clubOf.has(g.away.id))) {
        const alt = await fetchJson(esportsUrls.scoreboardAlt(date), parseScoreboardAlt, { revalidate: 3600, notFoundIsEmpty: true });
        for (const g of alt.data ?? []) for (const t of [g.home, g.away]) if (t.hokejczClubId) clubOf.set(t.id, t.hokejczClubId);
      }
      // Games the feed lists from neighbouring days are not in that day's ELH variant: resolve
      // the rest by abbreviation against our own team table.
      const missing = new Set<string>();
      for (const g of elhAll) for (const t of [g.home, g.away]) if (!clubOf.has(t.id)) missing.add(t.id);
      if (missing.size) {
        const byId = new Map(elhAll.flatMap((g) => [g.home, g.away]).map((t) => [t.id, t]));
        await Promise.all(
          [...missing].map(async (id) => {
            const team = byId.get(id);
            const hit = team ? await findTeamByAbbrev("cz-elh", team.abbrev, team.shortName).catch(() => null) : null;
            const num = hit ? Number(/^hcz-(\d+)$/.exec(hit)?.[1]) : NaN;
            if (Number.isFinite(num)) clubOf.set(id, num);
          }),
        );
      }
      const logos = await getTeamLogos("cz-elh").catch(() => ({}) as Record<string, string>);
      for (const g of elhAll) {
        for (const t of [g.home, g.away]) {
          const club = clubOf.get(t.id);
          const url = club ? logos[`hcz-${club}`] : undefined;
          if (url) t.logoUrl = url;
        }
      }
      const { state } = await getEloState("cz-elh");
      for (const g of elh) {
        const h = clubOf.get(g.home.id);
        const a = clubOf.get(g.away.id);
        if (!h || !a) continue;
        const p = predict(state.ratings.get(`hcz-${h}`) ?? 1500, state.ratings.get(`hcz-${a}`) ?? 1500);
        predictions[g.id] = { home: p.home, draw: p.draw, away: p.away, expHome: p.expHome, expAway: p.expAway };
      }
    } catch {
      /* predictions are optional */
    }
  }

  return {
    date,
    games,
    liveOdds,
    predictions,
    sources: {
      esports: esState,
      nhl: nhl.state,
      odds: oddsState,
    },
    fetchedAt: new Date().toISOString(),
  };
}
