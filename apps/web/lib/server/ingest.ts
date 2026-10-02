import { hokejczShotsUrl, jobPath, PRIMARY_KEYS, processJob, WRITE_ORDER, type CrawlJob, type Game, type Rows } from "@hokejhub/core";
import { sql } from "./db";
import { refreshAfterIngest } from "./stats-refresh";
import { supabaseAdmin } from "./supabase";

/** Writing crawled hokej.cz pages into the database: shared by the crawler and instant ingest. */

const ORIGIN = process.env.HOKEJCZ_ORIGIN ?? "https://www.hokej.cz/";
const USER_AGENT = "HokejHub/0.1 (personal, non-commercial)";

function dedupe(rows: Record<string, unknown>[], pk: string) {
  const keys = pk.split(",");
  const map = new Map<string, Record<string, unknown>>();
  for (const r of rows) map.set(keys.map((k) => String(r[k])).join("|"), r);
  return [...map.values()];
}

export async function writeRows(rows: Rows) {
  const db = supabaseAdmin();
  for (const table of WRITE_ORDER) {
    const list = rows[table];
    if (list.length === 0) continue;
    const pk = PRIMARY_KEYS[table];
    const { error } = await db.from(table).upsert(dedupe(list, pk), { onConflict: pk });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

export async function enqueue(list: CrawlJob[]) {
  if (list.length === 0) return;
  const { error } = await supabaseAdmin()
    .from("crawl_job")
    .upsert(
      list.map((j) => ({ key: j.key, kind: j.kind, params: j.params, priority: j.priority })),
      { onConflict: "key", ignoreDuplicates: true },
    );
  if (error) throw new Error(`crawl_job: ${error.message}`);
}

/** Fetches one match page (and its shot feed) from hokej.cz and stores everything it holds. */
export async function ingestMatch(params: Record<string, unknown>) {
  const res = await fetch(new URL(jobPath({ kind: "match", params }), ORIGIN), {
    headers: { "user-agent": USER_AGENT, accept: "text/html" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const s = await fetch(hokejczShotsUrl(Number(params.id)), { cache: "no-store", signal: AbortSignal.timeout(10_000) }).catch(() => null);
  const shots = s?.ok ? await s.json().catch(() => undefined) : undefined;
  const { rows, jobs } = processJob({ kind: "match", params }, html, shots);
  await writeRows(rows);
  await enqueue(jobs);
  return { final: rows.game.some((g) => g.status === "final") };
}

const seasonOf = (iso: string) => {
  const d = new Date(iso);
  return d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
};

/**
 * Stores extraliga games the live feed reports as finished but the database does not hold as
 * final yet — so tables, team pages and player stats are right minutes after the final horn,
 * not when the scheduled crawl comes. Each game is claimed through its crawl job so concurrent
 * callers do not fetch it twice, and retried at most every three minutes (hokej.cz publishes
 * the final box score a little after the horn).
 */
export async function ingestFinishedElh(games: Game[]) {
  if (!process.env.DATABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { stored: 0 };
  const done = games.filter((g) => g.leagueKey === "cz-elh" && g.status === "final" && g.external.hokejczId);
  if (done.length === 0) return { stored: 0 };
  const ids = done.map((g) => `hcz-${g.external.hokejczId}`);
  const known = await sql<{ id: string }>("select id from game where id = any($1) and status = 'final'", [ids]);
  const finalIds = new Set(known.map((r) => r.id));
  let stored = 0;
  for (const g of done) {
    const hczId = g.external.hokejczId!;
    if (finalIds.has(`hcz-${hczId}`)) continue;
    const key = `hcz:match:${hczId}`;
    // Claim: an existing job not touched in the last three minutes, or a new one.
    const claimed = await sql<{ params: Record<string, unknown> }>(
      `update crawl_job set status = 'running', updated_at = now()
       where key = $1 and updated_at < now() - interval '3 minutes'
       returning params`,
      [key],
    );
    let params = claimed[0]?.params;
    if (!params) {
      const created = await sql<{ params: Record<string, unknown> }>(
        `insert into crawl_job (key, kind, params, priority, status, updated_at)
         values ($1, 'match', $2, 100, 'running', now()) on conflict (key) do nothing returning params`,
        [key, { id: hczId, season: seasonOf(g.startAt), phase: "regular" }],
      );
      params = created[0]?.params;
    }
    if (!params) continue; // somebody else has it, or it was tried a moment ago
    try {
      const r = await ingestMatch(params);
      // Not final on hokej.cz yet: leave it pending so the next caller (or the crawler) retries.
      await sql("update crawl_job set status = $2, attempts = 0, last_error = null, updated_at = now() where key = $1", [
        key,
        r.final ? "done" : "pending",
      ]);
      if (r.final) stored++;
    } catch (e) {
      await sql("update crawl_job set status = 'pending', last_error = $2, updated_at = now() where key = $1", [
        key,
        (e instanceof Error ? e.message : String(e)).slice(0, 500),
      ]);
    }
  }
  if (stored) await refreshAfterIngest().catch((e) => console.error("[ingest] refresh", e));
  return { stored };
}
