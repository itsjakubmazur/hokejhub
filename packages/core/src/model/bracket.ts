import type { ResultGame } from "./standings.ts";

/** A play-off game with its stage label ("Čtvrtfinále 3. kolo" → stage "Čtvrtfinále"). */
export interface PlayoffGame extends ResultGame {
  round: string | null;
}

export interface BracketSeries {
  key: string;
  /** Higher seed first (better regular-season rank), else the team with home ice in game 1. */
  top: string;
  bottom: string;
  topName: string;
  bottomName: string;
  topWins: number;
  bottomWins: number;
  winner: string | null;
  games: { id: string; startAt: string; topScore: number; bottomScore: number; topHome: boolean; decidedIn: ResultGame["decidedIn"] }[];
}

export interface BracketStage {
  name: string;
  /** Wins needed to take a series, inferred from the longest series of the stage. */
  bestOf: number;
  series: BracketSeries[];
}

/** Current extraliga format: best-of-5 preliminary round, best-of-7 from the quarterfinals. */
export const ELH_WINS_NEEDED: Record<string, number> = { Předkolo: 3, Čtvrtfinále: 4, Semifinále: 4, Finále: 4 };

const STAGE_ORDER = ["Předkolo", "Osmifinále", "Čtvrtfinále", "Semifinále", "O 3. místo", "Finále"];

export function stageOf(round: string | null): string | null {
  if (!round) return null;
  const s = round.replace(/\s*\d+\.\s*(kolo|zápas)\s*$/i, "").trim();
  return s || null;
}

/**
 * Builds a play-off bracket from finished games: series per stage, wins per side, and an order
 * that lines each series up next to the ones feeding the same next-round series.
 */
export function buildPlayoffBracket(
  games: PlayoffGame[],
  seeds: Map<string, number> = new Map(),
  /** Wins needed per stage for a season still in progress (e.g. { Předkolo: 3, Čtvrtfinále: 4 }). */
  winsNeeded: Record<string, number> = {},
): BracketStage[] {
  const sorted = [...games].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const pairKey = (a: string, b: string) => [a, b].sort().join("|");
  const names = new Map<string, string>();

  // Stage per game: from the round label, else inferred from how deep each team already is.
  const depth = new Map<string, number>();
  const seriesDepth = new Map<string, number>();
  const stageName = new Map<string, string>();
  for (const g of sorted) {
    names.set(g.homeId, g.homeName);
    names.set(g.awayId, g.awayName);
    const k = pairKey(g.homeId, g.awayId);
    const labelled = stageOf(g.round);
    if (labelled) stageName.set(k, labelled);
    if (!seriesDepth.has(k)) {
      const d = Math.max(depth.get(g.homeId) ?? 0, depth.get(g.awayId) ?? 0);
      seriesDepth.set(k, d);
      depth.set(g.homeId, d + 1);
      depth.set(g.awayId, d + 1);
    }
  }

  const bySeries = new Map<string, PlayoffGame[]>();
  for (const g of sorted) {
    const k = pairKey(g.homeId, g.awayId);
    bySeries.set(k, [...(bySeries.get(k) ?? []), g]);
  }

  const seed = (id: string) => seeds.get(id) ?? 99;
  const stages = new Map<string, BracketSeries[]>();
  const firstDate = new Map<string, string>();
  for (const [k, list] of bySeries) {
    const first = list[0]!;
    const [a, b] = [first.homeId, first.awayId];
    const [top, bottom] = seed(a) <= seed(b) ? [a, b] : [b, a];
    let topWins = 0;
    let bottomWins = 0;
    const gs = list.map((g) => {
      const topHome = g.homeId === top;
      const topScore = topHome ? g.homeScore : g.awayScore;
      const bottomScore = topHome ? g.awayScore : g.homeScore;
      if (topScore > bottomScore) topWins++;
      else if (bottomScore > topScore) bottomWins++;
      return { id: g.id, startAt: g.startAt, topScore, bottomScore, topHome, decidedIn: g.decidedIn };
    });
    const name = stageName.get(k) ?? `${seriesDepth.get(k)! + 1}. kolo`;
    stages.set(name, [
      ...(stages.get(name) ?? []),
      { key: k, top, bottom, topName: names.get(top)!, bottomName: names.get(bottom)!, topWins, bottomWins, winner: null, games: gs },
    ]);
    if (!firstDate.has(name) || first.startAt < firstDate.get(name)!) firstDate.set(name, first.startAt);
  }

  const ordered = [...stages.entries()].sort(([a], [b]) => {
    const ia = STAGE_ORDER.indexOf(a);
    const ib = STAGE_ORDER.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    return firstDate.get(a)!.localeCompare(firstDate.get(b)!);
  });

  const result: BracketStage[] = ordered.map(([name, series]) => {
    const need = winsNeeded[name] ?? Math.max(...series.map((s) => Math.max(s.topWins, s.bottomWins)));
    for (const s of series) {
      // Decided when a side reached the stage's winning count (or the series is shorter and over).
      if (s.topWins === need && s.topWins > s.bottomWins) s.winner = s.top;
      else if (s.bottomWins === need && s.bottomWins > s.topWins) s.winner = s.bottom;
    }
    return { name, bestOf: need * 2 - 1, series };
  });

  // Order from the last stage backwards so feeder series sit next to each other.
  const main = result.filter((s) => s.name !== "O 3. místo");
  for (let i = main.length - 1; i >= 0; i--) {
    const stage = main[i]!;
    const next = main[i + 1];
    if (!next) {
      stage.series.sort((a, b) => seed(a.top) - seed(b.top));
      continue;
    }
    const order: string[] = next.series.flatMap((s) => [s.top, s.bottom]);
    const rank = (s: BracketSeries) => {
      const pos = [s.top, s.bottom].map((t) => order.indexOf(t)).filter((p) => p >= 0);
      return pos.length ? Math.min(...pos) : 100 + seed(s.top);
    };
    stage.series.sort((a, b) => rank(a) - rank(b));
  }
  return result;
}
