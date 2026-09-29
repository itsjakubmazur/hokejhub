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

export async function predictMatch(league: string, homeId: string, awayId: string, gameId?: string) {
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
