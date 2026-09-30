/**
 * Betting-style markets from the model's expected goals: 1X2, winner incl. overtime, handicaps,
 * totals, both to score, period markets, first goal and exact scores. Everything derives from
 * one independent-Poisson grid with the same draw boost the 1X2 model uses.
 */
import { DEFAULT_ELO } from "./elo.ts";
import type { Tip } from "./tips.ts";

export interface ScoreCell {
  h: number;
  a: number;
  p: number;
}

function poisson(k: number, l: number) {
  let p = Math.exp(-l);
  for (let i = 1; i <= k; i++) p *= l / i;
  return p;
}

/** Normalised 60-minute score distribution. */
export function scoreGrid(expHome: number, expAway: number, drawInflation = DEFAULT_ELO.drawInflation, maxGoals = 10): ScoreCell[] {
  const cells: ScoreCell[] = [];
  let sum = 0;
  for (let h = 0; h <= maxGoals; h++)
    for (let a = 0; a <= maxGoals; a++) {
      const p = poisson(h, expHome) * poisson(a, expAway) * (h === a ? drawInflation : 1);
      cells.push({ h, a, p });
      sum += p;
    }
  for (const c of cells) c.p /= sum;
  return cells;
}

/** Share of overtime/shootout wins going to the home side. */
export const otShare = (expHome: number, expAway: number) => expHome / (expHome + expAway);

/**
 * Final-score distribution: a 60-minute tie h:h ends (h+1):h or h:(h+1) after overtime, split by
 * relative strength. Sorted by probability, most likely first.
 */
export function finalScores(expHome: number, expAway: number, drawInflation = DEFAULT_ELO.drawInflation): (ScoreCell & { ot: boolean })[] {
  const ot = otShare(expHome, expAway);
  const out = new Map<string, ScoreCell & { ot: boolean }>();
  const add = (h: number, a: number, p: number, isOt: boolean) => {
    const k = `${h}:${a}`;
    const cur = out.get(k);
    if (cur) cur.p += p;
    else out.set(k, { h, a, p, ot: isOt });
  };
  for (const c of scoreGrid(expHome, expAway, drawInflation)) {
    if (c.h !== c.a) add(c.h, c.a, c.p, false);
    else {
      add(c.h + 1, c.a, c.p * ot, true);
      add(c.h, c.a + 1, c.p * (1 - ot), true);
    }
  }
  return [...out.values()].sort((x, y) => y.p - x.p);
}

/**
 * The single most likely decided score in regulation — what a tipster writes down. Ties are
 * skipped (they resolve to x+1:x after overtime and would pile every game onto 3:2); equal
 * probabilities go to the home side.
 */
export function likelyScore(expHome: number, expAway: number, drawInflation = DEFAULT_ELO.drawInflation): Tip {
  const top = scoreGrid(expHome, expAway, drawInflation)
    .filter((c) => c.h !== c.a)
    .sort((x, y) => y.p - x.p || (y.h > y.a ? 1 : 0) - (x.h > x.a ? 1 : 0))[0]!;
  return { home: top.h, away: top.a };
}

export type MarketGroup = "vysledek" | "handicap" | "goly" | "tretiny" | "prvni-gol" | "skore";

export interface Market {
  key: string;
  group: MarketGroup;
  label: string;
  /** Model probability 0–1. */
  p: number;
  /** Fair decimal odds, 1 / p. */
  odds: number;
  side: "home" | "away" | "none";
}

const fmt1 = (x: number) => x.toFixed(1).replace(".", ",");

