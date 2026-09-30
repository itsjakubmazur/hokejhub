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
  // An NHL night (North American date N) is played through the Czech night and is read the
  // next morning, so it is listed under the Prague date N + 1 — all of it, including the games
  // that face off before our midnight.
  const [es, nhl] = await Promise.all([
    fetchJson(esportsUrls.scoreboard(date), parseScoreboard, { revalidate, notFoundIsEmpty: true }),
    fetchJson(nhlUrls.score(nhlNightOf(date)), parseNhlScore, { revalidate }),
  ]);

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

  // Model probabilities for extraliga games that have not started (needs the database).
  const predictions: NonNullable<ScoreboardResponse["predictions"]> = {};
  const elh = games.filter((g) => g.leagueKey === "cz-elh" && g.status === "scheduled");
  if (elh.length && dbAvailable()) {
    try {
      // The main feed lacks hokej.cz club ids; the ELH-only variant has them (same onlajny team ids).
      const clubOf = new Map<string, number>();
      for (const g of elh) for (const t of [g.home, g.away]) if (t.hokejczClubId) clubOf.set(t.id, t.hokejczClubId);
      if (elh.some((g) => !clubOf.has(g.home.id) || !clubOf.has(g.away.id))) {
        const alt = await fetchJson(esportsUrls.scoreboardAlt(date), parseScoreboardAlt, { revalidate: 3600, notFoundIsEmpty: true });
        for (const g of alt.data ?? []) for (const t of [g.home, g.away]) if (t.hokejczClubId) clubOf.set(t.id, t.hokejczClubId);
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
