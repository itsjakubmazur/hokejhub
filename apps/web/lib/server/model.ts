import { backtest, predict, rateGames, type RatingState, type ResultGame } from "@hokejhub/core";
import { sql } from "./db";

const TTL = 10 * 60_000;
const cache = new Map<string, { at: number; games: ResultGame[]; state: RatingState }>();

/** Elo state over the whole league history (memoised per server instance for 10 minutes). */
export async function getEloState(league: string) {
  const hit = cache.get(league);
  if (hit && Date.now() - hit.at < TTL) return hit;
  const rows = await sql<{
    id: string;
    start_at: Date;
    home_team_id: string;
    away_team_id: string;
    home_name: string;
    away_name: string;
    home_score: number;
    away_score: number;
    decided_in: "REG" | "OT" | "SO" | null;
  }>(
    `select id, start_at, home_team_id, away_team_id, home_name, away_name, home_score, away_score, decided_in
     from game where league_id = $1 and status = 'final' and home_score is not null and phase in ('regular', 'playoff')
     order by start_at`,
    [league],
  );
  const games: ResultGame[] = rows.map((r) => ({
    id: r.id,
    startAt: new Date(r.start_at).toISOString(),
    homeId: r.home_team_id,
    awayId: r.away_team_id,
    homeName: r.home_name,
    awayName: r.away_name,
    homeScore: r.home_score,
    awayScore: r.away_score,
    decidedIn: r.decided_in,
  }));
  const state = rateGames(games);
  const entry = { at: Date.now(), games, state };
  cache.set(league, entry);
  return entry;
}

const ratingsCache = new Map<string, { at: number; ratings: Map<string, number> }>();

/**
 * Current team ratings from the snapshot the crawl refresh writes (a handful of rows), falling
 * back to computing the whole history when the snapshot is empty.
 */
export async function getRatings(league: string): Promise<Map<string, number>> {
  const hit = ratingsCache.get(league);
  if (hit && Date.now() - hit.at < 60_000) return hit.ratings;
  const rows = await sql<{ team_id: string; rating: number }>("select team_id, rating from elo_rating where league_id = $1", [league]).catch(() => []);
  const ratings = rows.length ? new Map(rows.map((r) => [r.team_id, Number(r.rating)])) : (await getEloState(league)).state.ratings;
  ratingsCache.set(league, { at: Date.now(), ratings });
  return ratings;
}

export async function predictMatch(league: string, homeId: string, awayId: string, gameId?: string) {
  // A game ahead only needs today's ratings; a finished one its stored pre-game prediction.
  if (!gameId) {
    const ratings = await getRatings(league);
    const homeElo = Math.round(ratings.get(homeId) ?? 1500);
    const awayElo = Math.round(ratings.get(awayId) ?? 1500);
    return { ...predict(homeElo, awayElo), homeElo, awayElo };
  }
  const { state } = await getEloState(league);
  // For a finished game use the stored pre-game prediction, otherwise current ratings.
  const stored = gameId ? state.predictions.get(gameId) : undefined;
  const homeElo = Math.round(state.ratings.get(homeId) ?? 1500);
  const awayElo = Math.round(state.ratings.get(awayId) ?? 1500);
  return { ...(stored ?? predict(homeElo, awayElo)), homeElo, awayElo };
}

export async function getBacktest(league: string, from?: string) {
  const { games, state } = await getEloState(league);
  return backtest(games, state, from);
}
