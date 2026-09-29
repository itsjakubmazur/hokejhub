/**
 * Per-match data published by onlajny.com on S3 (used by hokej.cz for "Rozestavení" and
 * "Podrobné statistiky"): line-ups with lines, team stats per period, player stats per period.
 * Keyed by season start year and onlajny match id.
 */
const BASE = "https://s3-eu-west-1.amazonaws.com/data.onlajny.com/hockey";

export const onlajnyMatchUrls = {
  roster: (season: number, onlajnyId: number) => `${BASE}/roster/${season}/${onlajnyId}.json`,
  summary: (season: number, onlajnyId: number) => `${BASE}/summary/${season}/${onlajnyId}.json`,
  playerStats: (season: number, onlajnyId: number) => `${BASE}/player-stats/${season}/${onlajnyId}.json`,
};

/** Season start year for a date (hockey seasons start in summer). */
export const seasonOf = (iso: string) => {
  const d = new Date(iso);
  return d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
};

type Json = Record<string, unknown>;
const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});

// ---------- roster / lines ----------

export interface LineupPlayer {
  id: number;
  jersey: number | null;
  name: string;
  surname: string;
  position: "GK" | "D" | "F";
  /** "c" captain, "a" alternate. */
  role: "c" | "a" | null;
  stick: "L" | "R" | null;
  birthDate: string | null;
  /** Goalies only. */
  saves?: number | null;
  goalsAgainst?: number | null;
}

export interface TeamLineup {
  goalies: LineupPlayer[];
  /** Defence pairs, index 0 = 1st pair: [left, right]. */
  defence: (LineupPlayer | null)[][];
  /** Forward lines: [LW, C, RW]. */
  forwards: (LineupPlayer | null)[][];
  coaches: { name: string; role: string }[];
}

export interface MatchLineups {
  available: boolean;
  home: TeamLineup;
  away: TeamLineup;
  referees: { name: string; role: "referee" | "linesman" }[];
  colors: { home: string | null; away: string | null };
}

function lineupPlayer(raw: Json, position: LineupPlayer["position"]): LineupPlayer {
  const type = String(raw.type ?? "").toLowerCase();
  const stick = String(raw.stick ?? "").toUpperCase();
  const saves = obj(raw.saves);
  const obtained = obj(raw.obtained);
  return {
    id: num(raw.id),
    jersey: raw.jersey != null ? num(raw.jersey) : null,
    name: String(raw.name ?? ""),
    surname: String(raw.surname ?? ""),
    position,
    role: type === "c" ? "c" : type === "a" ? "a" : null,
    // Czech notation: L = levá, P = pravá.
    stick: stick === "L" ? "L" : stick === "P" || stick === "R" ? "R" : null,
    birthDate: typeof obj(raw.birth_date).date === "string" ? String(obj(raw.birth_date).date).slice(0, 10) : null,
    ...(position === "GK" ? { saves: "total" in saves ? num(saves.total) : null, goalsAgainst: "total" in obtained ? num(obtained.total) : null } : {}),
  };
}

function teamLineup(raw: Json, coaches: unknown): TeamLineup {
  const t: TeamLineup = { goalies: [], defence: [], forwards: [], coaches: [] };
  for (const [slot, v] of Object.entries(raw).sort(([a], [b]) => a.localeCompare(b))) {
    const p = obj(v);
    if (p.attended === false) continue;
    const kind = slot[0];
    const line = Number(slot[1]) - 1;
    const pos = Number(slot[2]) - 1;
    if (kind === "1") t.goalies.push(lineupPlayer(p, "GK"));
    else if (kind === "2" && line >= 0) {
      (t.defence[line] ??= [null, null])[pos] = lineupPlayer(p, "D");
    } else if (kind === "3" && line >= 0) {
      (t.forwards[line] ??= [null, null, null])[pos] = lineupPlayer(p, "F");
    }
  }
  t.defence = t.defence.filter(Boolean);
  t.forwards = t.forwards.filter(Boolean);
  if (Array.isArray(coaches)) {
    t.coaches = coaches
      .map((c) => obj(c))
      .filter((c) => ["hlavniTrener", "asistent1", "asistent2"].includes(String(c.function)))
      .map((c) => ({
        name: Array.isArray(c.name) ? c.name.join(" ") : String(c.name ?? ""),
        role: c.function === "hlavniTrener" ? "Hlavní trenér" : "Asistent",
      }));
  }
  return t;
}

export function parseOnlajnyRoster(json: unknown): MatchLineups {
  const d = obj(json);
  const rosters = obj(d.rosters);
  const coaches = obj(d.coaches);
  const colors = obj(d.colors);
  return {
    available: d.hasRoster !== false && Object.keys(obj(rosters.home)).length > 0,
    home: teamLineup(obj(rosters.home), coaches.home),
    away: teamLineup(obj(rosters.guest), coaches.guest),
    referees: (Array.isArray(d.referees) ? d.referees : []).map((r) => {
      const o = obj(r);
      return {
        name: `${o.name ?? ""} ${o.surname ?? ""}`.trim(),
        role: String(o.type ?? "").startsWith("hlavni") ? ("referee" as const) : ("linesman" as const),
      };
    }),
    colors: { home: (colors.home as string) ?? null, away: (colors.guest as string) ?? null },
  };
}

