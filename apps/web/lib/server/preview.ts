import { computeStandings, rulesForSeason, type FormResult } from "@hokejhub/core";
import { getLeagueGoalies, getSeasonGames, getTeam, getTeamSkaters, toResultGames } from "./queries";

export interface PreviewTeam {
  teamId: string;
  rank: number | null;
  teams: number;
  gp: number;
  pts: number;
  gf: number;
  ga: number;
  record: string;
  form: FormResult[];
  /** Home team at home / away team on the road. */
  venueRecord: { gp: number; pts: number; gf: number; ga: number } | null;
  last: { date: string; opponent: string; score: string; result: FormResult }[];
  leaders: { id: string; name: string; photo: string | null; gp: number; g: number; a: number; pts: number }[];
  goalie: { id: string; name: string; photo: string | null; gp: number; svPct: number | null; gaa: number | null } | null;
}

export interface ElhPreview {
  season: number;
  /** True when the current season is too young and figures come from the previous one. */
  previousSeason: boolean;
  home: PreviewTeam;
  away: PreviewTeam;
}

const seasonOf = (iso: string) => {
  const d = new Date(iso);
  return d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
};

/** Pre-game comparison of two extraliga teams from our database. */
export async function getElhPreview(homeId: string, awayId: string, startAt: string): Promise<ElhPreview | null> {
  let season = seasonOf(startAt);
  let rows = await getSeasonGames("cz-elh", season);
  let games = toResultGames(rows).filter((g) => g.startAt < startAt);
  const played = (id: string) => games.filter((g) => g.homeId === id || g.awayId === id).length;
  let previousSeason = false;
  if (played(homeId) < 3 || played(awayId) < 3) {
    season -= 1;
    previousSeason = true;
    rows = await getSeasonGames("cz-elh", season);
    games = toResultGames(rows);
  }
  if (games.length === 0) return null;
  const rules = rulesForSeason(season);
  const table = computeStandings(games, { rules });
  const homeSplit = computeStandings(games, { split: "home", rules });
  const awaySplit = computeStandings(games, { split: "away", rules });
  const [goalies, homeTeam, awayTeam, homeSk, awaySk] = await Promise.all([
    getLeagueGoalies("cz-elh", season),
    getTeam(homeId),
    getTeam(awayId),
    getTeamSkaters(homeId, season),
    getTeamSkaters(awayId, season),
  ]);

  const build = (id: string, venue: "home" | "away", skaters: typeof homeSk, abbrev: string | undefined): PreviewTeam => {
    const row = table.find((r) => r.teamId === id);
    const split = (venue === "home" ? homeSplit : awaySplit).find((r) => r.teamId === id);
    const mine = games.filter((g) => g.homeId === id || g.awayId === id).sort((a, b) => b.startAt.localeCompare(a.startAt));
    const g = goalies.filter((x) => x.team_abbrev === abbrev).sort((a, b) => b.gp - a.gp)[0];
    return {
      teamId: id,
      rank: row?.rank ?? null,
      teams: table.length,
      gp: row?.gp ?? 0,
      pts: row?.pts ?? 0,
      gf: row?.gf ?? 0,
      ga: row?.ga ?? 0,
      record: row ? (row.t ? `${row.w}-${row.otw}-${row.t}-${row.otl}-${row.l}` : `${row.w}-${row.otw}-${row.otl}-${row.l}`) : "",
      form: row?.form ?? [],
      venueRecord: split ? { gp: split.gp, pts: split.pts, gf: split.gf, ga: split.ga } : null,
      last: mine.slice(0, 5).map((m) => {
        const home = m.homeId === id;
        const res = row?.form ? computeStandings([m], { rules }).find((r) => r.teamId === id)?.form[0] ?? "L" : "L";
        return {
          date: m.startAt,
          opponent: home ? m.awayName : m.homeName,
          score: home ? `${m.homeScore}:${m.awayScore}` : `${m.awayScore}:${m.homeScore}`,
          result: res,
        };
      }),
      leaders: skaters.slice(0, 4).map((s) => ({ id: s.player_id, name: s.name, photo: s.headshot, gp: s.gp, g: s.g, a: s.a, pts: s.pts })),
      goalie: g ? { id: g.player_id, name: g.name, photo: g.headshot, gp: g.gp, svPct: g.sv_pct, gaa: g.gaa } : null,
    };
  };
  return {
    season,
    previousSeason,
    home: build(homeId, "home", homeSk, homeTeam?.abbrev),
    away: build(awayId, "away", awaySk, awayTeam?.abbrev),
  };
}
