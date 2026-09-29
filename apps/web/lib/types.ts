import type { BetDistribution, Game, GoalSummary, NhlPlayerRef, Odds1x2, ShotEvent } from "@hokejhub/core";
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
  shots: ShotEvent[] | null;
  goals: GoalSummary[] | null;
  players: Record<string, NhlPlayerRef> | null;
  sources: Record<string, SourceState>;
  fetchedAt: string;
}
