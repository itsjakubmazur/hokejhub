/** Client for /api/tip/* and the shapes it returns. */

export interface User {
  id: string;
  nickname: string;
  club_id: string | null;
  club_logo: string | null;
  club_name: string | null;
}

export interface TipGame {
  id: string;
  league: string;
  leagueName: string;
  playDate: string;
  startAt: string;
  home: { name: string; logo: string | null };
  away: { name: string; logo: string | null };
  model: { home: number; away: number } | null;
  tips: { label: string; p: number; side: "home" | "away" | "none" }[];
  odds: { home: number | null; draw: number | null; away: number | null } | null;
}

export interface MyTip {
  home: number;
  away: number;
  joker: boolean;
}

export interface Split {
  n: number;
  home: number;
  draw: number;
  away: number;
}

export interface LeaderRow {
  user_id: string;
  nickname: string;
  club_logo: string | null;
  points: number;
  bonus: number;
  tips: number;
  exact: number;
  winners: number;
  jokers: number;
}

export interface Group {
  id: string;
  name: string;
  code: string;
  members: number;
  owner: boolean;
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`/api/tip/${path}`, {
    method: init?.method ?? "GET",
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

export const LEAGUE_TAG: Record<string, string> = { "cz-elh": "ELH", nhl: "NHL" };

/** Chip colours for a tip's points: gold exact, green winner + difference, pale winner, grey miss. */
export const pointsCls = (p: number | null, joker = false) =>
  p === null
    ? "border border-line text-muted"
    : (joker ? p / 2 : p) === 5
      ? "bg-gold text-black"
      : (joker ? p / 2 : p) >= 3
        ? "bg-win text-white"
        : p > 0
          ? "bg-win/40"
          : "bg-surface-2 text-muted";
