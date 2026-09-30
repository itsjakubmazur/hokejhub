/**
 * Expected goals (xG) for unblocked shot attempts.
 *
 * Logistic regression on features both leagues share (location, rebound, manpower). Trained on
 * NHL play-by-play (`ml/xg/train.py`), to be re-fitted on ELH shots once history is crawled.
 * Coordinates follow the app convention: shooter attacks +x, goal line at x = 89 ft.
 */
import coefficients from "./xg-coefficients.json";
import elhCoefficients from "./xg-elh-coefficients.json";

export type Strength = "EV" | "PP" | "SH" | "EN";

export interface XgShot {
  x: number;
  y: number;
  /** Seconds since the previous unblocked attempt by the same team (null = none recently). */
  sincePrevSameTeam?: number | null;
  strength?: Strength;
}

export interface XgFeatures {
  distance: number;
  angle: number;
  rebound: number;
  pp: number;
  sh: number;
  en: number;
}

const GOAL_X = 89;

export function xgFeatures(s: XgShot): XgFeatures {
  const dx = GOAL_X - s.x;
  const dy = Math.abs(s.y);
  const distance = Math.hypot(dx, dy);
  // Angle from the centre line of the net, 0° = straight on, 90°+ = from behind the goal line.
  const angle = dx <= 0 ? 90 + (Math.atan2(-dx, Math.max(dy, 0.1)) * 180) / Math.PI : (Math.atan2(dy, dx) * 180) / Math.PI;
  return {
    distance,
    angle,
    rebound: s.sincePrevSameTeam != null && s.sincePrevSameTeam <= 3 ? 1 : 0,
    pp: s.strength === "PP" ? 1 : 0,
    sh: s.strength === "SH" ? 1 : 0,
    en: s.strength === "EN" ? 1 : 0,
  };
}

const C = coefficients as { intercept: number; weights: Record<keyof XgFeatures | "logDistance", number> };

export function expectedGoal(s: XgShot): number {
  const f = xgFeatures(s);
  const z =
    C.intercept +
    C.weights.distance * f.distance +
    C.weights.logDistance * Math.log(f.distance + 1) +
    C.weights.angle * f.angle +
    C.weights.rebound * f.rebound +
    C.weights.pp * f.pp +
    C.weights.sh * f.sh +
    C.weights.en * f.en;
  return 1 / (1 + Math.exp(-z));
}

export interface PenaltyWindow {
  isHome: boolean;
  /** Seconds elapsed at which the penalty started. */
  start: number;
  minutes: number;
}

/**
 * Approximate manpower at a moment from penalties (2 and 5 minute penalties reduce strength;
 * misconducts do not). Minors end early is not modelled — good enough for xG context.
 */
export function strengthAt(elapsed: number, isHome: boolean, penalties: PenaltyWindow[]): Strength {
  let home = 5;
  let away = 5;
  for (const p of penalties) {
    if (p.minutes !== 2 && p.minutes !== 4 && p.minutes !== 5) continue;
    if (elapsed >= p.start && elapsed < p.start + p.minutes * 60) {
      if (p.isHome) home--;
      else away--;
    }
  }
  home = Math.max(home, 3);
  away = Math.max(away, 3);
  const own = isHome ? home : away;
  const opp = isHome ? away : home;
  return own > opp ? "PP" : own < opp ? "SH" : "EV";
}

// ---------- extraliga model (fitted on hokej.cz shots, ml/xg/train_elh.py) ----------

const E = elhCoefficients as {
  intercept: number;
  weights: Record<string, number>;
  geometry: { halfLengthM: number; halfWidthM: number; goalXM: number };
};

export interface ElhXgShot {
  /** hokej.cz units: percent of the half-rink, shooter attacking +x. */
  xp: number;
  yp: number;
  /** Seconds since the previous attempt (any result) by the same team. */
  sincePrevSameTeam?: number | null;
  strength?: Strength;
}

/** Features in the exact order and form of `features()` in train_elh.py. */
export function elhXgFeatures(s: ElhXgShot): Record<string, number> {
  const g = E.geometry;
  const x = (s.xp / 100) * g.halfLengthM;
  const y = (s.yp / 100) * g.halfWidthM;
  const dx = g.goalXM - x;
  const dy = Math.abs(y);
  const dist = Math.hypot(dx, dy);
  const angle = dx <= 0 ? 90 + (Math.atan2(-dx, Math.max(dy, 0.05)) * 180) / Math.PI : (Math.atan2(dy, dx) * 180) / Math.PI;
  const rebound = s.sincePrevSameTeam != null && s.sincePrevSameTeam <= 3 ? 1 : 0;
  const a90 = angle / 90;
  return {
    distance: dist,
    logDistance: Math.log(dist + 1),
    angle,
    distAngle: (dist * angle) / 100,
    rebound,
    pp: s.strength === "PP" ? 1 : 0,
    sh: s.strength === "SH" ? 1 : 0,
    invDistance: 1 / (dist + 1),
    angleSq: a90 * a90,
    distanceSq: (dist * dist) / 100,
    reboundAngle: rebound * a90,
  };
}

/** Extraliga xG for an unblocked attempt. Empty-net shots are near-certain goals. */
export function expectedGoalElh(s: ElhXgShot): number {
  if (s.strength === "EN") return 0.9;
  const f = elhXgFeatures(s);
  let z = E.intercept;
  for (const [k, w] of Object.entries(E.weights)) z += w * (f[k] ?? 0);
  return 1 / (1 + Math.exp(-z));
}
