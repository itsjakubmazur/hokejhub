import { sql } from "@/lib/server/db";

/** POST /api/admin/explain — EXPLAIN ANALYZE of the career-log queries, for tuning. */
export const dynamic = "force-dynamic";

const QUERIES: Record<string, { text: string; params: unknown[] }> = {
  career: {
    text: `select count(*) from skater_career_log_for(array(select distinct b.player_id from box_skater b join game g on g.id = b.game_id
             where b.team_id = 'hcz-11' and g.status = 'final' and g.season = (select max(season) from game where league_id = 'cz-elh')))`,
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
  const plan = await sql<{ "QUERY PLAN": string }>(`explain (analyze, buffers) ${def.text}`, def.params);
  return Response.json({ ms: Math.round(performance.now() - t0), plan: plan.map((r) => r["QUERY PLAN"]) });
}
