/**
 * Background work, run by GitHub Actions instead of Vercel functions (Vercel's Hobby plan caps
 * function CPU time; Actions minutes are free for this public repository). Talks to the database
 * and the sources directly with the same code the app uses.
 *
 *   tsx scripts/jobs.ts crawl [minutes]   work through the hokej.cz crawl queue
 *   tsx scripts/jobs.ts live [minutes]    while games are on: push notifications, store finished
 *                                         extraliga games, settle tips
 *   tsx scripts/jobs.ts audit             weekly: repair drifted season statistics, rewrite Elo
 *   tsx scripts/jobs.ts logos             weekly: current club crests from hokej.cz
 *
 * Needs DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (and the VAPID keys for
 * push) in the environment.
 */
import { addDays, pragueDate } from "@hokejhub/core";
import { runCrawl } from "../lib/server/crawl";
import { appDatabaseUrl, sql } from "../lib/server/db";
import { ingestFinishedElh } from "../lib/server/ingest";
import { tick, vapidConfigured } from "../lib/server/push";
import { getScoreboard } from "../lib/server/scoreboard";
import { settle } from "../lib/server/tipping";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 19);
const log = (...a: unknown[]) => console.log(stamp(), ...a);

/** Route handlers are plain functions: call one as an authorized request. */
async function callRoute(handler: (req: Request) => Promise<Response>, query: string) {
  process.env.CRON_SECRET ??= "jobs-runner";
  const res = await handler(
    new Request(`http://jobs.local/${query}`, { method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }),
  );
  return res.json() as Promise<Record<string, unknown>>;
}

async function crawl(minutes: number) {
  const end = Date.now() + minutes * 60_000;
  while (Date.now() < end) {
    const r = await runCrawl(Math.min(10 * 60_000, end - Date.now()));
    log("crawl", { processed: r.processed, recrawled: r.recrawled, ok: r.log.filter((l) => l.ok).length, stats: r.stats });
    if (r.processed === 0) break;
  }
}

/** Extraliga games of today and yesterday from the live feed, stored once final; tips settled. */
async function storeFinished() {
  const today = pragueDate();
  const boards = await Promise.all([today, addDays(today, -1)].map((d) => getScoreboard(d).catch(() => null)));
  const games = boards.flatMap((b) => b?.games ?? []);
  const stored = await ingestFinishedElh(games);
  await settle().catch((e) => console.error("[tip] settle", e));
  const open = games.filter((g) => g.leagueKey === "cz-elh" && g.status !== "final" && g.status !== "postponed" && g.status !== "cancelled");
  return { stored, open: open.length, nextStart: open.map((g) => Date.parse(g.startAt)).sort((a, b) => a - b)[0] ?? null };
}

async function live(minutes: number) {
  const end = Date.now() + minutes * 60_000;
  const push = vapidConfigured();
  let lastStore = 0;
  let pendingStore = true;
  while (Date.now() < end) {
    let nextPush: number | null = null;
    if (push) {
      const t = await tick().catch((e) => (console.error("[push]", e), null));
      if (t && (t.events || t.sent)) log("push", t);
      nextPush = t?.nextActive ? Date.parse(t.nextActive) : null;
    }
    let nextGame: number | null = null;
    if (Date.now() - lastStore > 4 * 60_000) {
      const s = await storeFinished().catch((e) => (console.error("[store]", e), null));
      lastStore = Date.now();
      if (s) {
        log("store", s);
        pendingStore = s.open > 0;
        nextGame = s.nextStart;
      }
    }
    // Nothing live, nothing to store: sleep until the next game needs watching, or stop.
    if (!pendingStore && nextPush === null) {
      log("nothing more to watch");
      break;
    }
    const wake = Math.min(nextPush ?? Infinity, nextGame && nextGame > Date.now() ? nextGame + 100 * 60_000 : Infinity);
    const wait = wake === Infinity || wake - Date.now() < 60_000 ? 20_000 : Math.min(wake - Date.now(), 10 * 60_000);
    if (Date.now() + wait > end) break;
    await sleep(wait);
  }
}

async function audit() {
  const { POST } = await import("../app/api/admin/refresh-stats/route");
  log("dirty", await callRoute(POST, "?mode=dirty"));
  const { seasons } = (await callRoute(POST, "?mode=seasons")) as { seasons?: { league_id: string; season: number }[] };
  for (const s of seasons ?? []) {
    const r = await callRoute(POST, `?mode=repair&league=${s.league_id}&season=${s.season}`).catch((e) => ({ error: String(e) }));
    log("repair", s.league_id, s.season, JSON.stringify(r).slice(0, 200));
  }
  log("elo", await callRoute(POST, "?mode=elo"));
}

async function logos() {
  const { POST } = await import("../app/api/admin/refresh-logos/route");
  const r = await callRoute(POST, "");
  log("logos", { found: r.found, updated: r.updated, changed: r.changed });
}

/** Fails fast, and readably, when the database is unreachable (wrong secret, IPv6-only host…). */
async function checkDatabase() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");
  let where = "(unparseable URL)";
  try {
    const u = new URL(appDatabaseUrl(raw));
    where = `${u.username}@${u.hostname}:${u.port || 5432}${u.pathname}`;
  } catch {
    /* keep the placeholder */
  }
  try {
    const [r] = await sql<{ now: string }>("select now()::text as now");
    log("database ok", where, r?.now);
  } catch (e) {
    const hint = /db\.[a-z0-9]+\.supabase\.co/.test(where)
      ? " — this is Supabase's direct host (IPv6 only, unreachable from GitHub runners); use the Transaction pooler URL"
      : "";
    throw new Error(`database unreachable at ${where}: ${e instanceof Error ? e.message : String(e)}${hint}`);
  }
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  await checkDatabase();
  const minutes = Number(arg) || 330;
  if (cmd === "crawl") await crawl(minutes);
  else if (cmd === "live") await live(minutes);
  else if (cmd === "audit") await audit();
  else if (cmd === "logos") await logos();
  else throw new Error(`unknown command: ${cmd ?? "(none)"}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
