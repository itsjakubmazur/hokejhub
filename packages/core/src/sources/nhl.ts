import { z } from "zod";
import { getLeague } from "../domain/leagues.ts";
import type { Decision, Game, GameStatus, ShotEvent, TeamRef } from "../domain/types.ts";

export const NHL_ATTRIBUTION = "Data © NHL";

const WEB = "https://api-web.nhle.com/v1";

export const nhlUrls = {
  score: (date: string) => `${WEB}/score/${date}`,
  schedule: (date: string) => `${WEB}/schedule/${date}`,
  landing: (gameId: number) => `${WEB}/gamecenter/${gameId}/landing`,
  boxscore: (gameId: number) => `${WEB}/gamecenter/${gameId}/boxscore`,
  playByPlay: (gameId: number) => `${WEB}/gamecenter/${gameId}/play-by-play`,
  standings: (date: string | "now") => `${WEB}/standings/${date}`,
  roster: (team: string, season: string | "current") => `${WEB}/roster/${team}/${season}`,
  player: (playerId: number) => `${WEB}/player/${playerId}/landing`,
};

const localized = z.object({ default: z.string() }).passthrough();

const periodDescriptor = z.object({
  number: z.number(),
  periodType: z.string(),
});

const scoreTeam = z.object({
  id: z.number(),
  name: localized.optional(),
  commonName: localized.optional(),
  placeName: localized.optional(),
  abbrev: z.string(),
  score: z.number().optional(),
  sog: z.number().optional(),
  logo: z.string().optional(),
});

const scoreGame = z.object({
  id: z.number(),
  gameType: z.number(),
  startTimeUTC: z.string(),
  gameState: z.string(),
  gameScheduleState: z.string().optional(),
  awayTeam: scoreTeam,
  homeTeam: scoreTeam,
  clock: z
    .object({ timeRemaining: z.string(), inIntermission: z.boolean().optional() })
    .optional(),
  period: z.number().optional(),
  periodDescriptor: periodDescriptor.optional(),
  gameOutcome: z.object({ lastPeriodType: z.string() }).optional(),
  seriesStatus: z
    .object({ seriesAbbrev: z.string().optional(), topSeedWins: z.number(), bottomSeedWins: z.number() })
    .partial()
    .optional(),
  goals: z
    .array(z.object({ period: z.number(), teamAbbrev: z.string() }))
    .optional(),
});

const scoreResponse = z.object({ games: z.array(scoreGame) });

type NhlScoreGame = z.infer<typeof scoreGame>;

function toTeam(t: z.infer<typeof scoreTeam>): TeamRef {
  const common = t.commonName?.default ?? t.name?.default ?? t.abbrev;
  const full = t.placeName ? `${t.placeName.default} ${common}` : common;
  return {
    id: `nhl-${t.id}`,
    name: full,
    shortName: common,
    abbrev: t.abbrev,
    logoUrl: t.logo ?? null,
  };
}

function decision(lastPeriodType: string | undefined): Decision | null {
  if (!lastPeriodType) return null;
  if (lastPeriodType === "OT") return "OT";
  if (lastPeriodType === "SO") return "SO";
  return "REG";
}

export function mapNhlStatus(g: Pick<NhlScoreGame, "gameState" | "gameScheduleState" | "clock">): GameStatus {
  if (g.gameScheduleState === "PPD") return "postponed";
  if (g.gameScheduleState === "CNCL") return "cancelled";
  switch (g.gameState) {
    case "LIVE":
    case "CRIT":
      return g.clock?.inIntermission ? "intermission" : "live";
    case "OFF":
    case "FINAL":
      return "final";
    default:
      return "scheduled";
  }
}

function lastPeriodType(g: NhlScoreGame): string | undefined {
  return g.gameOutcome?.lastPeriodType ?? g.periodDescriptor?.periodType;
}

function periodLabel(n: number, type: string): string {
  if (type === "SO") return "nájezdy";
  if (type === "OT") return n > 4 ? `${n - 3}. prodloužení` : "prodloužení";
  return `${n}. třetina`;
}

function statusLabel(status: GameStatus, g: NhlScoreGame): string {
  const pd = g.periodDescriptor;
  switch (status) {
    case "scheduled":
      return "před zápasem";
    case "postponed":
      return "odloženo";
    case "cancelled":
      return "zrušeno";
    case "final": {
      const d = decision(lastPeriodType(g));
      return d === "OT" ? "po prodl." : d === "SO" ? "po s.n." : "konec";
    }
    case "intermission":
      return pd ? `po ${pd.number}. třetině` : "přestávka";
    case "live":
      return pd ? periodLabel(pd.number, pd.periodType) : "live";
  }
}

