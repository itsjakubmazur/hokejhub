import webpush from "web-push";
import {
  DEFAULT_PREFS,
  detectEvents,
  esportsUrls,
  parseScoreboard,
  pragueDate,
  rememberOnce,
  shouldNotify,
  snapshotOf,
  type Game,
  type GameSnapshot,
  type NotifyPrefs,
} from "@hokejhub/core";
import { sql } from "./db";
import { fetchJson } from "./fetcher";

export function vapidConfigured() {
  return Boolean(process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
}

function setup() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "https://hokejhub.vercel.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

export interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  prefs: Partial<NotifyPrefs>;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
  icon?: string;
}

/** Sends one notification; prunes subscriptions the push service reports gone. */
export async function send(sub: SubscriptionRow, payload: PushPayload) {
  setup();
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), {
      TTL: 600,
      urgency: "high",
    });
    await sql("update push_subscription set last_ok_at = now(), fail_count = 0 where id = $1", [sub.id]);
    return true;
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) await sql("delete from push_subscription where id = $1", [sub.id]);
    else await sql("update push_subscription set fail_count = fail_count + 1 where id = $1", [sub.id]);
    return false;
  }
}

function gameUrl(g: Game) {
  return g.source === "nhl" ? `/zapas/${g.id}` : `/zapas/${g.id}?d=${pragueDate(new Date(g.startAt))}`;
}

async function loadGames(): Promise<Game[]> {
  // Around midnight, games from "yesterday" (Prague) may still be running.
  const today = pragueDate();
  const yesterday = pragueDate(new Date(Date.now() - 6 * 3600_000));
  const dates = [...new Set([yesterday, today])];
  const boards = await Promise.all(dates.map((d) => fetchJson(esportsUrls.scoreboard(d), parseScoreboard, { revalidate: 0, notFoundIsEmpty: true })));
  const byId = new Map<string, Game>();
  for (const b of boards) for (const g of b.data ?? []) byId.set(g.id, g);
  return [...byId.values()];
}

/** One pass of the rule engine: diff the scoreboard against stored snapshots and deliver. */
export interface TickResult {
  subs: number;
  games: number;
  events: number;
  sent: number;
  /** When the next game needs watching (ISO); null = nothing more today. Lets schedulers sleep. */
  nextActive: string | null;
}

export async function tick(): Promise<TickResult> {
  const subs = await sql<SubscriptionRow>("select id, endpoint, p256dh, auth, prefs from push_subscription where fail_count < 20");
  if (subs.length === 0) return { subs: 0, games: 0, events: 0, sent: 0, nextActive: null };
  const now = Date.now();
  const games = (await loadGames()).filter((g) => g.status !== "postponed" && g.status !== "cancelled");
  const isActive = (g: Game) =>
    g.status === "live" ||
    g.status === "intermission" ||
    (g.status === "final" && now - Date.parse(g.startAt) < 5 * 3600_000) ||
    (g.status === "scheduled" && Date.parse(g.startAt) - now < 20 * 60_000 && now - Date.parse(g.startAt) < 3 * 3600_000);
  const active = games.filter(isActive);
  const upcoming = games
    .filter((g) => g.status === "scheduled" && Date.parse(g.startAt) > now)
    .map((g) => Date.parse(g.startAt) - 20 * 60_000)
    .sort((a, b) => a - b);
  const live = active.some((g) => g.status !== "final");
  const nextActive = live ? new Date(now).toISOString() : upcoming[0] ? new Date(Math.max(now, upcoming[0])).toISOString() : null;
  if (active.length === 0) return { subs: subs.length, games: 0, events: 0, sent: 0, nextActive };

  const ids = active.map((g) => g.id);
  const rows = await sql<{ game_id: string; snapshot: GameSnapshot }>("select game_id, snapshot from push_game_state where game_id = any($1)", [ids]);
  const prev = new Map(rows.map((r) => [r.game_id, r.snapshot]));

  let events = 0;
  let sent = 0;
  const jobs: Promise<unknown>[] = [];
  for (const g of active) {
    const p = prev.get(g.id);
    const evs = detectEvents(p, g, now);
    const next = rememberOnce(snapshotOf(g, p), evs);
    await sql(
      `insert into push_game_state (game_id, snapshot, updated_at) values ($1, $2, now())
       on conflict (game_id) do update set snapshot = excluded.snapshot, updated_at = now()`,
      [g.id, JSON.stringify(next)],
    );
    for (const e of evs) {
      events++;
      for (const s of subs) {
        const prefs = { ...DEFAULT_PREFS, ...s.prefs } as NotifyPrefs;
        if (!shouldNotify(prefs, g, e, now)) continue;
        // Dedupe per device + event occurrence (safe against overlapping ticks).
        const [claimed] = await sql<{ id: number }>(
          `insert into notification_outbox (user_id, dedupe_key, payload, url)
           values ($1, $2, $3, $4) on conflict (dedupe_key) do nothing returning id`,
          [s.id, `${s.id}:${e.key}`, JSON.stringify({ title: e.title, body: e.body }), gameUrl(g)],
        );
        if (!claimed) continue;
        const logo = e.title.includes(g.away.shortName) && !e.title.includes(g.home.shortName) ? g.away.logoUrl : g.home.logoUrl;
        jobs.push(
          send(s, { title: e.title, body: e.body, url: gameUrl(g), tag: e.tag, icon: logo ?? undefined }).then(async (ok) => {
            if (ok) sent++;
            await sql("update notification_outbox set sent_at = case when $2 then now() end, error = case when $2 then null else 'failed' end where id = $1", [claimed.id, ok]);
          }),
        );
      }
    }
  }
  await Promise.all(jobs);
  await sql("delete from push_game_state where updated_at < now() - interval '2 days'");
  await sql("delete from notification_outbox where created_at < now() - interval '14 days'");
  return { subs: subs.length, games: active.length, events, sent, nextActive };
}
