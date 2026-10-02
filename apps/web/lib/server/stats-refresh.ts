import { rateGames, type ResultGame } from "@hokejhub/core";
import { sql } from "./db";

/**
 * Precomputed statistics: the crawler's writes mark games dirty (database triggers), this module
 * recomputes the players of those games and the Elo snapshot. Called at the end of every crawl
 * run and from /api/admin/refresh-stats.
 */

/** Recomputes players of dirty games, a batch at a time, until none are left or time runs out. */
export async function refreshDirtyStats(budgetMs = 20_000) {
  const started = Date.now();
  let games = 0;
  for (;;) {
    const [r] = await sql<{ n: number }>("select refresh_dirty_stats(100) as n");
    games += r?.n ?? 0;
    if (!r?.n || Date.now() - started > budgetMs) break;
  }
  return { games, ms: Date.now() - started };
}

/** Elo over the whole league history, written as one row per team. */
export async function refreshEloSnapshot(league = "cz-elh") {
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
  const teams = [...state.ratings.entries()];
  if (teams.length === 0) return { teams: 0 };
  await sql(
    `insert into elo_rating (league_id, team_id, name, rating, updated_at)
     select $1, t.id, t.name, t.rating, now() from unnest($2::text[], $3::text[], $4::real[]) as t(id, name, rating)
     on conflict (league_id, team_id) do update set name = excluded.name, rating = excluded.rating, updated_at = now()`,
    [league, teams.map(([id]) => id), teams.map(([id]) => state.names.get(id) ?? id), teams.map(([, r]) => r)],
  );
  return { teams: teams.length };
}

/** After a crawl run: dirty players, then Elo when any game changed. */
export async function refreshAfterIngest() {
  const dirty = await refreshDirtyStats(12_000);
  const elo = dirty.games ? await refreshEloSnapshot() : null;
  return { ...dirty, elo };
}
