/**
 * Team strength + match prediction.
 *
 * Elo (goal-difference aware) → expected goals per team → independent Poisson for the 60-minute
 * result (1X2) and a win probability including overtime. The same machinery gives an in-game
 * win probability from the score and the time left.
 */
import type { ResultGame } from "./standings.ts";

export interface EloParams {
  k: number;
  homeAdvantage: number;
  /** Rating points carried over between seasons: r = mean + (r − mean) × regress. */
  seasonRegress: number;
  /** League goals per team per game (60 min). */
  goalsPerTeam: number;
  /** How strongly the Elo gap scales expected goals. */
  goalScale: number;
  /**
   * Multiplier on level scores: independent Poisson under-predicts hockey ties (score effects,
   * late-game caution), ELH regulation ties run ~22–24 % vs ~17 % from plain Poisson.
   */
  drawInflation: number;
}

export const DEFAULT_ELO: EloParams = { k: 18, homeAdvantage: 45, seasonRegress: 0.7, goalsPerTeam: 2.85, goalScale: 0.0022, drawInflation: 1.35 };

const MEAN = 1500;

export interface MatchProbabilities {
  home: number;
  draw: number;
  away: number;
  /** Win incl. overtime/shootout. */
  homeWin: number;
  expHome: number;
  expAway: number;
}

