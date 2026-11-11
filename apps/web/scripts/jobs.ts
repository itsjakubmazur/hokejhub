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
 *   tsx scripts/jobs.ts report            what the database holds (games by month, overdue, queue)
 *
 * Needs DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (and the VAPID keys for
 * push) in the environment.
 */
import { addDays, pragueDate } from "@hokejhub/core";
import { runCrawl } from "../lib/server/crawl";
import { appDatabaseUrl, sql } from "../lib/server/db";
import { catchUpResultsFromFeed, ingestFinishedElh } from "../lib/server/ingest";
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

/** What the database holds: extraliga games by month and status, overdue games, the queue. */
async function report() {
  const months = await sql<{ month: string; status: string; n: number }>(
    `select to_char(date_trunc('month', start_at), 'YYYY-MM') as month, status, count(*)::int as n
     from game where league_id = 'cz-elh' and start_at > now() - interval '150 days' and start_at < now() + interval '30 days'
     group by 1, 2 order by 1, 2`,
  );
  const byMonth = new Map<string, string[]>();
  for (const r of months) byMonth.set(r.month, [...(byMonth.get(r.month) ?? []), `${r.status} ${r.n}`]);
  for (const [m, list] of byMonth) log("games", m, list.join(", "));
  const [o] = await sql<{ n: number; first: string | null; last: string | null; last_final: string | null }>(
    `select count(*) filter (where status not in ('final', 'cancelled') and start_at < now() - interval '150 minutes')::int as n,
            min(start_at) filter (where status not in ('final', 'cancelled') and start_at < now() - interval '150 minutes')::text as first,
            max(start_at) filter (where status not in ('final', 'cancelled') and start_at < now() - interval '150 minutes')::text as last,
            max(start_at) filter (where status = 'final')::text as last_final
     from game where league_id = 'cz-elh' and start_at > now() - interval '300 days'`,
  );
  log("overdue (played, not stored as final)", o?.n ?? 0, o?.n ? `${o.first} … ${o.last}` : "", "| last final game", o?.last_final);
  const queue = await sql<{ kind: string; status: string; n: number }>(
    "select kind, status, count(*)::int as n from crawl_job where status <> 'done' group by 1, 2 order by 1, 2",
  );
  log("queue (not done)", queue.map((q) => `${q.kind}/${q.status} ${q.n}`).join(", ") || "empty");
  const errors = await sql<{ last_error: string; n: number }>(
    `select left(last_error, 80) as last_error, count(*)::int as n from crawl_job
     where last_error is not null and updated_at > now() - interval '45 days' group by 1 order by 2 desc limit 5`,
  );
  for (const e of errors) log("recent error", e.n, "×", e.last_error);
  return o?.n ?? 0;
}

async function crawl(minutes: number) {
  const end = Date.now() + minutes * 60_000;
  await report().catch((e) => console.error("[report]", e));
  let ok = 0;
  let failed = 0;
  let blocked: string | null = null;
  while (Date.now() < end) {
    const r = await runCrawl(Math.min(10 * 60_000, end - Date.now()));
    const bad = r.log.filter((l) => !l.ok);
    ok += r.log.length - bad.length;
    failed += bad.length;
    log("crawl", { processed: r.processed, recrawled: r.recrawled, ok: r.log.length - bad.length, stats: r.stats });
    for (const l of bad.slice(0, 10)) log("  failed", l.key, l.info);
    if (r.blocked) blocked = r.blocked;
    if (r.processed === 0 || r.blocked) break;
  }
  // Whatever is still not final although played: at least its result, from the live feed.
  log("results from the live feed", await catchUpResultsFromFeed().catch((e) => ({ error: String(e) })));
  await report().catch(() => 0);
  const [w] = await sql<{ n: number; days: number | null }>(
    `select count(*)::int as n, extract(day from now() - min(updated_at))::int as days
     from game g where league_id = 'cz-elh' and status = 'final' and start_at > now() - interval '300 days'
       and not exists (select 1 from box_skater b where b.game_id = g.id)`,
  ).catch(() => [{ n: 0, days: null }]);
  if (blocked && ok === 0) {
    const msg = `hokej.cz is not reachable from here (${blocked}); ${w?.n ?? 0} games hold a result only and wait for their box score`;
    // A refusal usually passes with the next runner; only one that lasts goes red.
    if ((w?.days ?? 0) >= 3) throw new Error(msg);
    console.log(`::warning::${msg}`);
    return;
  }
  if (failed && ok === 0) throw new Error(`all ${failed} pages failed`);
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
  else if (cmd === "report") await report();
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
