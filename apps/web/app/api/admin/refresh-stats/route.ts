import { sql } from "@/lib/server/db";
import { refreshDirtyStats, refreshEloSnapshot } from "@/lib/server/stats-refresh";

/**
 * POST /api/admin/refresh-stats — maintenance of the precomputed statistics.
 *
 *   ?mode=seasons                        league seasons with game counts (plan for a rebuild)
 *   ?mode=season&league=cz-elh&season=N  recompute one league season
 *   ?mode=form&offset=0&limit=500        recompute form (streaks) for a slice of players
 *   ?mode=dirty                          recompute players of games written since the last run
 *   ?mode=elo                            rewrite the Elo snapshot
 *   ?mode=verify                         compare the tables with the live sources (slow)
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "dirty";
  const t0 = Date.now();
  if (mode === "seasons") {
    const rows = await sql<{ league_id: string; season: number; games: number }>(
      "select league_id, season, count(*)::int as games from game where season is not null group by 1, 2 order by 1, 2",
    );
    return Response.json({ seasons: rows });
  }
  if (mode === "season") {
    const league = url.searchParams.get("league") ?? "";
    const season = Number(url.searchParams.get("season"));
    if (!league || !Number.isInteger(season)) return Response.json({ error: "league and season required" }, { status: 400 });
    const [r] = await sql<{ n: number }>("select refresh_stats_season($1, $2) as n", [league, season]);
    return Response.json({ league, season, skaterRows: r?.n ?? 0, ms: Date.now() - t0 });
  }
  if (mode === "form") {
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 500), 2000);
    const ids = await sql<{ player_id: string }>(
      "select distinct player_id from box_skater order by player_id offset $1 limit $2",
      [offset, limit],
    );
    if (ids.length) await sql("select refresh_player_form($1::text[])", [ids.map((r) => r.player_id)]);
    return Response.json({ offset, players: ids.length, done: ids.length < limit, ms: Date.now() - t0 });
  }
  if (mode === "dirty") return Response.json(await refreshDirtyStats(45_000));
  if (mode === "verify") {
    const diff = async (t: string, src: string) => {
      const [r] = await sql<{ missing: number; extra: number; rows: number }>(
        `select (select count(*) from (select * from ${src} except select * from ${t}) a)::int as missing,
                (select count(*) from (select * from ${t} except select * from ${src}) b)::int as extra,
                (select count(*) from ${t})::int as rows`,
      );
      return r;
    };
    return Response.json({
      skater: await diff("skater_season_t", "skater_season_src"),
      goalie: await diff("goalie_season_t", "goalie_season_src"),
      xg: await diff("player_xg_season_t", "player_xg_season_src"),
      ms: Date.now() - t0,
    });
  }
  if (mode === "elo") return Response.json({ ...(await refreshEloSnapshot()), ms: Date.now() - t0 });
  return Response.json({ error: "unknown mode" }, { status: 400 });
}
