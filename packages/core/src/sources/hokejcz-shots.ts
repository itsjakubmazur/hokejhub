import { z } from "zod";
import { expectedGoal, strengthAt, type PenaltyWindow, type Strength } from "../model/xg.ts";

/** hokej.cz shot & faceoff feed used by its "Vizualizace: střely" widget. */
export const hokejczShotsUrl = (matchId: number) =>
  `https://s3-eu-west-1.amazonaws.com/hokej.cz/visualization/shots/${matchId}.json`;

export type HokejczShotResult = "goal" | "saved" | "missed" | "blocked";

const RESULT: Record<number, HokejczShotResult> = { 1: "saved", 2: "missed", 3: "blocked", 4: "goal" };

export interface HokejczShot {
  id: number;
  playerId: number | null;
  jersey: number | null;
  name: string;
  /** hokej.cz club id of the shooting team. */
  teamClubId: number;
  isHome: boolean;
  result: HokejczShotResult;
  /** Seconds elapsed since the start of the game. */
  elapsed: number;
  period: number;
  periodSeconds: number;
  /**
   * Normalised coordinates in feet: the shooting team always attacks towards +x, the goal line
   * sits at x ≈ 89, y is across the rink (±42.5). Same convention as NHL shots in this app.
   */
  x: number;
  y: number;
}

export interface HokejczShotFeed {
  matchId: number;
  homeClubId: number;
  awayClubId: number;
  shots: HokejczShot[];
  /** Faceoff win % per zone for each team, as published ([defensive?, neutral, offensive?]). */
  faceoffZones: { home: number[]; away: number[] } | null;
}

const schema = z.object({
  match: z.object({
    id: z.union([z.string(), z.number()]),
    home_id: z.number(),
    visitor_id: z.number(),
    shots: z
      .array(
        z.object({
          id: z.number(),
          player_id: z.number().nullish(),
          jersey: z.number().nullish(),
          first_name: z.string().nullish(),
          last_name: z.string().nullish(),
          team_id: z.number(),
          match_shot_resutl_id: z.number(),
          time: z.number(),
          coordinate_x: z.number(),
          coordinate_y: z.number(),
        }),
      )
      .default([]),
    faceoffs: z.object({ home: z.array(z.number()), visitor: z.array(z.number()) }).nullish(),
  }),
});

/** Raw y is a percentage of the half-width (±100 → ±42.5 ft); raw x is already ~feet. */
const Y_SCALE = 42.5 / 100;

export function parseHokejczShots(json: unknown): HokejczShotFeed {
  const { match } = schema.parse(json);
  const shots = match.shots
    .filter((s) => RESULT[s.match_shot_resutl_id])
    .map((s) => {
      const isHome = s.team_id === match.home_id;
      // The feed draws home attacking +x and visitors attacking −x; flip visitors.
      const sign = isHome ? 1 : -1;
      const period = Math.min(Math.floor(s.time / 1200) + 1, 4);
      return {
        id: s.id,
        playerId: s.player_id ?? null,
        jersey: s.jersey ?? null,
        name: [s.first_name, s.last_name].filter(Boolean).join(" "),
        teamClubId: s.team_id,
        isHome,
        result: RESULT[s.match_shot_resutl_id]!,
        elapsed: s.time,
        period,
        periodSeconds: s.time - (period - 1) * 1200,
        x: sign * s.coordinate_x,
        y: sign * s.coordinate_y * Y_SCALE,
      };
    })
    .sort((a, b) => a.elapsed - b.elapsed || a.id - b.id);
  return {
    matchId: Number(match.id),
    homeClubId: match.home_id,
    awayClubId: match.visitor_id,
    shots,
    faceoffZones: match.faceoffs ? { home: match.faceoffs.home, away: match.faceoffs.visitor } : null,
  };
}


export interface HokejczShotXg extends HokejczShot {
  strength: Strength;
  /** Expected goals; 0 for blocked attempts (xG is defined for unblocked attempts only). */
  xg: number;
}

function elapsedFromClock(time: string): number | null {
  const m = /^(\d+):(\d{2})$/.exec(time.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Penalty windows from hokej.cz match penalties (times are game-elapsed "mm:ss"). */
export function penaltyWindows(
  penalties: { time: string; team: string; minutes: number | null }[],
  homeAbbrev: string,
): PenaltyWindow[] {
  return penalties
    .map((p) => ({ start: elapsedFromClock(p.time), isHome: p.team === homeAbbrev, minutes: p.minutes ?? 0 }))
    .filter((p): p is PenaltyWindow => p.start !== null);
}

export function shotsWithXg(feed: HokejczShotFeed, penalties: PenaltyWindow[]): HokejczShotXg[] {
  const lastUnblocked = new Map<boolean, number>();
  return feed.shots.map((s) => {
    const strength = strengthAt(s.elapsed, s.isHome, penalties);
    let xg = 0;
    if (s.result !== "blocked") {
      const prev = lastUnblocked.get(s.isHome);
      xg = expectedGoal({
        x: s.x,
        y: s.y,
        sincePrevSameTeam: prev !== undefined ? s.elapsed - prev : null,
        strength,
      });
      lastUnblocked.set(s.isHome, s.elapsed);
    }
    return { ...s, strength, xg };
  });
}
