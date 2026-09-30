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
  clockAnchor,
  hokejczOnlineUrl,
  parseHokejczOnline,
  type HokejczMatch,
  pragueToUtcIso,
  type BetDistribution,
  type Game,
  type Odds1x2,
  DEFAULT_ELO,
  nhlGamecenterUrls,
  parseNhlBoxscore,
  parseNhlLandingExtras,
  parseNhlRightRail,
  parseScoreboardAlt,
  poisson1x2,
  type NhlRightRail,
  nhlPeriodStats,
} from "@hokejhub/core";
import type { GameDetailResponse } from "../types";
import { dbAvailable } from "./db";
import { predictMatch } from "./model";
import { fetchJson, type SourceState } from "./fetcher";
import { getHeadToHead, getPhotos, getPlayerNotes, getTeamStreaks, sql } from "./queries";
import { getElhPreview } from "./preview";
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
  const [roster, summary, players, shotFeed, online] = await Promise.all([
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
    hcz
      ? fetchJson(hokejczOnlineUrl(season, hcz), parseHokejczOnline, { revalidate: live ? 10 : revalidate, notFoundIsEmpty: true })
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
    commentary: online?.data?.length ? online.data : null,
    clock: live && online?.data ? clockAnchor(online.data) : null,
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

/** Per-request step timings, surfaced as a Server-Timing header by the game API. */
export type Timings = Record<string, number>;
async function timed<T>(t: Timings | undefined, label: string, p: Promise<T>): Promise<T> {
  if (!t) return p;
  const start = performance.now();
  try {
    return await p;
  } finally {
    t[label] = Math.round(performance.now() - start);
  }
}

export async function getGameDetail(id: string, date?: string, t?: Timings): Promise<GameDetailResponse | null> {
  const sources: Record<string, SourceState> = {};

  if (id.startsWith("nhl-")) {
    const nhlId = Number(id.slice(4));
    const [landing, pbp, boxscore, rail] = await Promise.all([
      fetchJson(nhlUrls.landing(nhlId), (j) => ({ game: parseNhlLanding(j), goals: parseNhlGoals(j), extras: parseNhlLandingExtras(j) }), {
        revalidate: 15,
      }),
      fetchJson(
        nhlUrls.playByPlay(nhlId),
        (j) => ({ shots: parseNhlShots(j), players: Object.fromEntries(parseNhlRoster(j)), periods: nhlPeriodStats(j) }),
        { revalidate: 15 },
      ),
      fetchJson(nhlUrls.boxscore(nhlId), parseNhlBoxscore, { revalidate: 15, notFoundIsEmpty: true }),
      fetchJson(nhlGamecenterUrls.rightRail(nhlId), parseNhlRightRail, { revalidate: 60, notFoundIsEmpty: true }),
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
      photos: null,
      insights: null,
      prediction: nhlPrediction(rail.data),
      preview: null,
      nhl: {
        box: boxscore.data && (boxscore.data.skaters.home.length || boxscore.data.goalies.home.length) ? boxscore.data : null,
        rail: rail.data,
        extras: landing.data.extras,
        periods: pbp.data?.periods.periods.length ? pbp.data.periods : null,
      },
      shots: pbp.data ? nhlShotsWithXg(pbp.data.shots, game.home.id) : null,
      lineups: null,
      periodStats: null,
      playerStats: null,
      faceoffZones: null,
      commentary: null,
      clock: null,
      goals: landing.data.goals,
      players: pbp.data?.players ?? null,
      sources,
      fetchedAt: new Date().toISOString(),
    };
  }

  if (id.startsWith("cz-") && date) {
    const board = await timed(t, "board", getScoreboard(date));
    sources.esports = board.sources.esports ?? "error";
    const game = board.games.find((g) => g.id === id);
    if (!game) return null;
    const [{ liveOdds, bets }, box] = await Promise.all([timed(t, "extras", extras(game, sources)), timed(t, "hcz", hokejczBox(game, sources))]);
    const clubs = box ? null : await clubIdsFor(game, date).catch(() => null);
    const [details, links] = await Promise.all([timed(t, "details", czDetails(game, box, sources)), timed(t, "db", dbLinks(box, game, clubs, t))]);
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
    const links = await dbLinks(box, game.game);
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
async function dbLinks(box: HokejczMatch | null, game?: Game, clubs?: { home: number; away: number } | null, t?: Timings) {
  const none = { teamIds: null, h2h: null, photos: null, insights: null, prediction: null, preview: null };
  if ((!box && !clubs) || !dbAvailable()) return none;
  const ids = box
    ? [...box.skaters.home, ...box.skaters.away, ...box.goalies.home, ...box.goalies.away]
        .map((p) => p.player.id)
        .filter((x): x is number => Boolean(x))
        .map((x) => `hcz-${x}`)
    : [];
  const photos = ids.length ? await getPhotos(ids).catch(() => null) : null;
  const homeClub = box?.home.clubId ?? clubs?.home;
  const awayClub = box?.away.clubId ?? clubs?.away;
  if (!homeClub || !awayClub) return { ...none, photos };
  const home = `hcz-${homeClub}`;
  const away = `hcz-${awayClub}`;
  try {
    const [exists] = await sql<{ n: number }>("select count(*)::int as n from team where id in ($1, $2)", [home, away]);
    if (!exists || exists.n < 2) return { ...none, photos };
    const before = game?.startAt ?? new Date().toISOString();
    const dbGameId = game?.external.hokejczId ? `hcz-${game.external.hokejczId}` : null;
    const [h2h, homeStreak, awayStreak, players] = await Promise.all([
      timed(t, "h2h", getHeadToHead(home, away, 30)),
      timed(t, "streakH", getTeamStreaks(home, before)),
      timed(t, "streakA", getTeamStreaks(away, before)),
      timed(t, "notes", getPlayerNotes([home, away], before, game?.status === "final" ? dbGameId : null)),
    ]);
    const extra = await getPhotos(players.notes.map((n) => n.player_id)).catch(() => ({}));
    const [prediction, preview] = await Promise.all([
      timed(t, "elo", predictMatch("cz-elh", home, away, dbGameId ?? undefined)).catch(() => null),
      game && game.status !== "final" ? getElhPreview(home, away, game.startAt).catch((e) => (console.error("[db] preview", e), null)) : null,
    ]);
    return {
      preview,
      teamIds: { home, away },
      h2h,
      photos: { ...extra, ...(photos ?? {}) },
      insights: { home: homeStreak, away: awayStreak, notes: players.notes, reached: players.reached },
      prediction,
    };
  } catch (e) {
    console.error("[db] links", e);
    return { ...none, photos };
  }
}

/** hokej.cz club ids for a Czech-feed game: the main feed lacks them, the ELH variant has them. */
async function clubIdsFor(game: Game, date: string) {
  if (game.home.hokejczClubId && game.away.hokejczClubId) return { home: game.home.hokejczClubId, away: game.away.hokejczClubId };
  if (game.leagueKey !== "cz-elh") return null;
  const alt = await fetchJson(esportsUrls.scoreboardAlt(date), parseScoreboardAlt, { revalidate: 3600, notFoundIsEmpty: true });
  const g = alt.data?.find((x) => x.id === game.id);
  return g?.home.hokejczClubId && g.away.hokejczClubId ? { home: g.home.hokejczClubId, away: g.away.hokejczClubId } : null;
}

/**
 * NHL pre-game model: expected goals from both teams' season scoring and conceding rates
 * (with a small home edge), then the same Poisson 1X2 as the extraliga model.
 */
export function nhlPrediction(rail: NhlRightRail | null) {
  const t = rail?.teamSeason;
  if (!t?.home.gfPerGame || !t.home.gaPerGame || !t.away.gfPerGame || !t.away.gaPerGame) return null;
  const expHome = ((t.home.gfPerGame + t.away.gaPerGame) / 2) * 1.04;
  const expAway = ((t.away.gfPerGame + t.home.gaPerGame) / 2) * 0.96;
  const r = poisson1x2(expHome, expAway, DEFAULT_ELO.drawInflation);
  return { ...r, homeWin: r.home + r.draw * (expHome / (expHome + expAway)), expHome, expAway, homeElo: null, awayElo: null };
}

export { revalidateFor };
