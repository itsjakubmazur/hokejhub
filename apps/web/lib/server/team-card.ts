import { computeStandings, nhlUrls, rulesForSeason, seasonOf, type FormResult } from "@hokejhub/core";
import { dbAvailable } from "./db";
import { fetchJson } from "./fetcher";
import { getSeasonGames, toResultGames } from "./queries";

/** A team's standing going into a game, for the match header. */
export interface TeamCard {
  rank: number;
  of: number;
  scope: string;
  pts: number;
  gp: number;
  w: number;
  otw: number;
  otl: number;
  l: number;
  gf: number;
  ga: number;
  /** Last five results, most recent first (extraliga). */
  form: FormResult[] | null;
  /** "W3" style streak and last-10 record (NHL). */
  streak: string | null;
  last10: string | null;
}

/** Extraliga table computed from our database with the games played before this one. */
export async function elhTeamCards(homeId: string, awayId: string, startAt: string): Promise<{ home: TeamCard; away: TeamCard } | null> {
  if (!dbAvailable()) return null;
  const season = seasonOf(startAt);
  const rows = await getSeasonGames("cz-elh", season, "regular");
  const games = toResultGames(rows).filter((g) => g.startAt < startAt);
  if (games.length === 0) return null;
  const table = computeStandings(games, { rules: rulesForSeason(season) });
  const card = (id: string): TeamCard | null => {
    const r = table.find((x) => x.teamId === id);
    return r
      ? { rank: r.rank, of: table.length, scope: "v tabulce", pts: r.pts, gp: r.gp, w: r.w, otw: r.otw, otl: r.otl, l: r.l, gf: r.gf, ga: r.ga, form: r.form.slice(0, 5), streak: null, last10: null }
      : null;
  };
  const home = card(homeId);
  const away = card(awayId);
  return home && away ? { home, away } : null;
}

interface NhlStandingRow {
  teamAbbrev: { default: string };
  leagueSequence: number;
  points: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  goalFor: number;
  goalAgainst: number;
  streakCode?: string;
  streakCount?: number;
  l10Wins: number;
  l10Losses: number;
  l10OtLosses: number;
}

/** NHL standings on the game date from the league API. */
export async function nhlTeamCards(date: string, homeAbbrev: string, awayAbbrev: string): Promise<{ home: TeamCard; away: TeamCard } | null> {
  const res = await fetchJson(nhlUrls.standings(date), (j) => ((j as { standings?: NhlStandingRow[] }).standings ?? []), {
    revalidate: 3600,
    notFoundIsEmpty: true,
  });
  const list = res.data ?? [];
  if (list.length === 0) return null;
  const card = (abbrev: string): TeamCard | null => {
    const r = list.find((x) => x.teamAbbrev.default === abbrev);
    if (!r || r.gamesPlayed === 0) return null;
    return {
      rank: r.leagueSequence,
      of: list.length,
      scope: "v NHL",
      pts: r.points,
      gp: r.gamesPlayed,
      w: r.wins,
      otw: 0,
      otl: r.otLosses,
      l: r.losses,
      gf: r.goalFor,
      ga: r.goalAgainst,
      form: null,
      streak: r.streakCode && r.streakCount ? `${r.streakCode}${r.streakCount}` : null,
      last10: `${r.l10Wins}-${r.l10Losses}-${r.l10OtLosses}`,
    };
  };
  const home = card(homeAbbrev);
  const away = card(awayAbbrev);
  return home && away ? { home, away } : null;
}
