import { sql } from "@/lib/server/db";

/** POST /api/admin/explain — EXPLAIN ANALYZE of the career-log queries, for tuning. */
export const dynamic = "force-dynamic";

const QUERIES: Record<string, { text: string; params: unknown[] }> = {
  career: {
    text: `select count(*) from skater_career_log_for(array(select distinct b.player_id from box_skater b join game g on g.id = b.game_id
             where b.team_id = 'hcz-11' and g.status = 'final' and g.season = (select max(season) from game where league_id = 'cz-elh')))`,
    params: [],
  },
  // Same roster passed as a literal array: no sub-select in the argument, so the SQL function can be inlined.
  career_arr: {
    text: `select count(*) from skater_career_log_for($1::text[])`,
    params: [],
  },
  agg: {
    text: `select b.player_id, g.league_id, count(*), sum(b.g), sum(b.pts) from box_skater b join game g on g.id = b.game_id
           where b.player_id = any($1::text[]) and g.status = 'final' group by 1, 2`,
    params: [],
  },
  stats: {
    text: `select relname, n_live_tup from pg_stat_user_tables where relname in ('box_skater','game','game_event','player') order by 1`,
    params: [],
  },
};

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "career";
  const def = QUERIES[q];
  if (!def) return Response.json({ error: "unknown" }, { status: 404 });
  const t0 = performance.now();
  if (q === "stats") return Response.json({ rows: await sql(def.text) });
  let params = def.params;
  if (def.text.includes("$1")) {
    const ids = await sql<{ player_id: string }>(
      `select distinct b.player_id from box_skater b join game g on g.id = b.game_id
       where b.team_id = 'hcz-11' and g.status = 'final' and g.season = (select max(season) from game where league_id = 'cz-elh')`,
    );
    params = [ids.map((r) => r.player_id)];
  }
  const plan = await sql<{ "QUERY PLAN": string }>(`explain (analyze, buffers) ${def.text}`, params);
  return Response.json({ ms: Math.round(performance.now() - t0), plan: plan.map((r) => r["QUERY PLAN"]) });
}
