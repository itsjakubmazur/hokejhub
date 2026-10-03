import { hokejczShotsUrl, job as jobs, jobPath, processJob } from "@hokejhub/core";
import { enqueue, writeRows } from "@/lib/server/ingest";
import { sql } from "@/lib/server/db";
import { refreshAfterIngest } from "@/lib/server/stats-refresh";
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

const ORIGIN = process.env.HOKEJCZ_ORIGIN ?? "https://www.hokej.cz/";
const PAUSE_MS = 2000;
const MAX_ATTEMPTS = 5;
const USER_AGENT = "HokejHub/0.1 (personal, non-commercial)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  const started = Date.now();
  const log: { key: string; ok: boolean; info: string }[] = [];

  // Games are re-read after the fact:
  //  - crawled before they were played (round pages list the whole schedule) and not final yet
  //    although they should be over — hourly, for two weeks;
  //  - final, to pick up corrections (an assist reassigned, a goal credited to another player)
  //    — daily, for a week after the game. Rows that did not change do not trigger a refresh.
  const recrawl = await sql<{ n: number }>(
    `with due as (
       update crawl_job j set status = 'pending', attempts = 0, next_at = now(), updated_at = now()
       from game g
       where j.kind = 'match' and j.status = 'done' and g.id = 'hcz-' || (j.params->>'id')
         and (
           (g.status <> 'final' and g.start_at < now() - interval '150 minutes' and g.start_at > now() - interval '14 days'
            and j.updated_at < now() - interval '1 hour')
           or (g.status = 'final' and g.start_at > now() - interval '7 days' and j.updated_at < now() - interval '20 hours')
         )
       returning j.id
     ) select count(*)::int as n from due`,
  ).catch(() => [{ n: -1 }]);

  // Jobs stuck in "running" (a crashed invocation) go back to the queue after 10 minutes.
  await db
    .from("crawl_job")
    .update({ status: "pending" })
    .eq("status", "running")
    .lt("updated_at", new Date(Date.now() - 10 * 60_000).toISOString());

  while (Date.now() - started < budgetMs - PAUSE_MS - 8000 - 10_000) {
    const { data: candidates, error } = await db
      .from("crawl_job")
      .select("id,key,kind,params,priority,attempts")
      .eq("status", "pending")
      .lte("next_at", new Date().toISOString())
      .order("priority")
      .order("id")
      .limit(5);
    if (error) return Response.json({ error: error.message, log }, { status: 500 });
    if (!candidates?.length) break;
    // Claim atomically so several drivers can run in parallel without doing a job twice.
    let next: (typeof candidates)[number] | null = null;
    for (const c of candidates) {
      const { data: claimed } = await db
        .from("crawl_job")
        .update({ status: "running", updated_at: new Date().toISOString() })
        .eq("id", c.id)
        .eq("status", "pending")
        .select("id");
      if (claimed?.length) {
        next = c;
        break;
      }
    }
    if (!next) continue;

    const target = new URL(jobPath(next), ORIGIN).toString();
    try {
      const res = await fetch(target, {
        headers: { "user-agent": USER_AGENT, accept: "text/html" },
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      // The shot feed (coordinates → xG) lives on S3; missing for older seasons.
      let shots: unknown;
      if (next.kind === "match") {
        const s = await fetch(hokejczShotsUrl(next.params.id), { cache: "no-store", signal: AbortSignal.timeout(15000) });
        if (s.ok) shots = await s.json().catch(() => undefined); // some old games answer with an HTML redirect
      }
      const { rows, jobs: found } = processJob(next, html, shots);
      await writeRows(rows);
      await enqueue(found);
      await db
        .from("crawl_job")
        .update({ status: "done", attempts: next.attempts + 1, last_error: null, updated_at: new Date().toISOString() })
        .eq("id", next.id);
      log.push({
        key: next.key,
        ok: true,
        info: `+${found.length} jobs, ${rows.game.length} games, ${rows.game_event.filter((e) => e.type === "shot").length} shots`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const attempts = next.attempts + 1;
      await db
        .from("crawl_job")
        .update({
          status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          attempts,
          last_error: msg.slice(0, 500),
          next_at: new Date(Date.now() + 2 ** attempts * 60_000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", next.id);
      log.push({ key: next.key, ok: false, info: msg });
      // A 5xx from hokej.cz means it is struggling — stop this run.
      if (/HTTP 5\d\d|timeout|aborted/i.test(msg)) break;
    }
    await sleep(PAUSE_MS);
  }

  // Precomputed statistics follow the writes: players of the games just stored, then Elo.
  const stats = log.some((l) => l.ok) ? await refreshAfterIngest().catch((e) => ({ error: e instanceof Error ? e.message : String(e) })) : null;
  return Response.json({ processed: log.length, recrawled: recrawl[0]?.n ?? 0, ms: Date.now() - started, stats, log });
}