function periodsFromGoals(g: NhlScoreGame): [number, number][] {
  if (!g.goals) return [];
  const max = Math.max(3, g.periodDescriptor?.number ?? 3, ...g.goals.map((x) => x.period));
  const out: [number, number][] = Array.from({ length: max }, () => [0, 0]);
  for (const goal of g.goals) {
    const row = out[goal.period - 1];
    if (!row) continue;
    if (goal.teamAbbrev === g.homeTeam.abbrev) row[0]++;
    else row[1]++;
  }
  // Shootout "goals" are not real goals; the winner gets +1 in the final score only.
  return g.periodDescriptor?.periodType === "SO" ? out.slice(0, 4) : out;
}

export function toNhlGame(g: NhlScoreGame): Game {
  const status = mapNhlStatus(g);
  const leagueKey = g.gameType === 1 ? "nhl-pre" : "nhl";
  const started = status === "live" || status === "intermission" || status === "final";
  return {
    id: `nhl-${g.id}`,
    source: "nhl",
    leagueKey,
    leagueName: getLeague(leagueKey).name,
    startAt: new Date(g.startTimeUTC).toISOString(),
    status,
    statusLabel: statusLabel(status, g),
    period: started ? (g.periodDescriptor?.number ?? g.period ?? null) : null,
    clock: status === "live" || status === "intermission" ? (g.clock?.timeRemaining ?? null) : null,
    home: toTeam(g.homeTeam),
    away: toTeam(g.awayTeam),
    homeScore: started ? (g.homeTeam.score ?? 0) : null,
    awayScore: started ? (g.awayTeam.score ?? 0) : null,
    periods: started ? periodsFromGoals(g) : [],
    decidedIn: status === "final" ? decision(lastPeriodType(g)) : null,
    series: g.seriesStatus?.seriesAbbrev
      ? `${g.seriesStatus.topSeedWins ?? 0}:${g.seriesStatus.bottomSeedWins ?? 0}`
      : null,
    preOdds: null,
    external: { nhlId: g.id },
  };
}

export function parseNhlScore(json: unknown): Game[] {
  return scoreResponse.parse(json).games.map(toNhlGame);
}

// ---------- play-by-play ----------

const SHOT_TYPES = new Set(["goal", "shot-on-goal", "missed-shot", "blocked-shot"]);

const play = z.object({
  eventId: z.number(),
  sortOrder: z.number(),
  periodDescriptor: periodDescriptor,
  timeInPeriod: z.string(),
  situationCode: z.string().optional(),
  homeTeamDefendingSide: z.string().optional(),
  typeDescKey: z.string(),
  details: z
    .object({
      xCoord: z.number().optional(),
      yCoord: z.number().optional(),
      zoneCode: z.string().optional(),
      shotType: z.string().optional(),
      eventOwnerTeamId: z.number().optional(),
      shootingPlayerId: z.number().optional(),
      scoringPlayerId: z.number().optional(),
      goalieInNetId: z.number().optional(),
    })
    .passthrough()
    .optional(),
});

const pbpResponse = z.object({
  id: z.number(),
  homeTeam: z.object({ id: z.number() }).passthrough(),
  awayTeam: z.object({ id: z.number() }).passthrough(),
  plays: z.array(play),
});

function mmssToSeconds(s: string): number {
  const [m, sec] = s.split(":").map(Number);
  return (m ?? 0) * 60 + (sec ?? 0);
}

/**
 * Extracts shot attempts from NHL play-by-play and normalises coordinates so that the
 * shooting team always attacks towards +x.
 */
