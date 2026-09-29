import { pragueToUtcIso } from "../domain/time.ts";

/** hokej.cz text commentary ("Textový přenos"), JSON on S3. */
export const hokejczOnlineUrl = (season: number, matchId: number, variant: "short" | "full" = "full") =>
  `https://s3-eu-west-1.amazonaws.com/hokej.cz/match/${season}/${variant}/${matchId}.json`;

export type CommentKind = "goal" | "penalty" | "period-start" | "period-end" | "important" | "normal" | "other";

export interface Comment {
  id: string;
  /** ISO time the comment was written. */
  writtenAt: string;
  kind: CommentKind;
  emptyNet: boolean;
  /** Game time "mm:ss" elapsed, null for pre/post-game notes. */
  time: string | null;
  gameSeconds: number | null;
  score: [number, number];
  /** Sanitised HTML: only <b>, <i>, <br> survive. */
  html: string;
  teamCode: string | null;
  players: string[];
}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const attrs = (v: unknown) => obj(obj(v)["@attributes"]);

function sanitize(html: string): string {
  return html
    .replace(/<(?!\/?(b|i|br)\s*\/?>)[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "<br>")
    .trim();
}

function toSeconds(t: string | null): number | null {
  const m = /^(\d+):(\d{2})$/.exec(t ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function parseHokejczOnline(json: unknown): Comment[] {
  const raw = obj(obj(json).comments).comment;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list
    .map((c) => {
      const a = attrs(c);
      const label = String(a.label ?? "");
      const type = String(a.type ?? "");
      const time = typeof obj(c).time === "string" ? (obj(c).time as string) : null;
      const detail = obj(obj(obj(c).details).detail);
      const players = ["player1", "player2", "player3"]
        .map((k) => String(attrs(detail[k]).name ?? ""))
        .filter(Boolean);
      const written = String(a.written ?? "");
      const kind: CommentKind =
        label === "goal" ? "goal" : label === "penalty" ? "penalty" : label === "time" ? (type === "begin" ? "period-start" : "period-end") : label === "important" ? "important" : label === "normal" ? "normal" : "other";
      return {
        id: String(a.id ?? ""),
        writtenAt: written ? pragueToUtcIso(written.slice(0, 10), written.slice(11, 16)).replace(":00.000Z", `:${written.slice(17, 19) || "00"}.000Z`) : "",
        kind,
        emptyNet: type === "empty",
        time,
        gameSeconds: toSeconds(time),
        score: [Number(a.score1 ?? 0), Number(a.score2 ?? 0)] as [number, number],
        html: sanitize(String(obj(c).message ?? "")),
        teamCode: (attrs(detail.opponent).code as string) ?? null,
        players,
      };
    })
    .sort((x, y) => (y.writtenAt > x.writtenAt ? 1 : y.writtenAt < x.writtenAt ? -1 : 0));
}

export interface ClockAnchor {
  /** Game seconds at `writtenAt`. */
  gameSeconds: number;
  writtenAt: string;
  /** False between periods / after the game (clock should not run). */
  running: boolean;
}

/**
 * Estimates the running game clock from the newest timed comment: the reporter logs events with
 * the game time, so `gameSeconds + (now − writtenAt)` tracks the real clock between updates
 * (capped at the end of the current period by the caller).
 */
export function clockAnchor(comments: Comment[]): ClockAnchor | null {
  const newest = comments.find((c) => c.gameSeconds !== null || c.kind === "period-end");
  if (!newest) return null;
  if (newest.kind === "period-end" || newest.gameSeconds === null) {
    const last = comments.find((c) => c.gameSeconds !== null);
    return last ? { gameSeconds: last.gameSeconds!, writtenAt: newest.writtenAt, running: false } : null;
  }
  return { gameSeconds: newest.gameSeconds, writtenAt: newest.writtenAt, running: true };
}
