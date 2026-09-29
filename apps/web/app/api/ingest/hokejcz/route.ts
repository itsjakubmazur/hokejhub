import {
  hokejczShotsUrl,
  job as jobs,
  jobPath,
  PRIMARY_KEYS,
  processJob,
  WRITE_ORDER,
  type CrawlJob,
  type Rows,
} from "@hokejhub/core";
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
const PAUSE_MS = 3000;
const MAX_ATTEMPTS = 5;
const USER_AGENT = "HokejHub/0.1 (personal, non-commercial)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
}

function dedupe(rows: Record<string, unknown>[], pk: string) {
  const keys = pk.split(",");
  const map = new Map<string, Record<string, unknown>>();
  for (const r of rows) map.set(keys.map((k) => String(r[k])).join("|"), r);
  return [...map.values()];
}

async function writeRows(rows: Rows) {
  const db = supabaseAdmin();
  for (const table of WRITE_ORDER) {
    const list = rows[table];
    if (list.length === 0) continue;
    const pk = PRIMARY_KEYS[table];
    const { error } = await db.from(table).upsert(dedupe(list, pk), { onConflict: pk });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function enqueue(list: CrawlJob[]) {
  if (list.length === 0) return;
  const { error } = await supabaseAdmin()
    .from("crawl_job")
    .upsert(
      list.map((j) => ({ key: j.key, kind: j.kind, params: j.params, priority: j.priority })),
      { onConflict: "key", ignoreDuplicates: true },
    );
  if (error) throw new Error(`crawl_job: ${error.message}`);
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

  while (Date.now() - started < budgetMs - PAUSE_MS - 8000) {
    const { data: next, error } = await db
      .from("crawl_job")
      .select("id,key,kind,params,priority,attempts")
      .eq("status", "pending")
      .lte("next_at", new Date().toISOString())
      .order("priority")
      .order("id")
      .limit(1)
      .maybeSingle();
    if (error) return Response.json({ error: error.message, log }, { status: 500 });
    if (!next) break;

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
        if (s.ok) shots = await s.json();
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

  return Response.json({ processed: log.length, ms: Date.now() - started, log });
}
