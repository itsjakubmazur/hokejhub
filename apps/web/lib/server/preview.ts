import { computeStandings, rulesForSeason, type FormResult } from "@hokejhub/core";
import { sql } from "./db";
import { getLeagueGoalies, getSeasonGames, getTeam, getTeamSkaters, toResultGames } from "./queries";
import { unstable_cache } from "next/cache";

// League-wide inputs shared by every game's preview: cached once for all of them.
const seasonGames = unstable_cache((league: string, season: number) => getSeasonGames(league, season), ["season-games-v1"], { revalidate: 600 });
const leagueGoalies = unstable_cache((league: string, season: number) => getLeagueGoalies(league, season), ["league-goalies-v1"], { revalidate: 600 });

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
  goalie: {
    id: string;
    name: string;
    photo: string | null;
    gp: number;
    svPct: number | null;
    gaa: number | null;
    wins: number;
    shutouts: number;
  } | null;
  /** Per-game team numbers from the stored box scores. */
  stats: { games: number; sfPg: number; saPg: number; ppPct: number | null; pkPct: number | null } | null;
  /** Team leaders in points, goals and assists. */
  top: {
    points: PreviewLeader | null;
    goals: PreviewLeader | null;
    assists: PreviewLeader | null;
  };
}

export interface PreviewLeader {
  id: string;
  name: string;
  photo: string | null;
  position: string | null;
  g: number;
  a: number;
  pts: number;
}

/** Shots and special teams per team from box-score team stats ([home, away] pairs). */
async function teamStats(season: number, before: string, ids: string[]) {
  const rows = await sql<{ team: string; games: number; sf: number; sa: number; ppg: number; ppo: number; ppga: number; pko: number }>(
    `with g as (
       select id, home_team_id, away_team_id, team_stats as ts from game
       where league_id = 'cz-elh' and season = $1 and phase = 'regular' and status = 'final' and start_at < $2
         and team_stats ? 'Střely na branku' and (home_team_id = any($3) or away_team_id = any($3))
     ),
     -- Power-play chances: minor/major penalties grouped by moment; offsetting ones cancel,
     -- several at once by one team count as a single power play.
     pen as (
       select e.game_id, e.payload->>'time' as t,
              count(*) filter (where e.team_id = g.home_team_id) as h,
              count(*) filter (where e.team_id = g.away_team_id) as a
       from game_event e join g on g.id = e.game_id
       where e.type = 'penalty' and (e.payload->>'minutes')::int in (2, 4, 5)
       group by 1, 2
     ),
     opp as (
       select game_id, count(*) filter (where a > h)::int as home_pp, count(*) filter (where h > a)::int as away_pp
       from pen group by game_id
     ),
     s as (
       select g.home_team_id as team, (ts->'Střely na branku'->>0)::int as sf, (ts->'Střely na branku'->>1)::int as sa,
              (ts->'Využití'->>0)::int as ppg, coalesce(o.home_pp, 0) as ppo, (ts->'Využití'->>1)::int as ppga, coalesce(o.away_pp, 0) as pko
       from g left join opp o on o.game_id = g.id
       union all
       select g.away_team_id, (ts->'Střely na branku'->>1)::int, (ts->'Střely na branku'->>0)::int,
              (ts->'Využití'->>1)::int, coalesce(o.away_pp, 0), (ts->'Využití'->>0)::int, coalesce(o.home_pp, 0)
       from g left join opp o on o.game_id = g.id
     )
     select team, count(*)::int as games, avg(sf)::float as sf, avg(sa)::float as sa,
            coalesce(sum(ppg), 0)::int as ppg, coalesce(sum(ppo), 0)::int as ppo, coalesce(sum(ppga), 0)::int as ppga, coalesce(sum(pko), 0)::int as pko
     from s where team = any($3) group by team`,
    [season, before, ids],
  );
  return new Map(
    rows.map((r) => [
      r.team,
      { games: r.games, sfPg: r.sf, saPg: r.sa, ppPct: r.ppo ? r.ppg / r.ppo : null, pkPct: r.pko ? 1 - r.ppga / r.pko : null },
    ]),
  );
}

