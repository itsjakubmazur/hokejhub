import type { ShotEvent } from "../domain/types.ts";
import type { HokejczShotXg } from "../sources/hokejcz-shots.ts";
import { expectedGoal, type Strength } from "./xg.ts";

/** NHL situationCode "abcd" = away goalie, away skaters, home skaters, home goalie. */
function nhlStrength(code: string | null, isHome: boolean): Strength {
  if (!code || code.length !== 4) return "EV";
  const [ag, as, hs, hg] = code.split("").map(Number) as [number, number, number, number];
  const own = isHome ? hs : as;
  const opp = isHome ? as : hs;
  const oppGoalie = isHome ? ag : hg;
  if (oppGoalie === 0) return "EN";
  return own > opp ? "PP" : own < opp ? "SH" : "EV";
}

/** Adds strength + xG to NHL shots (coordinates already normalised by `parseNhlShots`). */
export function nhlShotsWithXg(shots: ShotEvent[], homeTeamId: string): ShotEvent[] {
  const last = new Map<string, number>();
  return shots.map((s) => {
    const isHome = s.teamId === homeTeamId;
    const strength = nhlStrength(s.situationCode, isHome);
    const t = (s.period - 1) * 1200 + s.periodSeconds;
    let xg = 0;
    if (s.type !== "blocked-shot" && s.x !== null && s.y !== null && s.period <= 4) {
      const prev = last.get(s.teamId);
      xg = expectedGoal({ x: s.x, y: s.y, sincePrevSameTeam: prev !== undefined ? t - prev : null, strength });
      last.set(s.teamId, t);
    }
    return { ...s, strength, xg };
  });
}

const TYPE: Record<HokejczShotXg["result"], ShotEvent["type"]> = {
  goal: "goal",
  saved: "shot-on-goal",
  missed: "missed-shot",
  blocked: "blocked-shot",
};

/** Converts hokej.cz shots into the common ShotEvent shape used by charts. */
export function hokejczShotsToEvents(shots: HokejczShotXg[], homeTeamId: string, awayTeamId: string): ShotEvent[] {
  return shots.map((s) => ({
    seq: s.id,
    period: s.period,
    periodSeconds: s.periodSeconds,
    type: TYPE[s.result],
    teamId: s.isHome ? homeTeamId : awayTeamId,
    shooterId: s.playerId ? String(s.playerId) : null,
    shooterName: s.name || null,
    goalieId: null,
    x: s.x,
    y: s.y,
    shotType: null,
    situationCode: null,
    strength: s.strength,
    xg: s.xg,
  }));
}

/** Cumulative xG per team over game time, for the "xG flow" chart. */
export function xgFlow(shots: ShotEvent[], homeTeamId: string) {
  let h = 0;
  let a = 0;
  const points: { t: number; home: number; away: number; goal: "home" | "away" | null }[] = [{ t: 0, home: 0, away: 0, goal: null }];
  for (const s of [...shots].sort((x, y) => x.period * 1200 + x.periodSeconds - (y.period * 1200 + y.periodSeconds))) {
    const t = (s.period - 1) * 1200 + s.periodSeconds;
    const isHome = s.teamId === homeTeamId;
    if (isHome) h += s.xg ?? 0;
    else a += s.xg ?? 0;
    points.push({ t, home: h, away: a, goal: s.type === "goal" ? (isHome ? "home" : "away") : null });
  }
  return points;
}
