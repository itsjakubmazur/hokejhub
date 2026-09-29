import type {
  BetDistribution,
  Game,
  GoalSummary,
  HokejczMatch,
  MatchLineups,
  MatchPeriodStats,
  PlayerMatchStats,
  NhlPlayerRef,
  Odds1x2,
  ShotEvent,
} from "@hokejhub/core";
import type { SourceState } from "./server/fetcher";

export interface ScoreboardResponse {
  date: string;
  games: Game[];
  /** Live Tipsport odds keyed by onlajny id. */
  liveOdds: Record<string, Odds1x2>;
  /** Pre-game model 1X2 (60 min) for extraliga games, keyed by game id. */
  predictions?: Record<string, { home: number; draw: number; away: number }>;
  sources: Record<string, SourceState>;
  fetchedAt: string;
}

export interface GameDetailResponse {
  game: Game;
  liveOdds: Odds1x2 | null;
  bets: BetDistribution | null;
  /** hokej.cz box score (Czech leagues). */
  box: HokejczMatch | null;
  /** Shot attempts with coordinates and xG (NHL play-by-play or hokej.cz shot feed). */
  shots: ShotEvent[] | null;
  lineups: MatchLineups | null;
  periodStats: MatchPeriodStats | null;
  playerStats: { home: PlayerMatchStats[]; away: PlayerMatchStats[] } | null;
  faceoffZones: { home: number[]; away: number[] } | null;
  /** Pre-game model prediction (Elo → Poisson). */
  prediction: (import("@hokejhub/core").MatchProbabilities & { homeElo: number; awayElo: number }) | null;
  /** Text commentary, newest first. */
  commentary: import("@hokejhub/core").Comment[] | null;
  /** Anchor for the running game clock (live games). */
  clock: import("@hokejhub/core").ClockAnchor | null;
  /** Our database team ids (links to team pages) when known. */
  teamIds: { home: string; away: string } | null;
  /** Previous meetings of the two teams, newest first. */
  h2h: import("./server/queries").GameRowDb[] | null;
  /** hcz player id → photo URL. */
  photos: Record<string, string> | null;
  insights: {
    home: Awaited<ReturnType<typeof import("./server/queries").getTeamStreaks>>;
    away: Awaited<ReturnType<typeof import("./server/queries").getTeamStreaks>>;
    notes: import("./server/queries").PlayerNote[];
    reached: { player_id: string; name: string; headshot: string | null; team_id: string; kind: string; value: number }[];
  } | null;
  goals: GoalSummary[] | null;
  players: Record<string, NhlPlayerRef> | null;
  sources: Record<string, SourceState>;
  fetchedAt: string;
}
