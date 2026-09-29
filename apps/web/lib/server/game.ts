import {
  esportsUrls,
  nhlUrls,
  parseHokejczMatch,
  hokejczPaths,
  parseLiveOdds,
  parseNhlGoals,
  parseNhlLanding,
  parseNhlRoster,
  parseNhlShots,
  parseTicketAnalysis,
  hokejczShotsToEvents,
  hokejczShotsUrl,
  nhlShotsWithXg,
  onlajnyMatchUrls,
  parseHokejczShots,
  parseOnlajnyPlayerStats,
  parseOnlajnyRoster,
  parseOnlajnySummary,
  penaltyWindows,
  seasonOf,
  shotsWithXg,
  type HokejczMatch,
  pragueToUtcIso,
  type BetDistribution,
  type Game,
  type Odds1x2,
} from "@hokejhub/core";
import type { GameDetailResponse } from "../types";
import { dbAvailable } from "./db";
import { fetchJson, type SourceState } from "./fetcher";
import { getHeadToHead, sql } from "./queries";
import { getScoreboard, revalidateFor } from "./scoreboard";

/**
 * hokej.cz blocks some datacenter IPs; in local development point this at the deployed proxy
 * (`https://hokejhub.vercel.app/api/src/hokejcz/`).
 */
const HOKEJCZ_ORIGIN = process.env.HOKEJCZ_ORIGIN ?? "https://www.hokej.cz/";

async function hokejczBox(game: Game, sources: Record<string, SourceState>) {
  const id = game.external.hokejczId;
  if (!id || game.status === "scheduled" || game.status === "postponed" || game.status === "cancelled") return null;
  const live = game.status === "live" || game.status === "intermission";
  const res = await fetchJson(
    new URL(hokejczPaths.match(id), HOKEJCZ_ORIGIN).toString(),
    (html) => parseHokejczMatch(html as string, id),
    { revalidate: live ? 30 : 3600, text: true },
  );
  sources.hokejcz = res.state;
  return res.data;
}

/** Line-ups, per-period team/player stats (onlajny S3) and the shot feed (hokej.cz S3). */
async function czDetails(game: Game, box: HokejczMatch | null, sources: Record<string, SourceState>) {
  const live = game.status === "live" || game.status === "intermission";
  const revalidate = live ? 20 : game.status === "final" ? 3600 : 300;
  const onl = game.external.onlajnyId;
  const season = seasonOf(game.startAt);
  const hcz = game.external.hokejczId;
  const [roster, summary, players, shotFeed] = await Promise.all([
    onl ? fetchJson(onlajnyMatchUrls.roster(season, onl), parseOnlajnyRoster, { revalidate, notFoundIsEmpty: true }) : null,
    onl && game.status !== "scheduled"
      ? fetchJson(onlajnyMatchUrls.summary(season, onl), parseOnlajnySummary, { revalidate, notFoundIsEmpty: true })
      : null,
    onl && game.status !== "scheduled"
      ? fetchJson(onlajnyMatchUrls.playerStats(season, onl), parseOnlajnyPlayerStats, { revalidate, notFoundIsEmpty: true })
      : null,
    hcz && game.status !== "scheduled"
      ? fetchJson(hokejczShotsUrl(hcz), parseHokejczShots, { revalidate, notFoundIsEmpty: true })
      : null,
  ]);
  if (roster) sources.lineups = roster.state;
  if (shotFeed) sources.shots = shotFeed.state;
  let shots = null;
  if (shotFeed?.data) {
    const pens = box ? penaltyWindows(box.penalties, box.home.abbrev) : [];
    shots = hokejczShotsToEvents(shotsWithXg(shotFeed.data, pens), game.home.id, game.away.id);
  }
  return {
    lineups: roster?.data?.available ? roster.data : null,
    periodStats: summary?.data ?? null,
    playerStats: players?.data ?? null,
    shots,
    faceoffZones: shotFeed?.data?.faceoffZones ?? null,
  };
}

/** North American (Eastern) calendar date of a start time — the NHL API's date key. */
export function nhlDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(iso));
}

async function extras(game: Game, sources: Record<string, SourceState>) {
  const live = game.status === "live" || game.status === "intermission";
  const onlajnyId = game.external.onlajnyId;
  let liveOdds: Odds1x2 | null = null;
  let bets: BetDistribution | null = null;
  if (onlajnyId) {
    const year = new Date(game.startAt).getUTCFullYear();
    const [odds, ta] = await Promise.all([
      live ? fetchJson(esportsUrls.liveOdds(), parseLiveOdds, { revalidate: 20 }) : null,
      fetchJson(esportsUrls.ticketAnalysis(year, onlajnyId), parseTicketAnalysis, {
        revalidate: live ? 60 : 300,
        notFoundIsEmpty: true,
      }),
    ]);
    if (odds) {
      sources.odds = odds.state;
      liveOdds = odds.data?.get(onlajnyId) ?? null;
    }
    sources.bets = ta.state;
    bets = ta.data;
  }
  return { liveOdds, bets };
}