/** All markets for a game, grouped. Names are the short club names used in labels. */
export function matchMarkets(expHome: number, expAway: number, home: string, away: string, drawInflation = DEFAULT_ELO.drawInflation): Market[] {
  const grid = scoreGrid(expHome, expAway, drawInflation);
  const P = (f: (c: ScoreCell) => boolean) => grid.reduce((s, c) => s + (f(c) ? c.p : 0), 0);
  const ot = otShare(expHome, expAway);
  const draw = P((c) => c.h === c.a);
  const m: Omit<Market, "odds">[] = [];
  const push = (group: MarketGroup, key: string, label: string, p: number, side: Market["side"] = "none") => m.push({ group, key, label, p, side });

  push("vysledek", "1", `${home} vyhraje v základní hrací době`, P((c) => c.h > c.a), "home");
  push("vysledek", "X", "Remíza po 60 minutách (prodloužení)", draw);
  push("vysledek", "2", `${away} vyhraje v základní hrací době`, P((c) => c.h < c.a), "away");
  push("vysledek", "1-ot", `${home} vyhraje (i po prodloužení)`, P((c) => c.h > c.a) + draw * ot, "home");
  push("vysledek", "2-ot", `${away} vyhraje (i po prodloužení)`, P((c) => c.h < c.a) + draw * (1 - ot), "away");

  push("handicap", "h-1.5", `${home} −1,5 (vyhraje o 2 a víc)`, P((c) => c.h - c.a >= 2), "home");
  push("handicap", "a+1.5", `${away} +1,5 (neprohraje o 2 a víc)`, P((c) => c.h - c.a < 2), "away");
  push("handicap", "a-1.5", `${away} −1,5 (vyhraje o 2 a víc)`, P((c) => c.a - c.h >= 2), "away");
  push("handicap", "h+1.5", `${home} +1,5 (neprohraje o 2 a víc)`, P((c) => c.a - c.h < 2), "home");

  for (const line of [4.5, 5.5, 6.5]) {
    const over = P((c) => c.h + c.a > line);
    push("goly", `o${line}`, `Přes ${fmt1(line)} gólu`, over);
    push("goly", `u${line}`, `Pod ${fmt1(line)} gólu`, 1 - over);
  }
  push("goly", "btts", "Oba týmy dají gól", P((c) => c.h > 0 && c.a > 0));
  push("goly", "h-o2.5", `${home} dá 3 a víc gólů`, P((c) => c.h >= 3), "home");
  push("goly", "a-o2.5", `${away} dá 3 a víc gólů`, P((c) => c.a >= 3), "away");

  // Periods: a third of each rate, plain Poisson (low-scoring stretches tie often enough on their own).
  const ph = expHome / 3;
  const pa = expAway / 3;
  let p1h = 0;
  let p1x = 0;
  let p1a = 0;
  for (let h = 0; h <= 6; h++)
    for (let a = 0; a <= 6; a++) {
      const p = poisson(h, ph) * poisson(a, pa);
      if (h > a) p1h += p;
      else if (h === a) p1x += p;
      else p1a += p;
    }
  const s = p1h + p1x + p1a;
  push("tretiny", "p1-1", `${home} vyhraje 1. třetinu`, p1h / s, "home");
  push("tretiny", "p1-x", "1. třetina nerozhodně", p1x / s);
  push("tretiny", "p1-2", `${away} vyhraje 1. třetinu`, p1a / s, "away");
  const noGoalPeriod = Math.exp(-(ph + pa));
  push("tretiny", "p1-0", "1. třetina bez gólu", noGoalPeriod);
  push("tretiny", "p-all", "Gól v každé třetině", (1 - noGoalPeriod) ** 3);
  push("tretiny", "p1-o1.5", "Přes 1,5 gólu v 1. třetině", 1 - noGoalPeriod - (ph + pa) * Math.exp(-(ph + pa)));

  push("prvni-gol", "fg-h", `První gól dá ${home}`, ot * (1 - Math.exp(-(expHome + expAway))), "home");
  push("prvni-gol", "fg-a", `První gól dá ${away}`, (1 - ot) * (1 - Math.exp(-(expHome + expAway))), "away");

  for (const c of finalScores(expHome, expAway, drawInflation).slice(0, 5))
    push("skore", `s${c.h}:${c.a}`, `Přesně ${c.h}:${c.a}${c.ot ? " po prodloužení" : ""}`, c.p, c.h > c.a ? "home" : "away");

  return m.map((x) => ({ ...x, odds: x.p > 0 ? Math.round((1 / x.p) * 100) / 100 : Infinity }));
}

/**
 * A handful of tips worth writing down. Ranked by how much the game moves a market away from an
 * average game (`baseline`), so a league-wide constant like "over 4,5" only shows up when this
 * game really is high-scoring; without a baseline, by probability. Never the same group twice,
 * never the trivial (over `max`) or coin-flips (under `min`).
 */
export function pickTips(markets: Market[], opts: { baseline?: Market[]; n?: number; min?: number; max?: number } = {}): Market[] {
  const { baseline, n = 3, min = 0.55, max = 0.85 } = opts;
  const base = new Map(baseline?.map((m) => [m.key, m.p]));
  const score = (m: Market) => (base.size ? m.p - (base.get(m.key) ?? m.p) : m.p);
  const seen = new Set<MarketGroup>();
  const out: Market[] = [];
  for (const m of [...markets].filter((x) => x.group !== "skore" && x.p >= min && x.p <= max).sort((x, y) => score(y) - score(x) || y.p - x.p)) {
    if (seen.has(m.group)) continue;
    if (base.size && score(m) < 0.03 && out.length) continue;
    seen.add(m.group);
    out.push(m);
    if (out.length >= n) break;
  }
  // A dead-average game moves nothing much; still give it its two most confident non-trivial tips.
  if (base.size && out.length < 2)
    for (const m of [...markets].filter((x) => x.group !== "skore" && x.p >= min && x.p <= max && !seen.has(x.group)).sort((x, y) => y.p - x.p)) {
      seen.add(m.group);
      out.push(m);
      if (out.length >= 2) break;
    }
  return out;
}

/** The model's tips for one game: markets against a league-average baseline. */
export function gameTips(expHome: number, expAway: number, home: string, away: string, n = 3, drawInflation = DEFAULT_ELO.drawInflation): Market[] {
  const avg = DEFAULT_ELO.goalsPerTeam;
  return pickTips(matchMarkets(expHome, expAway, home, away, drawInflation), {
    baseline: matchMarkets(avg * 1.03, avg * 0.97, home, away, drawInflation),
    n,
  });
}
