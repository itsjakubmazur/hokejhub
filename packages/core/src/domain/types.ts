export type GameStatus =
  | "scheduled"
  | "live"
  | "intermission"
  | "final"
  | "postponed"
  | "cancelled";

/** How a finished game was decided. */
export type Decision = "REG" | "OT" | "SO";

export type Source = "esports" | "nhl";

export interface TeamRef {
  /** Stable id within our app, e.g. `onl-1602` or `nhl-13`. */
  id: string;
  name: string;
  shortName: string;
  abbrev: string;
  logoUrl: string | null;
}

export interface Odds1x2 {
  home: number | null;
  draw: number | null;
  away: number | null;
}

export interface Game {
  /** `cz-{onlajnyId}` for Czech sources, `nhl-{gameId}` for NHL API. */
  id: string;
  source: Source;
  leagueKey: string;
  leagueName: string;
  startAt: string; // ISO UTC
  status: GameStatus;
  /** Human-readable Czech status, e.g. "2. třetina", "po prodl.". */
  statusLabel: string;
  period: number | null;
  /** Game clock or elapsed minute as provided by the source. */
  clock: string | null;
  home: TeamRef;
  away: TeamRef;
  homeScore: number | null;
  awayScore: number | null;
  /** Per-period goals [home, away]. */
  periods: [number, number][];
  decidedIn: Decision | null;
  series: string | null;
  preOdds: Odds1x2 | null;
  external: {
    onlajnyId?: number;
    hokejczId?: number;
    nhlId?: number;
  };
}

export interface BetDistributionSide {
  pct: number;
  odds: number | null;
  prevOdds: number | null;
  tickets: number | null;
}

export interface BetDistribution {
  home: BetDistributionSide;
  draw: BetDistributionSide;
  away: BetDistributionSide;
  topBets: { name: string; odds: number | null; tickets: number | null }[];
}

export interface ShotEvent {
  seq: number;
  period: number;
  /** Seconds elapsed in the period. */
  periodSeconds: number;
  type: "goal" | "shot-on-goal" | "missed-shot" | "blocked-shot";
  teamId: string;
  shooterId: string | null;
  goalieId: string | null;
  /** Normalised so the shooting team always attacks towards +x (x in feet, -100..100). */
  x: number | null;
  y: number | null;
  shotType: string | null;
  situationCode: string | null;
}
