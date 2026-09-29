import type { Game } from "./types.ts";

const WINDOW_MS = 3 * 60 * 60 * 1000;

/** eSports abbreviations that differ from the NHL API. */
const NHL_ABBREV_ALIASES: Record<string, string> = { VEG: "VGK" };
const norm = (abbrev: string) => NHL_ABBREV_ALIASES[abbrev] ?? abbrev;

/**
 * Enriches NHL API games with data only the eSports scoreboard carries (Tipsport odds,
 * onlajny id for live odds / bet distribution). Games are matched by team abbreviations
 * and start time.
 */
export function attachEsportsToNhl(nhlGames: Game[], esportsGames: Game[]): Game[] {
  const candidates = esportsGames.filter((g) => g.leagueKey === "nhl" || g.leagueKey === "nhl-pre");
  return nhlGames.map((g) => {
    const t = Date.parse(g.startAt);
    const near = candidates.filter((c) => Math.abs(Date.parse(c.startAt) - t) < WINDOW_MS);
    const match =
      near.find((c) => norm(c.home.abbrev) === g.home.abbrev && norm(c.away.abbrev) === g.away.abbrev) ??
      // Unknown abbreviation variant: accept one matching team if the start time is identical.
      near.find(
        (c) =>
          c.startAt === g.startAt && (norm(c.home.abbrev) === g.home.abbrev || norm(c.away.abbrev) === g.away.abbrev),
      );
    if (!match) return g;
    return {
      ...g,
      preOdds: match.preOdds,
      external: { ...g.external, onlajnyId: match.external.onlajnyId },
    };
  });
}

/** Scoreboard for a day: NHL from the official API, everything else from eSports. */
export function combineScoreboard(esportsGames: Game[], nhlGames: Game[] | null): Game[] {
  if (!nhlGames) return esportsGames;
  // The NHL API is authoritative for NHL games; drop the eSports copies to avoid duplicates.
  const rest = esportsGames.filter((g) => g.leagueKey !== "nhl" && g.leagueKey !== "nhl-pre");
  return [...attachEsportsToNhl(nhlGames, esportsGames), ...rest];
}