export async function getGameDetail(id: string, date?: string): Promise<GameDetailResponse | null> {
  const sources: Record<string, SourceState> = {};

  if (id.startsWith("nhl-")) {
    const nhlId = Number(id.slice(4));
    const [landing, pbp] = await Promise.all([
      fetchJson(nhlUrls.landing(nhlId), (j) => ({ game: parseNhlLanding(j), goals: parseNhlGoals(j) }), {
        revalidate: 15,
      }),
      fetchJson(
        nhlUrls.playByPlay(nhlId),
        (j) => ({ shots: parseNhlShots(j), players: Object.fromEntries(parseNhlRoster(j)) }),
        { revalidate: 15 },
      ),
    ]);
    sources.nhl = landing.state;
    if (!landing.data) return null;
    let game = landing.data.game;
    // Pull Tipsport odds / onlajny id from the combined scoreboard of that day.
    const board = await getScoreboard(nhlDate(game.startAt));
    const fromBoard = board.games.find((g) => g.id === id);
    if (fromBoard) game = { ...game, preOdds: fromBoard.preOdds, external: fromBoard.external };
    const { liveOdds, bets } = await extras(game, sources);
    return {
      game,
      liveOdds,
      bets,
      box: null,
      teamIds: null,
      h2h: null,
      shots: pbp.data ? nhlShotsWithXg(pbp.data.shots, game.home.id) : null,
      lineups: null,
      periodStats: null,
      playerStats: null,
      faceoffZones: null,
      goals: landing.data.goals,
      players: pbp.data?.players ?? null,
      sources,
      fetchedAt: new Date().toISOString(),
    };
  }

  if (id.startsWith("cz-") && date) {
    const board = await getScoreboard(date);
    sources.esports = board.sources.esports ?? "error";
    const game = board.games.find((g) => g.id === id);
    if (!game) return null;
    const [{ liveOdds, bets }, box] = await Promise.all([extras(game, sources), hokejczBox(game, sources)]);
    const [details, links] = await Promise.all([czDetails(game, box, sources), dbLinks(box)]);
    return {
      game,
      liveOdds,
      bets,
      box,
      ...details,
      ...links,
      goals: null,
      players: null,
      sources,
      fetchedAt: new Date().toISOString(),
    };
  }

  // Historical / archived Czech game from our database (hokej.cz match id).
  if (id.startsWith("hcz-")) {
    const hczId = Number(id.slice(4));
    const game = await gameFromHokejcz(hczId, sources);
    if (!game) return null;
    const box = game.box;
    const details = await czDetails(game.game, box, sources);
    const links = await dbLinks(box);
    return {
      game: game.game,
      liveOdds: null,
      bets: null,
      box,
      ...details,
      ...links,
      goals: null,
      players: null,
      sources,
      fetchedAt: new Date().toISOString(),
    };
  }

  return null;
}

/** Builds a Game from the hokej.cz match page (used for archive games without a live feed). */
async function gameFromHokejcz(hczId: number, sources: Record<string, SourceState>) {
  const res = await fetchJson(new URL(hokejczPaths.match(hczId), HOKEJCZ_ORIGIN).toString(), (html) => parseHokejczMatch(html as string, hczId), {
    revalidate: 3600,
    text: true,
  });
  sources.hokejcz = res.state;
  const box = res.data;
  if (!box || !box.home.name) return null;
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(box.startLocal ?? "");
  const startAt = m
    ? pragueToUtcIso(`${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`, m[4] ? `${m[4].padStart(2, "0")}:${m[5]}` : "00:00")
    : new Date(0).toISOString();
  const final = /konec/i.test(box.statusLabel ?? "");
  const team = (t: HokejczMatch["home"]) => ({
    id: t.clubId ? `hcz-${t.clubId}` : `hcz-n-${t.abbrev}`,
    name: t.name,
    shortName: t.shortName || t.name,
    abbrev: t.abbrev,
    logoUrl: t.logoUrl,
  });
  const game: Game = {
    id: `hcz-${hczId}`,
    source: "esports",
    leagueKey: "cz-elh",
    leagueName: box.competition ?? "Tipsport extraliga",
    startAt,
    status: final ? "final" : box.homeScore !== null ? "live" : "scheduled",
    statusLabel: box.statusLabel ?? "",
    period: null,
    clock: null,
    home: team(box.home),
    away: team(box.away),
    homeScore: box.homeScore,
    awayScore: box.awayScore,
    periods: box.periods,
    decidedIn: box.decidedIn,
    series: box.series,
    preOdds: null,
    external: { hokejczId: hczId },
  };
  return { game, box };
}

/** Database links for a Czech game: team ids (for /tym links) and head-to-head history. */
async function dbLinks(box: HokejczMatch | null) {
  if (!box || !dbAvailable() || !box.home.clubId || !box.away.clubId) return { teamIds: null, h2h: null };
  const home = `hcz-${box.home.clubId}`;
  const away = `hcz-${box.away.clubId}`;
  try {
    const [exists] = await sql<{ n: number }>("select count(*)::int as n from team where id in ($1, $2)", [home, away]);
    if (!exists || exists.n < 2) return { teamIds: null, h2h: null };
    return { teamIds: { home, away }, h2h: await getHeadToHead(home, away, 30) };
  } catch (e) {
    console.error("[db] links", e);
    return { teamIds: null, h2h: null };
  }
}

export { revalidateFor };
