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
  /** Our database team ids (links to team pages) when known. */
  teamIds: { home: string; away: string } | null;
  /** Previous meetings of the two teams, newest first. */
  h2h: import("./server/queries").GameRowDb[] | null;
  goals: GoalSummary[] | null;
  players: Record<string, NhlPlayerRef> | null;
  sources: Record<string, SourceState>;
  fetchedAt: string;
}