export function parseNhlShots(json: unknown): ShotEvent[] {
  const pbp = pbpResponse.parse(json);
  const homeId = pbp.homeTeam.id;
  const out: ShotEvent[] = [];
  for (const p of pbp.plays) {
    if (!SHOT_TYPES.has(p.typeDescKey) || !p.details) continue;
    const d = p.details;
    const ownerId = d.eventOwnerTeamId;
    if (ownerId === undefined) continue;
    // For blocked shots the event owner is the blocking team in newer feeds; the shooter's
    // team is the other one.
    const shootingTeamId =
      p.typeDescKey === "blocked-shot" && d.shootingPlayerId === undefined
        ? ownerId === homeId
          ? pbp.awayTeam.id
          : homeId
        : ownerId;
    let x = d.xCoord ?? null;
    let y = d.yCoord ?? null;
    if (x !== null && y !== null) {
      const isHome = shootingTeamId === homeId;
      let flip: boolean;
      if (p.homeTeamDefendingSide === "left" || p.homeTeamDefendingSide === "right") {
        const homeAttacksRight = p.homeTeamDefendingSide === "left";
        flip = isHome ? !homeAttacksRight : homeAttacksRight;
      } else {
        flip = (d.zoneCode === "O" && x < 0) || (d.zoneCode === "D" && x > 0);
      }
      if (flip) {
        x = -x;
        y = -y;
      }
    }
    out.push({
      seq: p.sortOrder,
      period: p.periodDescriptor.number,
      periodSeconds: mmssToSeconds(p.timeInPeriod),
      type: p.typeDescKey as ShotEvent["type"],
      teamId: `nhl-${shootingTeamId}`,
      shooterId: (d.shootingPlayerId ?? d.scoringPlayerId)?.toString() ?? null,
      goalieId: d.goalieInNetId?.toString() ?? null,
      x,
      y,
      shotType: d.shotType ?? null,
      situationCode: p.situationCode ?? null,
    });
  }
  return out;
}

const rosterSpot = z.object({
  teamId: z.number(),
  playerId: z.number(),
  firstName: localized,
  lastName: localized,
  sweaterNumber: z.number().optional(),
  positionCode: z.string().optional(),
  headshot: z.string().optional(),
});

export interface NhlPlayerRef {
  id: string;
  teamId: string;
  name: string;
  number: number | null;
  position: string | null;
  headshot: string | null;
}

/** Players listed in a play-by-play response, keyed by player id. */
export function parseNhlRoster(json: unknown): Map<string, NhlPlayerRef> {
  const spots = z.object({ rosterSpots: z.array(rosterSpot) }).parse(json).rosterSpots;
  return new Map(
    spots.map((s) => [
      String(s.playerId),
      {
        id: String(s.playerId),
        teamId: `nhl-${s.teamId}`,
        name: `${s.firstName.default} ${s.lastName.default}`,
        number: s.sweaterNumber ?? null,
        position: s.positionCode ?? null,
        headshot: s.headshot ?? null,
      },
    ]),
  );
}

// ---------- landing ----------

const landingGoal = z.object({
  situationCode: z.string().optional(),
  strength: z.string().optional(),
  playerId: z.number().optional(),
  name: localized.optional(),
  teamAbbrev: z.union([localized, z.string()]),
  timeInPeriod: z.string(),
  homeScore: z.number(),
  awayScore: z.number(),
  goalModifier: z.string().optional(),
  highlightClipSharingUrl: z.string().optional(),
  assists: z.array(z.object({ playerId: z.number(), name: localized })).optional(),
});

const landingResponse = scoreGame.extend({
  summary: z
    .object({
      scoring: z.array(z.object({ periodDescriptor: periodDescriptor, goals: z.array(landingGoal) })),
    })
    .passthrough()
    .optional(),
});

export interface GoalSummary {
  period: number;
  periodType: string;
  time: string;
  teamAbbrev: string;
  scorer: string;
  scorerId: string | null;
  assists: string[];
  strength: string | null;
  homeScore: number;
  awayScore: number;
  videoUrl: string | null;
}

export function parseNhlGoals(json: unknown): GoalSummary[] {
  const d = landingResponse.parse(json);
  return (d.summary?.scoring ?? []).flatMap((p) =>
    p.goals.map((g) => ({
      period: p.periodDescriptor.number,
      periodType: p.periodDescriptor.periodType,
      time: g.timeInPeriod,
      teamAbbrev: typeof g.teamAbbrev === "string" ? g.teamAbbrev : g.teamAbbrev.default,
      scorer: g.name?.default ?? "?",
      scorerId: g.playerId?.toString() ?? null,
      assists: (g.assists ?? []).map((a) => a.name.default),
      strength: g.strength ?? null,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
      videoUrl: g.highlightClipSharingUrl ?? null,
    })),
  );
}

/** Parses `/gamecenter/{id}/landing` into a Game (per-period goals derived from the scoring summary). */
export function parseNhlLanding(json: unknown): Game {
  const d = landingResponse.parse(json);
  const goals = parseNhlGoals(json)
    .filter((g) => g.periodType !== "SO")
    .map((g) => ({ period: g.period, teamAbbrev: g.teamAbbrev }));
  return toNhlGame({ ...d, goals });
}