function poisson(k: number, lambda: number): number {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

/** 1X2 over 60 minutes from two independent Poisson goal rates. */
export function poisson1x2(lh: number, la: number, drawInflation = 1, maxGoals = 12): { home: number; draw: number; away: number } {
  let home = 0;
  let draw = 0;
  let away = 0;
  for (let h = 0; h <= maxGoals; h++) {
    const ph = poisson(h, lh);
    for (let a = 0; a <= maxGoals; a++) {
      const p = ph * poisson(a, la);
      if (h > a) home += p;
      else if (h === a) draw += p;
      else away += p;
    }
  }
  draw *= drawInflation;
  const s = home + draw + away;
  return { home: home / s, draw: draw / s, away: away / s };
}

export function expectedGoals(homeElo: number, awayElo: number, p: EloParams = DEFAULT_ELO) {
  const diff = homeElo + p.homeAdvantage - awayElo;
  const f = Math.exp(p.goalScale * diff);
  return { expHome: p.goalsPerTeam * Math.sqrt(f), expAway: p.goalsPerTeam / Math.sqrt(f) };
}

export function predict(homeElo: number, awayElo: number, p: EloParams = DEFAULT_ELO): MatchProbabilities {
  const { expHome, expAway } = expectedGoals(homeElo, awayElo, p);
  const r = poisson1x2(expHome, expAway, p.drawInflation);
  // Overtime: split by relative strength.
  const otHome = expHome / (expHome + expAway);
  return { ...r, homeWin: r.home + r.draw * otHome, expHome, expAway };
}

export interface RatingState {
  ratings: Map<string, number>;
  names: Map<string, string>;
  /** Pre-game prediction for every processed game (for backtests). */
  predictions: Map<string, MatchProbabilities>;
  /** Rating after each game: teamId → [iso date, rating][]. */
  history: Map<string, [string, number][]>;
}

const seasonOf = (iso: string) => {
  const d = new Date(iso);
  return d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
};

/** Runs Elo over games in chronological order. */
export function rateGames(games: ResultGame[], p: EloParams = DEFAULT_ELO): RatingState {
  const state: RatingState = { ratings: new Map(), names: new Map(), predictions: new Map(), history: new Map() };
  const sorted = [...games].sort((a, b) => a.startAt.localeCompare(b.startAt));
  let season: number | null = null;
  for (const g of sorted) {
    const s = seasonOf(g.startAt);
    if (season !== null && s !== season) {
      for (const [id, r] of state.ratings) state.ratings.set(id, MEAN + (r - MEAN) * p.seasonRegress);
    }
    season = s;
    const rh = state.ratings.get(g.homeId) ?? MEAN;
    const ra = state.ratings.get(g.awayId) ?? MEAN;
    state.names.set(g.homeId, g.homeName);
    state.names.set(g.awayId, g.awayName);
    state.predictions.set(g.id, predict(rh, ra, p));

    const expected = 1 / (1 + 10 ** ((ra - rh - p.homeAdvantage) / 400));
    const ot = g.decidedIn === "OT" || g.decidedIn === "SO";
    // Result score: regulation win 1, OT/SO win 0.6, tie 0.5.
    const actual = g.homeScore === g.awayScore ? 0.5 : g.homeScore > g.awayScore ? (ot ? 0.6 : 1) : ot ? 0.4 : 0;
    const margin = Math.abs(g.homeScore - g.awayScore);
    const mov = ot ? 1 : Math.log(margin + 1) * 1.1;
    const delta = p.k * mov * (actual - expected);
    state.ratings.set(g.homeId, rh + delta);
    state.ratings.set(g.awayId, ra - delta);
    for (const [id, r] of [
      [g.homeId, rh + delta],
      [g.awayId, ra - delta],
    ] as const) {
      const h = state.history.get(id) ?? [];
      h.push([g.startAt, Math.round(r)]);
      state.history.set(id, h);
    }
  }
  return state;
}

export interface Backtest {
  games: number;
  logLoss: number;
  brier: number;
  accuracy: number;
  /** Predicted vs observed home-win rate per 10 % bucket. */
  calibration: { bucket: number; predicted: number; observed: number; n: number }[];
}

/** Scores 1X2 predictions (60-minute result) against outcomes. */
export function backtest(games: ResultGame[], state: RatingState, from?: string): Backtest {
  let ll = 0;
  let brier = 0;
  let correct = 0;
  let n = 0;
  const buckets = Array.from({ length: 10 }, () => ({ p: 0, o: 0, n: 0 }));
  for (const g of games) {
    if (from && g.startAt < from) continue;
    const pr = state.predictions.get(g.id);
    if (!pr) continue;
    const reg = g.decidedIn === "OT" || g.decidedIn === "SO" || g.homeScore === g.awayScore ? "draw" : g.homeScore > g.awayScore ? "home" : "away";
    const p = pr[reg];
    ll += -Math.log(Math.max(p, 1e-6));
    brier += (["home", "draw", "away"] as const).reduce((a, k) => a + (pr[k] - (k === reg ? 1 : 0)) ** 2, 0);
    const pick = pr.home >= pr.away && pr.home >= pr.draw ? "home" : pr.away >= pr.draw ? "away" : "draw";
    if (pick === reg) correct++;
    const homeWon = g.homeScore > g.awayScore ? 1 : 0;
    const b = buckets[Math.min(9, Math.floor(pr.homeWin * 10))]!;
    b.p += pr.homeWin;
    b.o += homeWon;
    b.n++;
    n++;
  }
  return {
    games: n,
    logLoss: n ? ll / n : 0,
    brier: n ? brier / n : 0,
    accuracy: n ? correct / n : 0,
    calibration: buckets
      .map((b, i) => ({ bucket: i / 10, predicted: b.n ? b.p / b.n : 0, observed: b.n ? b.o / b.n : 0, n: b.n }))
      .filter((b) => b.n > 0),
  };
}

/**
 * In-game win probability for the home team given the score, seconds elapsed and pre-game goal
 * rates. Remaining goals ~ Poisson(rate × time left); a tie after 60 min goes to overtime split
 * by strength.
 */
export function liveWinProbability(
  homeScore: number,
  awayScore: number,
  elapsed: number,
  expHome: number,
  expAway: number,
): number {
  if (elapsed >= 3600) {
    if (homeScore !== awayScore) return homeScore > awayScore ? 1 : 0;
    return expHome / (expHome + expAway);
  }
  const left = Math.max(0, 3600 - elapsed) / 3600;
  const lh = expHome * left;
  const la = expAway * left;
  let win = 0;
  let tie = 0;
  for (let h = 0; h <= 12; h++) {
    const ph = poisson(h, lh);
    for (let a = 0; a <= 12; a++) {
      const p = ph * poisson(a, la);
      const fh = homeScore + h;
      const fa = awayScore + a;
      if (fh > fa) win += p;
      else if (fh === fa) tie += p;
    }
  }
  return win + tie * (expHome / (expHome + expAway));
}
