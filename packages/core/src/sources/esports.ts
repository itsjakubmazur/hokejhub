import { z } from "zod";
import { getLeague, leagueKeyFromEsports, leagueKeyFromName } from "../domain/leagues.ts";
import { pragueToUtcIso } from "../domain/time.ts";
import type { BetDistribution, Decision, Game, GameStatus, Odds1x2, TeamRef } from "../domain/types.ts";

/** Attribution shown wherever these data are rendered. */
export const ESPORTS_ATTRIBUTION = "Data: eSports.cz / onlajny.com, kurzy Tipsport";

export const esportsUrls = {
  scoreboard: (date: string) => `https://json.esports.cz/hokejcz/scoreboard/onlajny/${date}.json`,
  /** Older hokej.cz variant: ELH only, different ids and field names. Used as a fallback. */
  scoreboardAlt: (date: string) => `https://json.esports.cz/hokejcz/scoreboard/${date}.json`,
  liveOdds: () => "https://s3.eu-west-1.amazonaws.com/data.onlajny.com/odds/tipsport-live.json",
  ticketAnalysis: (year: number, onlajnyId: number) =>
    `https://s3-eu-west-1.amazonaws.com/data.onlajny.com/hockey/ticket-analysis/${year}/${onlajnyId}.json`,
  logo: (logoId: string) => `https://s3-eu-west-1.amazonaws.com/onlajny/team/logo/${logoId}`,
  hokejczMatch: (hokejczId: number) => `https://www.hokej.cz/zapas/${hokejczId}/`,
};

const num = z.union([z.number(), z.string(), z.null()]).optional();

const teamSchema = z.object({
  onlajny_id: z.number(),
  hokejcz_id: z.number().nullish(),
  name: z.string(),
  short_name: z.string().nullish(),
  shortcut: z.string().nullish(),
  logo_id: z.union([z.string(), z.number()]).nullish(),
});

const oddsSchema = z
  .object({ home_win: num, draw: num, away_win: num })
  .nullish();

const matchSchema = z.object({
  hokejcz_id: z.number().nullish(),
  onlajny_id: z.number(),
  date: z.string(),
  time: z.string().nullish(),
  home: teamSchema,
  visitor: teamSchema,
  score_home: num,
  score_visitor: num,
  score_period: z.array(z.string()).nullish(),
  match_last_time: z.string().nullish(),
  match_actual_time_alias: z.string().nullish(),
  match_actual_time_name: z.string().nullish(),
  match_status: z.string(),
  series: z.string().nullish(),
  bets: z.object({ tipsport: oddsSchema }).partial().nullish(),
});

export const scoreboardSchema = z.record(
  z.string(),
  z.object({ league_name: z.string(), matches: z.array(matchSchema) }),
);

export type EsportsScoreboard = z.infer<typeof scoreboardSchema>;
type EsportsMatch = z.infer<typeof matchSchema>;

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toOdds(o: z.infer<typeof oddsSchema>): Odds1x2 | null {
  if (!o) return null;
  const odds = { home: toNum(o.home_win), draw: toNum(o.draw), away: toNum(o.away_win) };
  return odds.home === null && odds.draw === null && odds.away === null ? null : odds;
}

function toTeam(t: z.infer<typeof teamSchema>): TeamRef {
  return {
    id: `onl-${t.onlajny_id}`,
    name: t.name,
    shortName: t.short_name || t.name,
    abbrev: t.shortcut || (t.short_name ?? t.name).slice(0, 3).toUpperCase(),
    logoUrl: t.logo_id ? esportsUrls.logo(String(t.logo_id)) : null,
    ...(t.hokejcz_id ? { hokejczClubId: t.hokejcz_id } : {}),
  };
}

/**
 * Maps eSports status fields to our status. Observed values:
 * status `před zápasem|live|po zápase|zrušeno`, alias `0`, `1`..`3`, `1P`/`2P` (break),
 * `K` (regulation), `KP` (after OT), `KN` (after shootout), `XO` (postponed), `XZ` (cancelled).
 */
export function mapEsportsStatus(
  status: string,
  alias: string | null | undefined,
): { status: GameStatus; period: number | null; decidedIn: Decision | null } {
  const a = (alias ?? "").toUpperCase();
  switch (status) {
    case "před zápasem":
      return { status: "scheduled", period: null, decidedIn: null };
    case "po zápase":
      return {
        status: "final",
        period: null,
        decidedIn: a === "KP" ? "OT" : a === "KN" ? "SO" : "REG",
      };
    case "zrušeno":
      return { status: a === "XO" ? "postponed" : "cancelled", period: null, decidedIn: null };
    case "live": {
      const breakMatch = /^(\d)P$/.exec(a);
      if (breakMatch) return { status: "intermission", period: Number(breakMatch[1]), decidedIn: null };
      const p = Number.parseInt(a, 10);
      if (Number.isFinite(p) && p > 0) return { status: "live", period: p, decidedIn: null };
      // Overtime / shootout aliases are not yet observed; treat as period 4.
      return { status: "live", period: 4, decidedIn: null };
    }
    default:
      return { status: "scheduled", period: null, decidedIn: null };
  }
}

function parsePeriods(periods: string[] | null | undefined): [number, number][] {
  return (periods ?? [])
    .map((p) => p.split(":").map((x) => Number.parseInt(x, 10)))
    .filter((p): p is [number, number] => p.length === 2 && p.every(Number.isFinite));
}

