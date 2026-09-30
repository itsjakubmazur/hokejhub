/** Score-tipping game: points for a tip vs. the final result, and the model's own tip. */
import { likelyScore } from "./markets.ts";

export interface Tip {
  home: number;
  away: number;
}

/**
 * 5 = exact score, 3 = right winner and goal difference, 2 = right winner (or a tip of a
 * regulation draw when the game went to overtime), 0 otherwise. Overtime/shootout results count
 * as the 60-minute draw: 3:2 after OT means a correct "2:2" tip is exact.
 */
export function tipPoints(tip: Tip, home: number, away: number, decidedIn: "REG" | "OT" | "SO" | null): number {
  let h = home;
  let a = away;
  if (decidedIn === "OT" || decidedIn === "SO") {
    const level = Math.min(h, a);
    h = level;
    a = level;
  }
  if (tip.home === h && tip.away === a) return 5;
  const sign = (x: number) => Math.sign(x);
  if (sign(tip.home - tip.away) !== sign(h - a)) return 0;
  return tip.home - tip.away === h - a ? 3 : 2;
}

function poisson(k: number, l: number) {
  let p = Math.exp(-l);
  for (let i = 1; i <= k; i++) p *= l / i;
  return p;
}

/**
 * The tip maximising expected points under independent Poisson goals (with a draw boost). Under
 * the 5/3/2 scale this is almost always 3:2 or 2:3 — the model playing safe — so it stays here
 * as the reference "bot" strategy while `modelTip` shows the most likely score.
 */
export function modelTipEv(expHome: number, expAway: number, drawInflation = 1.35, maxGoals = 9): Tip {
  const grid: { h: number; a: number; p: number }[] = [];
  let sum = 0;
  for (let h = 0; h <= maxGoals; h++)
    for (let a = 0; a <= maxGoals; a++) {
      const p = poisson(h, expHome) * poisson(a, expAway) * (h === a ? drawInflation : 1);
      grid.push({ h, a, p });
      sum += p;
    }
  let best: Tip = { home: 1, away: 1 };
  let bestEv = -1;
  for (let th = 0; th <= 6; th++)
    for (let ta = 0; ta <= 6; ta++) {
      let ev = 0;
      for (const c of grid) ev += (c.p / sum) * tipPoints({ home: th, away: ta }, c.h, c.a, "REG");
      if (ev > bestEv) {
        bestEv = ev;
        best = { home: th, away: ta };
      }
    }
  return best;
}

/**
 * The model's tip: the most likely final score (overtime games resolved to the stronger side),
 * so tips differ from game to game — 2:1 for a tight one, 4:1 for a mismatch — instead of the
 * point-optimal 3:2 everywhere.
 */
export function modelTip(expHome: number, expAway: number, drawInflation = 1.35): Tip {
  return likelyScore(expHome, expAway, drawInflation);
}