/** Wins of a goalie in a season: games he played most of and his team won. */
async function goalieWins(playerId: string, season: number) {
  const [r] = await sql<{ wins: number }>(
    `select count(*)::int as wins from box_goalie b join game g on g.id = b.game_id
     where b.player_id = $1 and g.league_id = 'cz-elh' and g.season = $2 and g.phase = 'regular' and g.status = 'final'
       and coalesce(b.toi_s, 0) >= all (select coalesce(b2.toi_s, 0) from box_goalie b2 where b2.game_id = b.game_id and b2.team_id = b.team_id)
       and ((b.team_id = g.home_team_id and g.home_score > g.away_score) or (b.team_id = g.away_team_id and g.away_score > g.home_score))`,
    [playerId, season],
  );
  return r?.wins ?? 0;
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
  let rows = await seasonGames("cz-elh", season);
  let games = toResultGames(rows).filter((g) => g.startAt < startAt);
  const played = (id: string) => games.filter((g) => g.homeId === id || g.awayId === id).length;
  let previousSeason = false;
  if (played(homeId) < 3 || played(awayId) < 3) {
    season -= 1;
    previousSeason = true;
    rows = await seasonGames("cz-elh", season);
    games = toResultGames(rows);
  }
  if (games.length === 0) return null;
  const rules = rulesForSeason(season);
  const table = computeStandings(games, { rules });
  const homeSplit = computeStandings(games, { split: "home", rules });
  const awaySplit = computeStandings(games, { split: "away", rules });
  const [goalies, homeTeam, awayTeam, homeSk, awaySk, stats] = await Promise.all([
    leagueGoalies("cz-elh", season),
    getTeam(homeId),
    getTeam(awayId),
    getTeamSkaters(homeId, season),
    getTeamSkaters(awayId, season),
    teamStats(season, previousSeason ? `${season + 1}-07-01` : startAt, [homeId, awayId]).catch(() => new Map()),
  ]);
  const pickGoalie = (abbrev: string | undefined) => goalies.filter((x) => x.team_abbrev === abbrev).sort((a, b) => b.gp - a.gp)[0];
  const [homeWins, awayWins] = await Promise.all(
    [homeTeam?.abbrev, awayTeam?.abbrev].map((ab) => {
      const g = pickGoalie(ab);
      return g ? goalieWins(g.player_id, season).catch(() => 0) : Promise.resolve(0);
    }),
  );
  const leader = (list: typeof homeSk, key: "pts" | "g" | "a") => {
    const r = [...list].sort((a, b) => b[key] - a[key] || b.pts - a.pts)[0];
    return r && r[key] > 0 ? { id: r.player_id, name: r.name, photo: r.headshot, position: r.position, g: r.g, a: r.a, pts: r.pts } : null;
  };

  const build = (id: string, venue: "home" | "away", skaters: typeof homeSk, abbrev: string | undefined, wins: number): PreviewTeam => {
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
        const res = row?.form ? (computeStandings([m], { rules }).find((r) => r.teamId === id)?.form[0] ?? "L") : "L";
        return {
          date: m.startAt,
          opponent: home ? m.awayName : m.homeName,
          score: home ? `${m.homeScore}:${m.awayScore}` : `${m.awayScore}:${m.homeScore}`,
          result: res,
        };
      }),
      leaders: skaters.slice(0, 4).map((s) => ({ id: s.player_id, name: s.name, photo: s.headshot, gp: s.gp, g: s.g, a: s.a, pts: s.pts })),
      goalie: g ? { id: g.player_id, name: g.name, photo: g.headshot, gp: g.gp, svPct: g.sv_pct, gaa: g.gaa, wins, shutouts: g.shutouts } : null,
      stats: stats.get(id) ?? null,
      top: { points: leader(skaters, "pts"), goals: leader(skaters, "g"), assists: leader(skaters, "a") },
    };
  };
  return {
    season,
    previousSeason,
    home: build(homeId, "home", homeSk, homeTeam?.abbrev, homeWins),
    away: build(awayId, "away", awaySk, awayTeam?.abbrev, awayWins),
  };
}
