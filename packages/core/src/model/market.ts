import type { Odds1x2 } from "../domain/types.ts";

export interface Probs1x2 {
  home: number;
  draw: number;
  away: number;
}

/** Bookmaker margin (overround) of a 1X2 market, e.g. 0.06 for 6 %. */
export function overround(o: Odds1x2): number | null {
  if (!o.home || !o.draw || !o.away) return null;
  return 1 / o.home + 1 / o.draw + 1 / o.away - 1;
}

/** Implied probabilities with the margin removed proportionally. */
export function impliedProbs(o: Odds1x2): Probs1x2 | null {
  if (!o.home || !o.draw || !o.away) return null;
  const h = 1 / o.home;
  const d = 1 / o.draw;
  const a = 1 / o.away;
  const sum = h + d + a;
  return { home: h / sum, draw: d / sum, away: a / sum };
}

/** Relative odds movement, negative = odds shortened (money came in). */
export function oddsMove(prev: number | null, next: number | null): number | null {
  if (!prev || !next) return null;
  return next / prev - 1;
}
