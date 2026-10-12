import { job as jobs } from "@hokejhub/core";
import { runCrawl } from "@/lib/server/crawl";
import { enqueue } from "@/lib/server/ingest";
import { supabaseAdmin } from "@/lib/server/supabase";

/**
 * Polite hokej.cz history crawler. Each call works through the `crawl_job` queue for up to
 * `budget` seconds, one page every ~3 s, and returns progress. Driven by an external loop /
 * scheduler; safe to call repeatedly (everything is an upsert).
 *
 *   POST /api/ingest/hokejcz?seed=1992-2026   enqueue seasons
 *   POST /api/ingest/hokejcz?budget=45        process jobs
 *   GET  /api/ingest/hokejcz                  queue summary
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET() {
  const { data, error } = await supabaseAdmin().rpc("crawl_summary");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const db = supabaseAdmin();

  // Re-run finished jobs of a kind (e.g. after a parser improvement).
  const requeue = url.searchParams.get("requeue");
  if (requeue) {
    const { error, count } = await db
      .from("crawl_job")
      .update({ status: "pending", attempts: 0, next_at: new Date().toISOString() }, { count: "exact" })
      .eq("kind", requeue)
      .neq("status", "pending");
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ requeued: count });
  }

  // One match the crawl missed: ?match=ID&season=YYYY&competition=ID&phase=regular
  const match = Number(url.searchParams.get("match"));
  if (match) {
    const j = jobs.match(match, {
      season: Number(url.searchParams.get("season")) || undefined,
      competition: Number(url.searchParams.get("competition")) || undefined,
      phase: url.searchParams.get("phase") ?? undefined,
    });
    await enqueue([j]);
    const { error } = await db.from("crawl_job").update({ status: "pending", attempts: 0, next_at: new Date().toISOString() }).eq("key", j.key);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ queued: j.key });
  }

  const seed = url.searchParams.get("seed");
  if (seed) {
    const [from, to] = seed.split("-").map(Number);
    if (!from || !to || from > to) return Response.json({ error: "seed=YYYY-YYYY" }, { status: 400 });
    const list = Array.from({ length: to - from + 1 }, (_, i) => jobs.season(to - i));
    await enqueue(list);
    return Response.json({ seeded: list.length });
  }

  const budgetMs = Math.min(Number(url.searchParams.get("budget") ?? 45), 55) * 1000;
  try {
    return Response.json(await runCrawl(budgetMs));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
