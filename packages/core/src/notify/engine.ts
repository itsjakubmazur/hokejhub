/**
 * Notification rule engine: diff consecutive scoreboard snapshots into events, then decide
 * per subscriber (preferences) whether to deliver. Pure — the web app handles storage/sending.
 */
import type { Game } from "../domain/types.ts";

export type TriggerKind = "reminder" | "start" | "goal" | "equalizer" | "lead_change" | "period_end" | "close_finish" | "overtime" | "final";

export const TRIGGERS: { kind: TriggerKind; label: string; hint: string }[] = [
  { kind: "reminder", label: "Připomínka", hint: "15 minut před začátkem" },
  { kind: "start", label: "Začátek zápasu", hint: "úvodní buly" },
  { kind: "goal", label: "Každý gól", hint: "okamžitě se skóre" },
  { kind: "equalizer", label: "Vyrovnání", hint: "i když nesleduješ každý gól" },
  { kind: "lead_change", label: "Otočení vedení", hint: "" },
  { kind: "period_end", label: "Konec třetiny", hint: "s průběžným skóre" },
  { kind: "close_finish", label: "Napínavá koncovka", hint: "rozdíl max. 1 gól, posledních 5 minut" },
  { kind: "overtime", label: "Prodloužení / nájezdy", hint: "" },
  { kind: "final", label: "Konečný výsledek", hint: "" },
];

/** What we remember about a game between ticks. */
export interface GameSnapshot {
  status: Game["status"];
  homeScore: number;
  awayScore: number;
  period: number | null;
  /** Events already emitted once per game (reminder, close_finish, overtime). */
  once: string[];
}

export interface GameEvent {
  kind: TriggerKind;
  gameId: string;
  title: string;
  body: string;
  /** Collapses successive notifications of one game on the device. */
  tag: string;
  /** Unique per event occurrence. */
  key: string;
}

export interface NotifyPrefs {
  triggers: TriggerKind[];
  /** League keys ("cz-elh", "nhl"); empty = all leagues of followed teams only. */
  leagues: string[];
  /** Team display names to match (favorites). */
  teams: string[];
  /** Quiet hours in Prague time, e.g. {from: 23, to: 7}; null = off. */
  quiet: { from: number; to: number } | null;
  /** Round numbers reached by players of followed teams (100th game, 50th goal, 100th point…). */
  milestones: boolean;
}

export const DEFAULT_PREFS: NotifyPrefs = {
  triggers: ["start", "goal", "close_finish", "final"],
  leagues: [],
  teams: [],
  quiet: { from: 23, to: 7 },
  milestones: true,
};

export function snapshotOf(g: Game, prev?: GameSnapshot): GameSnapshot {
  return {
    status: g.status,
    homeScore: g.homeScore ?? 0,
    awayScore: g.awayScore ?? 0,
    period: g.period,
    once: prev?.once ?? [],
  };
}

/** Minutes left in regulation, when the source lets us tell. */
export function minutesLeft(g: Game): number | null {
  if (!g.clock || !g.period || g.period > 3) return null;
  const mmss = /^(\d{1,2}):(\d{2})$/.exec(g.clock);
  if (g.source === "nhl" && mmss) return (3 - g.period) * 20 + Number(mmss[1]) + Number(mmss[2]) / 60;
  // eSports: elapsed game minute ("54", "54'", "54:12").
  const m = /^(\d{1,2})/.exec(g.clock);
  return m ? Math.max(0, 60 - Number(m[1])) : null;
}

const live = (s: Game["status"]) => s === "live" || s === "intermission";
const score = (g: Game) => `${g.home.shortName} ${g.homeScore ?? 0}:${g.awayScore ?? 0} ${g.away.shortName}`;

