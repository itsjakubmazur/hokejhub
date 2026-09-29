/** Tables computed from game results: overall / home / away / form (last N) / over-under. */

export interface ResultGame {
  id: string;
  startAt: string;
  homeId: string;
  awayId: string;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  decidedIn: "REG" | "OT" | "SO" | null;
}

export type Split = "overall" | "home" | "away";
export type FormResult = "W" | "OTW" | "OTL" | "L";

export interface StandingRow {
  teamId: string;
  teamName: string;
  gp: number;
  w: number;
  otw: number;
  otl: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
  /** Most recent first. */
  form: FormResult[];
  rank: number;
}

export interface PointsRules {
  win: number;
  otWin: number;
  otLoss: number;
  loss: number;
}

/** Tipsport extraliga / modern European 3-2-1-0. */
export const THREE_POINT: PointsRules = { win: 3, otWin: 2, otLoss: 1, loss: 0 };

function resultFor(g: ResultGame, teamId: string): FormResult {
  const home = g.homeId === teamId;
  const won = home ? g.homeScore > g.awayScore : g.awayScore > g.homeScore;
  const ot = g.decidedIn === "OT" || g.decidedIn === "SO";
  return won ? (ot ? "OTW" : "W") : ot ? "OTL" : "L";
}

/**
 * Builds a table. `lastN` restricts each team to its N most recent games (form table);
 * `split` restricts to home or away games. Ties broken by points, goal difference, goals for.
 */
export function computeStandings(
  games: ResultGame[],
  opts: { split?: Split; lastN?: number; rules?: PointsRules } = {},
): StandingRow[] {
  const { split = "overall", lastN, rules = THREE_POINT } = opts;
  const byTeam = new Map<string, { name: string; games: ResultGame[] }>();
  const sorted = [...games].sort((a, b) => b.startAt.localeCompare(a.startAt));
  for (const g of sorted) {
    for (const side of ["home", "away"] as const) {
      if (split !== "overall" && split !== side) continue;
      const id = side === "home" ? g.homeId : g.awayId;
      const name = side === "home" ? g.homeName : g.awayName;
      const e = byTeam.get(id) ?? { name, games: [] };
      e.games.push(g);
      byTeam.set(id, e);
    }
  }
  const rows: StandingRow[] = [];
  for (const [teamId, { name, games: list }] of byTeam) {
    const used = lastN ? list.slice(0, lastN) : list;
    const r: StandingRow = { teamId, teamName: name, gp: 0, w: 0, otw: 0, otl: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [], rank: 0 };
    for (const g of used) {
      const home = g.homeId === teamId;
      const res = resultFor(g, teamId);
      r.gp++;
      r.gf += home ? g.homeScore : g.awayScore;
      r.ga += home ? g.awayScore : g.homeScore;
      if (res === "W") (r.w++, (r.pts += rules.win));
      else if (res === "OTW") (r.otw++, (r.pts += rules.otWin));
      else if (res === "OTL") (r.otl++, (r.pts += rules.otLoss));
      else (r.l++, (r.pts += rules.loss));
      if (r.form.length < 5) r.form.push(res);
    }
    rows.push(r);
  }
  rows.sort((a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || a.teamName.localeCompare(b.teamName, "cs"));
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

export interface OverUnderRow {
  teamId: string;
  teamName: string;
  gp: number;
  over: number;
  under: number;
  /** Average total goals in the team's games. */
  avgTotal: number;
}

/** Over/under a goal line (e.g. 5.5) per team; totals include overtime, exclude shootout goals. */
export function computeOverUnder(games: ResultGame[], line = 5.5): OverUnderRow[] {
  const map = new Map<string, OverUnderRow & { sum: number }>();
  for (const g of games) {
    // A shootout adds one "goal" to the winner's final score.
    const total = g.homeScore + g.awayScore - (g.decidedIn === "SO" ? 1 : 0);
    for (const [id, name] of [
      [g.homeId, g.homeName],
      [g.awayId, g.awayName],
    ] as const) {
      const e = map.get(id) ?? { teamId: id, teamName: name, gp: 0, over: 0, under: 0, avgTotal: 0, sum: 0 };
      e.gp++;
      e.sum += total;
      if (total > line) e.over++;
      else e.under++;
      map.set(id, e);
    }
  }
  return [...map.values()]
    .map(({ sum, ...r }) => ({ ...r, avgTotal: r.gp ? sum / r.gp : 0 }))
    .sort((a, b) => b.over / (b.gp || 1) - a.over / (a.gp || 1));
}
