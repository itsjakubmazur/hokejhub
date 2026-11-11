import { hokejczShotsUrl, jobPath, processJob, seasonOfDate } from "@hokejhub/core";
import { sql } from "./db";
import { enqueue, writeRows } from "./ingest";
import { refreshAfterIngest } from "./stats-refresh";
import { supabaseAdmin } from "./supabase";

const ORIGIN = process.env.HOKEJCZ_ORIGIN ?? "https://www.hokej.cz/";
const PAUSE_MS = 2000;
const MAX_ATTEMPTS = 5;
const USER_AGENT = "HokejHub/0.1 (personal, non-commercial)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Works through the `crawl_job` queue for up to `budgetMs`, one hokej.cz page every ~2 s, then
 * refreshes the precomputed statistics of what it stored. Shared by the API route and the
 * GitHub Actions job runner (scripts/jobs.ts).
 */
export async function runCrawl(budgetMs: number) {
  const db = supabaseAdmin();
  const started = Date.now();
  const log: { key: string; ok: boolean; info: string }[] = [];
  let blocked: string | null = null;

  // Games are re-read after the fact:
  //  - not final although they should be over (crawled before they were played: round pages
  //    list the whole schedule) — hourly for two weeks, then daily for the rest of the season,
  //    so a crawler that was down or blocked for a while catches up on its own;
  //  - final, to pick up corrections (an assist reassigned, a goal credited to another player)
  //    — daily, for a week after the game. Rows that did not change do not trigger a refresh;
  //  - final by result only (stored from the live feed while hokej.cz was unreachable, so no
  //    box score yet) — on every run until the match page is read.
  // Jobs that gave up ("failed") are included: the page may simply have been unreachable.
  const recrawl = await sql<{ n: number }>(
    `with due as (
       update crawl_job j set status = 'pending', attempts = 0, next_at = now(), updated_at = now()
       from game g
       where j.kind = 'match' and j.status in ('done', 'failed') and g.id = 'hcz-' || (j.params->>'id')
         and (
           (g.status not in ('final', 'cancelled') and g.start_at < now() - interval '150 minutes'
            and g.start_at > now() - interval '300 days'
            and j.updated_at < now() - (case when g.start_at > now() - interval '14 days' then interval '1 hour' else interval '1 day' end))
           or (g.status = 'final' and g.start_at > now() - interval '7 days' and j.updated_at < now() - interval '20 hours')
           or (g.status = 'final' and g.start_at > now() - interval '300 days' and j.updated_at < now() - interval '5 hours'
               and not exists (select 1 from box_skater b where b.game_id = g.id))
         )
       returning j.id
     ) select count(*)::int as n from due`,
  ).catch(() => [{ n: -1 }]);

  // The running season's structure is re-read weekly (play-off competitions appear in spring,
  // the table moves), and anything of it that gave up is tried again a day later.
  const season = seasonOfDate();
  await sql(
    `update crawl_job set status = 'pending', attempts = 0, next_at = now(), updated_at = now()
     where (params->>'season')::int = $1 and (
       (kind in ('season', 'schedule', 'table') and status in ('done', 'failed') and updated_at < now() - interval '7 days')
       or (status = 'failed' and updated_at < now() - interval '1 day')
     )`,
    [season],
  ).catch((e) => console.error("[crawl] season refresh", e));

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
    if (error) throw new Error(error.message);
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
      // hokej.cz refusing or struggling (403/429/5xx, timeout) says nothing about this page: put
      // the job back untouched and stop the run instead of burning its attempts.
      const unavailable = /HTTP (403|429|5\d\d)|timeout|aborted|fetch failed/i.test(msg);
      const attempts = unavailable ? next.attempts : next.attempts + 1;
      await db
        .from("crawl_job")
        .update({
          status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          attempts,
          last_error: msg.slice(0, 500),
          next_at: new Date(Date.now() + (unavailable ? 30 : 2 ** attempts) * 60_000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", next.id);
      log.push({ key: next.key, ok: false, info: msg });
      if (unavailable) {
        blocked = msg;
        break;
      }
    }
    await sleep(PAUSE_MS);
  }

  // Precomputed statistics follow the writes: players of the games just stored, then Elo.
  const stats = log.some((l) => l.ok) ? await refreshAfterIngest().catch((e) => ({ error: e instanceof Error ? e.message : String(e) })) : null;
  return { processed: log.length, recrawled: recrawl[0]?.n ?? 0, ms: Date.now() - started, stats, log, blocked };
}
