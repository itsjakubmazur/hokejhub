/**
 * Tables of competitions we keep no database for (Maxa liga, 2. liga, youth leagues), computed
 * from the live feed's results — for when hokej.cz, which publishes them, cannot be read.
 *
 * Teams are split into the competition's groups by who plays whom (a group plays mostly within
 * itself, a few games across groups are fine), and each group is named after the clubs it
 * contains. A team's line counts all its games, also those against the other groups (as
 * hokej.cz's tables do). Level on points, teams are ordered by goal difference, then goals
 * scored — hokej.cz's running tables do the same (games between them decide only at the end).
 */
import { THREE_POINT, type PointsRules, type ResultGame } from "./standings.ts";

export interface GroupSpec {
  title: string;
  /** Fragments of club names that belong to this group (any of them is enough). */
  markers?: string[];
}

export interface GroupTableRow {
  rank: number;
  teamId: string;
  teamName: string;
  gp: number;
  w: number;
  otw: number;
  /** Games that ended level (youth leagues without overtime). */
  t: number;
  otl: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
}

export interface GroupTable {
  title: string;
  rows: GroupTableRow[];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Points, goals and record of each team over `games`. */
function tally(games: ResultGame[], rules: PointsRules) {
  const rows = new Map<string, GroupTableRow>();
  const row = (id: string, name: string) => {
    let r = rows.get(id);
    if (!r) rows.set(id, (r = { rank: 0, teamId: id, teamName: name, gp: 0, w: 0, otw: 0, t: 0, otl: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
    return r;
  };
  for (const g of games) {
    const h = row(g.homeId, g.homeName);
    const a = row(g.awayId, g.awayName);
    const ot = g.decidedIn === "OT" || g.decidedIn === "SO";
    h.gp++, a.gp++;
    h.gf += g.homeScore, h.ga += g.awayScore;
    a.gf += g.awayScore, a.ga += g.homeScore;
    if (g.homeScore === g.awayScore) {
      h.t++, a.t++;
      h.pts += rules.tie, a.pts += rules.tie;
      continue;
    }
    const [win, loss] = g.homeScore > g.awayScore ? [h, a] : [a, h];
    if (ot) (win.otw++, (win.pts += rules.otWin), loss.otl++, (loss.pts += rules.otLoss));
    else (win.w++, (win.pts += rules.win), loss.l++, (loss.pts += rules.loss));
  }
  return rows;
}

/** Orders a table: points, goal difference, goals scored. */
function rank(rows: GroupTableRow[]): GroupTableRow[] {
  rows.sort((a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || a.teamName.localeCompare(b.teamName, "cs"));
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

/**
 * Splits teams into `k` groups: start from who has played whom, then join the clusters that
 * played each other most (relative to their size) until `k` are left.
 */
function cluster(games: ResultGame[], k: number): string[][] {
  const teams = [...new Set(games.flatMap((g) => [g.homeId, g.awayId]))];
  const between = new Map<string, number>();
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (const g of games) between.set(key(g.homeId, g.awayId), (between.get(key(g.homeId, g.awayId)) ?? 0) + 1);
  let groups = teams.map((t) => [t]);
  while (groups.length > Math.max(k, 1)) {
    let best: [number, number, number] | null = null;
    for (let i = 0; i < groups.length; i++)
      for (let j = i + 1; j < groups.length; j++) {
        let n = 0;
        for (const a of groups[i]!) for (const b of groups[j]!) n += between.get(key(a, b)) ?? 0;
        const score = n / (groups[i]!.length * groups[j]!.length);
        if (!best || score > best[2]) best = [i, j, score];
      }
    if (!best) break;
    const [i, j] = best;
    groups = [...groups.filter((_, x) => x !== i && x !== j), [...groups[i]!, ...groups[j]!]];
  }
  return groups;
}

/**
 * Tables of a competition from its finished games. `groups` lists the competition's groups
 * (one for a single table); playoff games (`series`) and unfinished ones are left out by the
 * caller.
 */
export function computeGroupTables(games: ResultGame[], groups: GroupSpec[], rules: PointsRules = THREE_POINT): GroupTable[] {
  if (!games.length) return [];
  const names = new Map<string, string>();
  for (const g of games) names.set(g.homeId, g.homeName), names.set(g.awayId, g.awayName);
  const clusters = cluster(games, groups.length);
  // Name each cluster after the group whose clubs it holds most of; unknown ones in order.
  const free = new Set(groups.map((_, i) => i));
  const titled = clusters
    .map((c) => {
      const hits = groups.map((spec) => c.filter((id) => spec.markers?.some((m) => norm(names.get(id) ?? "").includes(norm(m)))).length);
      return { c, hits };
    })
    .sort((a, b) => Math.max(...b.hits) - Math.max(...a.hits))
    .map(({ c, hits }) => {
      let pick = -1;
      for (const i of free) if (hits[i]! > 0 && (pick < 0 || hits[i]! > hits[pick]!)) pick = i;
      if (pick < 0) pick = [...free][0] ?? -1;
      free.delete(pick);
      return { c, index: pick };
    })
    .sort((a, b) => a.index - b.index);
  const all = tally(games, rules);
  return titled.map(({ c, index }) => ({
    title: groups[index]?.title ?? `Skupina ${index + 1}`,
    rows: rank(c.map((id) => all.get(id)!)),
  }));
}