function toGame(leagueId: string, leagueName: string, m: EsportsMatch, leagueKeyOverride?: string): Game {
  const leagueKey = leagueKeyOverride ?? leagueKeyFromEsports(leagueId);
  const s = mapEsportsStatus(m.match_status, m.match_actual_time_alias);
  const scored = s.status !== "scheduled" && s.status !== "postponed" && s.status !== "cancelled";
  return {
    id: `cz-${m.onlajny_id}`,
    source: "esports",
    leagueKey,
    leagueName: getLeague(leagueKey, leagueName).name,
    startAt: pragueToUtcIso(m.date, m.time ?? "00:00"),
    status: s.status,
    statusLabel: m.match_actual_time_name || m.match_status,
    period: s.period,
    clock: m.match_last_time || null,
    home: toTeam(m.home),
    away: toTeam(m.visitor),
    homeScore: scored ? toNum(m.score_home) : null,
    awayScore: scored ? toNum(m.score_visitor) : null,
    periods: scored ? parsePeriods(m.score_period) : [],
    decidedIn: s.decidedIn,
    series: m.series || null,
    preOdds: toOdds(m.bets?.tipsport),
    external: {
      onlajnyId: m.onlajny_id,
      ...(m.hokejcz_id ? { hokejczId: m.hokejcz_id } : {}),
    },
  };
}

export function parseScoreboard(json: unknown): Game[] {
  const data = scoreboardSchema.parse(json);
  return Object.entries(data).flatMap(([leagueId, league]) =>
    league.matches.map((m) => toGame(leagueId, league.league_name, m)),
  );
}

const altTeamSchema = teamSchema.omit({ logo_id: true });

const altMatchSchema = matchSchema
  .omit({ score_period: true, home: true, visitor: true, match_last_time: true })
  .extend({
    home: altTeamSchema,
    visitor: altTeamSchema,
    score_periods: z.array(z.string()).nullish(),
  });

const altScoreboardSchema = z.record(
  z.string(),
  z.object({ league_name: z.string(), matches: z.array(altMatchSchema) }),
);

/**
 * Parses the `/hokejcz/scoreboard/{date}.json` variant. Its league ids clash with the onlajny
 * variant (e.g. `101` is ELH here but NHL there), so leagues are resolved by name. Dates are
 * `DD-MM-YYYY`; team `hokejcz_id` is filled in.
 */
export function parseScoreboardAlt(json: unknown): Game[] {
  const data = altScoreboardSchema.parse(json);
  return Object.entries(data).flatMap(([leagueId, league]) => {
    const key = leagueKeyFromName(league.league_name) ?? `es-alt-${leagueId}`;
    return league.matches.map((m) => {
      const [d, mo, y] = m.date.split("-");
      const date = m.date.length === 10 && m.date[2] === "-" ? `${y}-${mo}-${d}` : m.date;
      return toGame(
        leagueId,
        league.league_name,
        {
          ...m,
          date,
          score_period: m.score_periods,
          match_last_time: null,
          home: { ...m.home, logo_id: String(m.home.onlajny_id) },
          visitor: { ...m.visitor, logo_id: String(m.visitor.onlajny_id) },
        },
        key,
      );
    });
  });
}

const liveOddsSchema = z.object({
  matches: z.record(z.string(), z.object({ home_win: num, draw: num, away_win: num })),
});

/** Returns live Tipsport odds keyed by onlajny id. */
export function parseLiveOdds(json: unknown): Map<number, Odds1x2> {
  const data = liveOddsSchema.parse(json);
  const out = new Map<number, Odds1x2>();
  for (const [id, o] of Object.entries(data.matches)) {
    const odds = toOdds(o);
    if (odds) out.set(Number(id), odds);
  }
  return out;
}

const sideSchema = z.object({
  procenta: num,
  kurz_soucasny: num,
  kurz_predchozi: num,
  pocet_tiketu: num,
});

const ticketAnalysisSchema = z.object({
  // Any side may be missing when nobody bet on it.
  rozlozeni_vkladu: z.object({
    domaci: sideSchema.optional(),
    remiza: sideSchema.optional(),
    hoste: sideSchema.optional(),
  }),
  nejsazenejsi_tipy: z
    .array(z.object({ nazev: z.string(), kurz: num, pocet_tiketu: num }))
    .nullish(),
});

export function parseTicketAnalysis(json: unknown): BetDistribution {
  const d = ticketAnalysisSchema.parse(json);
  const side = (s: z.infer<typeof sideSchema> | undefined) => ({
    pct: toNum(s?.procenta) ?? 0,
    odds: toNum(s?.kurz_soucasny),
    prevOdds: toNum(s?.kurz_predchozi),
    tickets: toNum(s?.pocet_tiketu) ?? (s ? null : 0),
  });
  return {
    home: side(d.rozlozeni_vkladu.domaci),
    draw: side(d.rozlozeni_vkladu.remiza),
    away: side(d.rozlozeni_vkladu.hoste),
    topBets: (d.nejsazenejsi_tipy ?? []).map((t) => ({
      name: t.nazev,
      odds: toNum(t.kurz),
      tickets: toNum(t.pocet_tiketu),
    })),
  };
}
