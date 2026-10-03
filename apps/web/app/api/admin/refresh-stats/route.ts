import { sql } from "@/lib/server/db";
import { addDays, pragueDate } from "@hokejhub/core";
import { ingestFinishedElh } from "@/lib/server/ingest";
import { getScoreboard } from "@/lib/server/scoreboard";
import { settle } from "@/lib/server/tipping";
import { refreshDirtyStats, refreshEloSnapshot } from "@/lib/server/stats-refresh";

/**
 * POST /api/admin/refresh-stats — maintenance of the precomputed statistics.
 *
 *   ?mode=seasons                        league seasons with game counts (plan for a rebuild)
 *   ?mode=season&league=cz-elh&season=N  recompute one league season
 *   ?mode=form&offset=0&limit=500        recompute form (streaks) for a slice of players
 *   ?mode=dirty                          recompute players of games written since the last run
 *   ?mode=snapshot&season=N              season's games (scores) and skater/goalie totals, to diff before/after a recrawl
 *   ?mode=recrawl&season=N               put every finished extraliga game of the season back in the crawl queue
 *   ?mode=finished                       store today's and yesterday's finished games the database lacks
 *   ?mode=elo                            rewrite the Elo snapshot
 *   ?mode=verify                         compare the tables with the live sources (slow)
 *   ?mode=repair&league=cz-elh&season=N  compare one season with its source and rebuild it if it drifted
 *   ?mode=competitions&league=cz-elh     every competition id / phase with its game count and months, to spot friendlies
 *   ?mode=audit&check=NAME               read-only data checks (leagues, competitions, dates, duplicates, scores, boxless, gp)
 *   ?mode=unseasoned                     players of games without a season / league (not covered by mode=season)
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "dirty";
  const t0 = Date.now();
  if (mode === "audit") {
    const AUDIT: Record<string, string> = {
      leagues: `select league_id, count(*)::int as games, min(season) as first, max(season) as last,
          count(*) filter (where status = 'final')::int as final from game group by 1 order by 2 desc`,
      competitions: `select c.league_id, c.season, c.id, c.name, c.phase, count(g.id)::int as games
          from competition c left join game g on g.competition_id = c.id group by 1, 2, 3, 4, 5 order by 1, 2, 3`,
      phases: `select league_id, coalesce(phase, '(null)') as phase, count(*)::int as games from game group by 1, 2 order by 1, 2`,
      dates: `select id, league_id, season, phase, competition_id, start_at, home_name, away_name, status from game
          where season is not null and (start_at < make_date(season, 8, 1) or start_at >= make_date(season + 1, 7, 1))
          order by start_at limit 200`,
      duplicates: `select league_id, home_team_id, away_team_id, (start_at at time zone 'Europe/Prague')::date as day,
          array_agg(id order by id) as ids, array_agg(status) as statuses
          from game group by 1, 2, 3, 4 having count(*) > 1 order by 4 limit 200`,
      scores: `select g.id, g.season, g.phase, g.home_name, g.away_name, g.home_score, g.away_score, g.decided_in, x.hg, x.ag
          from game g cross join lateral (
            select coalesce(sum(b.g) filter (where b.team_id = g.home_team_id), 0)::int as hg,
                   coalesce(sum(b.g) filter (where b.team_id = g.away_team_id), 0)::int as ag, count(*) as n
            from box_skater b where b.game_id = g.id) x
          where g.status = 'final' and g.league_id = $1 and x.n > 0
            and (x.hg <> g.home_score - case when g.decided_in = 'SO' and g.home_score > g.away_score then 1 else 0 end
              or x.ag <> g.away_score - case when g.decided_in = 'SO' and g.away_score > g.home_score then 1 else 0 end)
          order by g.start_at limit 300`,
      boxless: `select season, phase, count(*)::int as games, (array_agg(id order by start_at))[1:5] as sample
          from game g where league_id = $1 and status = 'final'
            and not exists (select 1 from box_skater b where b.game_id = g.id) group by 1, 2 order by 1, 2`,
      gp: `select season, t as team, count(*)::int as gp
          from (select season, home_team_id as t from game where league_id = $1 and status = 'final' and phase = 'regular'
                union all select season, away_team_id from game where league_id = $1 and status = 'final' and phase = 'regular') u
          group by 1, 2 order by 1, 2`,
      unfinished: `select id, season, phase, start_at, status, home_name, away_name from game
          where league_id = $1 and status not in ('final', 'cancelled', 'postponed') and start_at < now() - interval '1 day'
          order by start_at limit 100`,
    };
    const check = url.searchParams.get("check") ?? "leagues";
    const text = AUDIT[check];
    if (!text) return Response.json({ error: "unknown check", checks: Object.keys(AUDIT) }, { status: 400 });
    const rows = await sql(text, text.includes("$1") ? [url.searchParams.get("league") ?? "cz-elh"] : []);
    return Response.json({ check, rows });
  }
  if (mode === "competitions") {
    const rows = await sql(
      `select season, competition_id, phase, count(*)::int as games,
         min(start_at)::date as first, max(start_at)::date as last,
         array_agg(distinct to_char(start_at at time zone 'Europe/Prague', 'MM')) as months,
         (array_agg(round order by start_at))[1] as round_sample
       from game where league_id = $1 group by 1, 2, 3 order by 1, 2, 3`,
      [url.searchParams.get("league") ?? "cz-elh"],
    );
    return Response.json({ rows });
  }
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
  if (mode === "snapshot") {
    const season = Number(url.searchParams.get("season"));
    const games = await sql(
      `select id, home_name || ' – ' || away_name as game, to_char(start_at, 'YYYY-MM-DD') as day,
              home_score, away_score, decided_in, status
       from game where league_id = 'cz-elh' and season = $1 order by start_at, id`,
      [season],
    );
    const skaters = await sql(
      `select s.player_id, p.name, s.team_id, s.phase, s.gp::int, s.g::int, s.a::int, s.pts::int, s.pm::int, s.pim::int
       from skater_season_src s join player p on p.id = s.player_id where s.league_id = 'cz-elh' and s.season = $1 order by 1, 3, 4`,
      [season],
    );
    const goalies = await sql(
      `select s.player_id, p.name, s.team_id, s.phase, s.gp::int, s.saves::int, s.ga::int, s.shutouts::int
       from goalie_season_src s join player p on p.id = s.player_id where s.league_id = 'cz-elh' and s.season = $1 order by 1, 3, 4`,
      [season],
    );
    return Response.json({ season, games, skaters, goalies });
  }
  if (mode === "recrawl") {
    const season = Number(url.searchParams.get("season"));
    if (!Number.isInteger(season)) return Response.json({ error: "season required" }, { status: 400 });
    const rows = await sql<{ n: number }>(
      `with due as (
         update crawl_job j set status = 'pending', attempts = 0, next_at = now(), updated_at = now() - interval '1 day'
         from game g
         where j.kind = 'match' and g.id = 'hcz-' || (j.params->>'id') and g.league_id = 'cz-elh' and g.season = $1
           and g.status = 'final' and j.status <> 'running'
         returning j.id
       ) select count(*)::int as n from due`,
      [season],
    );
    return Response.json({ season, requeued: rows[0]?.n ?? 0 });
  }
  if (mode === "finished") {
    const today = pragueDate();
    const boards = await Promise.all([today, addDays(today, -1)].map((d) => getScoreboard(d).catch(() => null)));
    const games = boards.flatMap((b) => b?.games ?? []);
    const r = await ingestFinishedElh(games);
    await settle().catch((e) => console.error("[tip] settle", e));
    const ids = games.filter((g) => g.leagueKey === "cz-elh" && g.external.hokejczId).map((g) => `hcz-${g.external.hokejczId}`);
    const db = await sql<{ id: string; status: string; score: string; updated: string }>(
      `select g.id, g.status, g.home_score || ':' || g.away_score as score,
              (select to_char(j.updated_at, 'HH24:MI') from crawl_job j where j.key = 'hcz:match:' || substr(g.id, 5)) as updated
       from game g where g.id = any($1) order by g.start_at`,
      [ids],
    );
    return Response.json({ ...r, feedFinal: games.filter((g) => g.leagueKey === "cz-elh" && g.status === "final").length, db, ms: Date.now() - t0 });
  }
  if (mode === "dirty") return Response.json(await refreshDirtyStats(45_000));
  if (mode === "repair") {
    const league = url.searchParams.get("league") ?? "";
    const season = Number(url.searchParams.get("season"));
    if (!league || !Number.isInteger(season)) return Response.json({ error: "league and season required" }, { status: 400 });
    const drift = await sql<{ kind: string; missing: number; extra: number }>(
      "select kind, missing::int, extra::int from stats_season_drift($1, $2)",
      [league, season],
    );
    const drifted = drift.some((d) => d.missing || d.extra);
    if (drifted) {
      await sql("select refresh_stats_season($1, $2)", [league, season]);
      console.warn(`[stats] repaired ${league} ${season}: ${JSON.stringify(drift)}`);
    }
    return Response.json({ league, season, drift, repaired: drifted, ms: Date.now() - t0 });
  }
  if (mode === "unseasoned") {
    const ids = await sql<{ player_id: string }>(
      `select distinct player_id from (
         select b.player_id from box_skater b join game g on g.id = b.game_id where g.season is null or g.league_id is null
         union select b.player_id from box_goalie b join game g on g.id = b.game_id where g.season is null or g.league_id is null
         union select e.player_ids[1] from game_event e join game g on g.id = e.game_id
           where e.type = 'shot' and (g.season is null or g.league_id is null)
       ) x where player_id is not null`,
    );
    if (ids.length) await sql("select refresh_player_stats($1::text[])", [ids.map((r) => r.player_id)]);
    return Response.json({ players: ids.length, ms: Date.now() - t0 });
  }
  if (mode === "profile") {
    // Times each step of refresh_player_stats for the players of the latest final games.
    const ids = (
      await sql<{ player_id: string }>(
        `select distinct b.player_id from box_skater b
         join (select id from game where status = 'final' order by start_at desc limit 3) g on g.id = b.game_id`,
      )
    ).map((r) => r.player_id);
    const steps: Record<string, number> = {};
    const run = async (name: string, text: string) => {
      const t = Date.now();
      await sql(text, [ids]);
      steps[name] = Date.now() - t;
    };
    await run("skater", "select count(*) from skater_season_src where player_id = any($1::text[])");
    await run("goalie", "select count(*) from goalie_season_src where player_id = any($1::text[])");
    await run("xg", "select count(*) from player_xg_season_src where player_id = any($1::text[])");
    await run(
      "xg_in_season",
      `select count(*) from player_xg_season_src
       where player_id = any($1::text[]) and (league_id, season) = (select league_id, season from game where status = 'final' order by start_at desc limit 1)`,
    );
    await run("form", "select refresh_player_form($1::text[])");
    await run(
      "all_in_season",
      `select refresh_player_stats_in($1::text[], g.league_id, g.season)
       from (select league_id, season from game where status = 'final' order by start_at desc limit 1) g`,
    );
    return Response.json({ players: ids.length, steps });
  }
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