export function detectEvents(prev: GameSnapshot | undefined, g: Game, now = Date.now()): GameEvent[] {
  const out: GameEvent[] = [];
  const tag = `game-${g.id}`;
  const once = new Set(prev?.once ?? []);
  const emit = (kind: TriggerKind, title: string, body: string, suffix = "") =>
    out.push({ kind, gameId: g.id, title, body, tag, key: `${g.id}:${kind}${suffix}` });

  const mins = (Date.parse(g.startAt) - now) / 60000;
  if (g.status === "scheduled" && mins <= 15 && mins > -5 && !once.has("reminder")) {
    emit("reminder", `Za ${Math.max(1, Math.round(mins))} min: ${g.home.shortName} – ${g.away.shortName}`, g.leagueName);
  }
  if (!prev) return out; // first sighting: no diff (avoid a burst after deploys)

  if (!live(prev.status) && prev.status !== "final" && live(g.status)) {
    emit("start", `Začíná ${g.home.shortName} – ${g.away.shortName}`, g.leagueName);
  }

  const h = g.homeScore ?? 0;
  const a = g.awayScore ?? 0;
  if ((live(g.status) || g.status === "final") && h + a > prev.homeScore + prev.awayScore) {
    const scorer = h > prev.homeScore ? g.home.shortName : g.away.shortName;
    const minute = g.clock && g.source !== "nhl" ? ` (${g.clock.replace(/'$/, "")}. min)` : g.clock ? ` (${g.period}. tř. ${g.clock})` : "";
    emit("goal", `GÓL ${scorer}!`, `${score(g)}${minute}`, `:${h}-${a}`);
    const prevDiff = prev.homeScore - prev.awayScore;
    const diff = h - a;
    if (diff === 0) emit("equalizer", `Vyrovnáno! ${score(g)}`, g.leagueName, `:${h}-${a}`);
    if (Math.sign(diff) !== 0 && Math.sign(prevDiff) === -Math.sign(diff)) emit("lead_change", `Otočeno! ${score(g)}`, g.leagueName, `:${h}-${a}`);
  }

  if (prev.status === "live" && g.status === "intermission" && g.period && g.period <= 3) {
    emit("period_end", `Konec ${g.period}. třetiny`, score(g), `:${g.period}`);
  }

  const left = minutesLeft(g);
  if (g.status === "live" && left !== null && left <= 5 && Math.abs(h - a) <= 1 && !once.has("close_finish")) {
    emit("close_finish", `Napínavá koncovka`, `${score(g)} – zbývá ${Math.ceil(left)} min`);
  }
  if (live(g.status) && (g.period ?? 0) > 3 && !once.has("overtime")) {
    emit("overtime", g.period === 5 || /nájez|SO/i.test(g.statusLabel) ? "Rozhodnou nájezdy!" : "Prodloužení!", score(g));
  }
  if (prev.status !== "final" && g.status === "final") {
    const how = g.decidedIn === "OT" ? " po prodloužení" : g.decidedIn === "SO" ? " po nájezdech" : "";
    emit("final", `Konec${how}: ${score(g)}`, g.periods.map((p) => `${p[0]}:${p[1]}`).join(", "));
  }
  return out;
}

/** Update the once-list after emitting. */
export function rememberOnce(s: GameSnapshot, events: GameEvent[]): GameSnapshot {
  const once = new Set(s.once);
  for (const e of events) if (e.kind === "reminder" || e.kind === "close_finish" || e.kind === "overtime") once.add(e.kind);
  return { ...s, once: [...once] };
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

export function teamMatches(names: string[], g: Game): boolean {
  const cand = [g.home.shortName, g.home.name, g.away.shortName, g.away.name].map(norm).filter((n) => n.length >= 3);
  return names.some((n) => {
    const x = norm(n);
    return x.length >= 3 && cand.some((c) => c === x || c.includes(x) || x.includes(c));
  });
}

function pragueHour(now: number) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Prague", hour: "2-digit", hourCycle: "h23" }).format(now));
}

export function inQuietHours(q: NotifyPrefs["quiet"], now = Date.now()) {
  if (!q) return false;
  const h = pragueHour(now);
  return q.from <= q.to ? h >= q.from && h < q.to : h >= q.from || h < q.to;
}

/**
 * Should this subscriber get this event? Followed teams always qualify; a followed league
 * qualifies all its games. Finals still arrive during quiet hours only for followed teams (silently queued is not supported, so we drop the rest).
 */
export function shouldNotify(prefs: NotifyPrefs, g: Game, e: GameEvent, now = Date.now()): boolean {
  if (!prefs.triggers.includes(e.kind)) return false;
  const followed = prefs.teams.length > 0 && teamMatches(prefs.teams, g);
  const league = prefs.leagues.includes(g.leagueKey);
  if (!followed && !league) return false;
  if (inQuietHours(prefs.quiet, now)) return false;
  return true;
}