// ---------- team stats per period ----------

export type PeriodKey = "1" | "2" | "3" | "OT" | "total";

/** Team stat values per period: `values[period] = [home, away]`. */
export type PeriodStat = Partial<Record<PeriodKey, [number, number]>>;

export interface MatchPeriodStats {
  goals: PeriodStat;
  shotsOnGoal: PeriodStat;
  missedShots: PeriodStat;
  blockedShots: PeriodStat;
  /** Shots the team blocked (defensive blocks). */
  blocks: PeriodStat;
  hits: PeriodStat;
  faceoffsWon: PeriodStat;
  faceoffsTotal: PeriodStat;
  penaltyMinutes: PeriodStat;
  avgToi: PeriodStat;
  avgShift: PeriodStat;
  periods: PeriodKey[];
}

function statOf(side: Json, key: string, pick: (v: unknown) => number = num): Record<string, number> {
  const s = obj(side[key]);
  const out: Record<string, number> = {};
  for (const [p, v] of Object.entries(obj(s.periods))) out[p] = pick(v);
  const ot = s.overtime;
  if (Array.isArray(ot) && ot.length) out.OT = ot.reduce((a: number, v) => a + pick(v), 0);
  else if (ot && typeof ot === "object" && !Array.isArray(ot)) out.OT = pick(ot);
  out.total = pick(s.total);
  return out;
}

export function parseOnlajnySummary(json: unknown): MatchPeriodStats | null {
  const d = obj(json);
  const h = obj(d.home);
  const a = obj(d.visitor);
  if (!Object.keys(h).length) return null;
  const pair = (key: string, pick?: (v: unknown) => number): PeriodStat => {
    const hs = statOf(h, key, pick);
    const as = statOf(a, key, pick);
    const out: PeriodStat = {};
    for (const p of new Set([...Object.keys(hs), ...Object.keys(as)])) out[p as PeriodKey] = [hs[p] ?? 0, as[p] ?? 0];
    return out;
  };
  const periods = (["1", "2", "3", "OT"] as PeriodKey[]).filter((p) => p in pair("goals"));
  return {
    goals: pair("goals"),
    shotsOnGoal: pair("shots"),
    missedShots: pair("missed_shots"),
    blockedShots: pair("blocked_shots"),
    blocks: pair("shots_blocked_by_team"),
    hits: pair("hits"),
    faceoffsWon: pair("faceoffs", (v) => num(obj(v).win)),
    faceoffsTotal: pair("faceoffs", (v) => num(obj(v).total_count)),
    penaltyMinutes: pair("penalty_seconds", (v) => Math.round(num(v) / 60)),
    avgToi: pair("toi_avreage"),
    avgShift: pair("shift_avreage_time"),
    periods: [...periods, "total"],
  };
}

// ---------- player stats per period ----------

export interface PlayerPeriodLine {
  toi: number;
  shifts: number;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  shots: number;
  shotsBlocked: number;
  blocks: number;
  hits: number;
  faceoffs: number;
  faceoffsWon: number;
  pim: number;
  ri: number;
}

export interface PlayerMatchStats extends PlayerPeriodLine {
  id: number;
  jersey: number | null;
  name: string;
  position: string;
  periods: PlayerPeriodLine[];
}

function periodLine(r: Json): PlayerPeriodLine {
  return {
    toi: num(r.time_on_ice),
    shifts: num(r.shifts),
    goals: num(r.goals),
    assists: num(r.assistance),
    points: num(r.points),
    plusMinus: num(r.plus_minus),
    shots: num(r.shots),
    shotsBlocked: num(r.player_shot_is_blocked_count),
    blocks: num(r.blocked_shots),
    hits: num(r.hits),
    faceoffs: num(r.faceoffs),
    faceoffsWon: num(r.faceoffs_win),
    pim: num(r.penalty_minutes),
    ri: num(r.radegast_index),
  };
}

export function parseOnlajnyPlayerStats(json: unknown): { home: PlayerMatchStats[]; away: PlayerMatchStats[] } | null {
  const d = obj(json);
  if (d.statistics === false) return null;
  const side = (list: unknown) =>
    (Array.isArray(list) ? list : []).map((x) => {
      const r = obj(x);
      return {
        id: num(r.id),
        jersey: r.jersey != null ? num(r.jersey) : null,
        name: `${r.name ?? ""} ${r.surname ?? ""}`.trim(),
        position: String(r.position ?? ""),
        ...periodLine(r),
        periods: (Array.isArray(r.period) ? r.period : []).map((p) => periodLine(obj(p))),
      };
    });
  return { home: side(d.home), away: side(d.guest) };
}
