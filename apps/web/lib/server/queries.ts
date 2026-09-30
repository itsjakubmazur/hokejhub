import type { ResultGame } from "@hokejhub/core";
import { CS, csCount } from "@hokejhub/core";
import { sql } from "./db";

export { sql };

export interface TeamInfo {
  id: string;
  name: string;
  short_name: string;
  abbrev: string;
  logo_url: string | null;
  league_id: string | null;
}

export interface GameRowDb {
  id: string;
  start_at: string;
  season: number | null;
  phase: string | null;
  round: string | null;
  home_team_id: string;
  away_team_id: string;
  home_name: string;
  away_name: string;
  home_abbrev: string;
  away_abbrev: string;
  home_logo: string | null;
  away_logo: string | null;
  home_score: number | null;
  away_score: number | null;
  decided_in: "REG" | "OT" | "SO" | null;
  status: string;
  attendance: number | null;
  capacity: number | null;
  venue: string | null;
  xg_home: number | null;
  xg_away: number | null;
}

const GAME_SELECT = `
  g.id, g.start_at, g.season, g.phase, g.round, g.home_team_id, g.away_team_id,
  coalesce(g.home_name, th.name) as home_name, coalesce(g.away_name, ta.name) as away_name,
  th.abbrev as home_abbrev, ta.abbrev as away_abbrev, th.logo_url as home_logo, ta.logo_url as away_logo,
  g.home_score, g.away_score, g.decided_in, g.status, g.attendance, g.capacity, g.venue,
  (g.team_stats->'xG'->>0)::float as xg_home, (g.team_stats->'xG'->>1)::float as xg_away`;

const GAME_FROM = `from game g join team th on th.id = g.home_team_id join team ta on ta.id = g.away_team_id`;

export async function getTeam(id: string) {
  const [t] = await sql<TeamInfo>("select id, name, short_name, abbrev, logo_url, league_id from team where id = $1", [id]);
  return t ?? null;
}

/** Maps a live-feed team (by abbreviation) to our DB team, most recently active first. */
export async function findTeamByAbbrev(league: string, abbrev: string) {
  const [t] = await sql<{ id: string }>(
    `select t.id from team t
     left join game g on g.home_team_id = t.id
     where t.league_id = $1 and t.abbrev = $2
     group by t.id order by max(g.start_at) desc nulls last limit 1`,
    [league, abbrev],
  );
  return t?.id ?? null;
}

export async function getTeamSeasons(teamId: string) {
  return sql<{ season: number; games: number }>(
    `select season, count(*)::int as games from game
     where (home_team_id = $1 or away_team_id = $1) and season is not null
     group by season order by season desc`,
    [teamId],
  );
}

export async function getTeamGames(teamId: string, season: number) {
  return sql<GameRowDb>(
    `select ${GAME_SELECT} ${GAME_FROM}
     where (g.home_team_id = $1 or g.away_team_id = $1) and g.season = $2
     order by g.start_at`,
    [teamId, season],
  );
}

export async function getSeasonGames(league: string, season: number, phase = "regular") {
  return sql<GameRowDb>(
    `select ${GAME_SELECT} ${GAME_FROM}
     where g.league_id = $1 and g.season = $2 and g.phase = $3
     order by g.start_at`,
    [league, season, phase],
  );
}

export function toResultGames(rows: GameRowDb[]): ResultGame[] {
  return rows
    .filter((g) => g.status === "final" && g.home_score !== null && g.away_score !== null)
    .map((g) => ({
      id: g.id,
      startAt: new Date(g.start_at).toISOString(),
      homeId: g.home_team_id,
      awayId: g.away_team_id,
      homeName: g.home_name,
      awayName: g.away_name,
      homeScore: g.home_score!,
      awayScore: g.away_score!,
      decidedIn: g.decided_in,
    }));
}

export async function getLeagueSeasons(league: string) {
  return sql<{ season: number; games: number }>(
    `select season, count(*)::int as games from game where league_id = $1 and season is not null
     group by season order by season desc`,
    [league],
  );
}

export async function getOfficialStandings(league: string, season: number) {
  return sql<{
    split: string;
    rank: number;
    team_name: string;
    gp: number;
    w: number;
    otw: number;
    ties: number | null;
    otl: number;
    l: number;
    gf: number;
    ga: number;
    pts: number;
  }>(
    `select split, rank, team_name, gp, w, otw, ties, otl, l, gf, ga, pts from standing_final
     where league_id = $1 and season = $2 order by split, rank`,
    [league, season],
  );
}

export interface SkaterSeasonRow {
  player_id: string;
  name: string;
  headshot: string | null;
  team_id: string;
  team_abbrev: string;
  team_logo: string | null;
  position: string | null;
  gp: number;
  g: number;
  a: number;
  pts: number;
  pm: number;
  pim: number;
  sog: number;
  hits: number;
  blk: number;
  fo_w: number;
  fo_taken: number;
  toi_avg: number | null;
  xg: number | null;
}

const SKATER_COLS = `
  s.player_id, p.name, p.headshot, s.team_id, t.abbrev as team_abbrev, t.logo_url as team_logo, p.position,
  s.gp::int, s.g::int, s.a::int, s.pts::int, s.pm::int, s.pim::int, s.sog::int, s.hits::int, s.blk::int,
  coalesce(s.fo_w,0)::int as fo_w, coalesce(s.fo_taken,0)::int as fo_taken, s.toi_avg::int,
  x.xg::float as xg`;

export async function getLeagueSkaters(league: string, season: number, phase = "regular", limit = 100) {
  return sql<SkaterSeasonRow>(
    `select ${SKATER_COLS}
     from (select player_id, league_id, season, phase, max(team_id) as team_id,
             sum(gp) as gp, sum(g) as g, sum(a) as a, sum(pts) as pts, sum(pm) as pm, sum(pim) as pim,
             sum(sog) as sog, sum(hits) as hits, sum(blk) as blk, sum(fo_w) as fo_w, sum(fo_taken) as fo_taken,
             round(sum(toi_avg * gp) / nullif(sum(gp), 0)) as toi_avg
           from skater_season where league_id = $1 and season = $2 and phase = $3
           group by player_id, league_id, season, phase) s
     join player p on p.id = s.player_id
     join team t on t.id = s.team_id
     left join player_xg_league($1, $2, $3) x on x.player_id = s.player_id and x.league_id = s.league_id and x.season = s.season and x.phase = s.phase
     order by s.pts desc, s.g desc limit $4`,
    [league, season, phase, limit],
  );
}

export async function getTeamSkaters(teamId: string, season: number, phase = "regular") {
  return sql<SkaterSeasonRow>(
    `select ${SKATER_COLS}
     from skater_season s
     join player p on p.id = s.player_id
     join team t on t.id = s.team_id
     left join player_xg_players(array(select s2.player_id from skater_season s2 where s2.team_id = $1 and s2.season = $2)) x on x.player_id = s.player_id and x.league_id = s.league_id and x.season = s.season and x.phase = s.phase
     where s.team_id = $1 and s.season = $2 and s.phase = $3
     order by s.pts desc, s.g desc`,
    [teamId, season, phase],
  );
}

export interface GoalieSeasonRow {
  player_id: string;
  name: string;
  headshot: string | null;
  team_abbrev: string;
  team_logo: string | null;
  gp: number;
  saves: number;
  ga: number;
  sv_pct: number | null;
  gaa: number | null;
  shutouts: number;
}

export async function getLeagueGoalies(league: string, season: number, phase = "regular") {
  return sql<GoalieSeasonRow>(
    `select s.player_id, p.name, p.headshot, t.abbrev as team_abbrev, t.logo_url as team_logo, s.gp::int, s.saves::int, s.ga::int,
            s.sv_pct::float, s.gaa::float, s.shutouts::int
     from goalie_season s join player p on p.id = s.player_id join team t on t.id = s.team_id
     where s.league_id = $1 and s.season = $2 and s.phase = $3 and s.gp > 0
     order by s.sv_pct desc nulls last`,
    [league, season, phase],
  );
}

// ---------- players ----------

export async function getPlayer(id: string) {
  const [p] = await sql<{
    id: string;
    name: string;
    position: string | null;
    headshot: string | null;
    birth_date: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    shoots: string | null;
    current_team_id: string | null;
    current_team_name: string | null;
    current_team_logo: string | null;
  }>(
    `select p.id, p.name, p.position, p.headshot, to_char(p.birth_date, 'YYYY-MM-DD') as birth_date, p.height_cm, p.weight_kg,
            p.shoots, p.current_team_id, t.name as current_team_name, t.logo_url as current_team_logo
     from player p left join team t on t.id = p.current_team_id where p.id = $1`,
    [id],
  );
  return p ?? null;
}

export async function getPlayerSeasons(id: string) {
  return sql<SkaterSeasonRow & { season: number; phase: string; team_name: string; attempts: number | null }>(
    `select ${SKATER_COLS}, s.season, s.phase, t.name as team_name, x.attempts::int
     from skater_season s
     join player p on p.id = s.player_id
     join team t on t.id = s.team_id
     left join player_xg_players(array[$1]) x on x.player_id = s.player_id and x.league_id = s.league_id and x.season = s.season and x.phase = s.phase
     where s.player_id = $1
     order by s.season desc, s.phase desc`,
    [id],
  );
}

export async function getPlayerGoalieSeasons(id: string) {
  return sql<GoalieSeasonRow & { season: number; phase: string }>(
    `select s.player_id, p.name, p.headshot, t.abbrev as team_abbrev, t.logo_url as team_logo, s.gp::int, s.saves::int, s.ga::int, s.sv_pct::float,
            s.gaa::float, s.shutouts::int, s.season, s.phase
     from goalie_season s join player p on p.id = s.player_id join team t on t.id = s.team_id
     where s.player_id = $1 order by s.season desc, s.phase desc`,
    [id],
  );
}

export async function getPlayerGameLog(id: string, season: number) {
  return sql<{
    game_id: string;
    start_at: string;
    phase: string;
    team_id: string;
    opp_name: string;
    home: boolean;
    gf: number;
    ga: number;
    decided_in: string | null;
    g: number;
    a: number;
    pts: number;
    pm: number;
    sog: number;
    toi_s: number | null;
    xg: number | null;
  }>(
    `select g.id as game_id, g.start_at, g.phase, b.team_id,
            case when g.home_team_id = b.team_id then g.away_name else g.home_name end as opp_name,
            g.home_team_id = b.team_id as home,
            case when g.home_team_id = b.team_id then g.home_score else g.away_score end as gf,
            case when g.home_team_id = b.team_id then g.away_score else g.home_score end as ga,
            g.decided_in, b.g, b.a, b.pts, b.pm, b.sog, b.toi_s,
            (select round(sum(e.xg)::numeric, 2)::float from game_event e
              where e.game_id = g.id and e.type = 'shot' and e.player_ids[1] = b.player_id) as xg
     from box_skater b join game g on g.id = b.game_id
     where b.player_id = $1 and g.season = $2
     order by g.start_at desc`,
    [id, season],
  );
}

/** Round-number milestones this player reached (career / per club). */
export async function getPlayerMilestones(id: string) {
  return sql<{ game_id: string; start_at: string; team_id: string; kind: string; value: number }>(
    `with l as (select * from skater_career_log where player_id = $1)
     select m.game_id, m.start_at, m.team_id, m.kind, m.value from (
       select l.game_id, l.start_at, l.team_id, x.kind, x.value, x.prev
       from l cross join lateral (values
         ('career_gp', l.career_gp::int, l.career_gp::int - 1, 100),
         ('club_gp', l.club_gp::int, l.club_gp::int - 1, 100),
         ('career_g', l.career_g::int, l.career_g::int - l.g, 50),
         ('club_g', l.club_g::int, l.club_g::int - l.g, 50),
         ('career_pts', l.career_pts::int, l.career_pts::int - l.pts, 100),
         ('club_pts', l.club_pts::int, l.club_pts::int - l.pts, 100)
       ) as x(kind, value, prev, step)
       where x.value >= x.step and x.value / x.step > x.prev / x.step
     ) m order by m.start_at desc`,
    [id],
  );
}

// ---------- attendance ----------

export async function getTeamAttendance(teamId: string) {
  return sql<{
    season: number;
    phase: string;
    games: number;
    total: number;
    avg: number;
    max: number;
    min: number;
    sold_out: number;
    avg_capacity: number | null;
    fill_pct: number | null;
  }>(
    `select season, phase, games::int, total::int, avg::int, max::int, min::int, sold_out::int,
            avg_capacity::int, fill_pct::float
     from attendance_team_season where team_id = $1 order by season desc, phase desc`,
    [teamId],
  );
}

export async function getAttendanceByOpponent(teamId: string, season: number) {
  return sql<{ opponent_id: string; opponent_name: string; games: number; avg: number; sold_out: number; fill_pct: number | null }>(
    `select opponent_id, opponent_name, games::int, avg::int, sold_out::int, fill_pct::float
     from attendance_by_opponent where team_id = $1 and season = $2 order by avg desc`,
    [teamId, season],
  );
}

export async function getLeagueAttendance(league: string) {
  return sql<{ season: number; phase: string; games: number; total: number; avg: number; sold_out: number; fill_pct: number | null; record: number }>(
    `select season, phase, games::int, total::int, avg::int, sold_out::int, fill_pct::float, record::int
     from attendance_league_season where league_id = $1 order by season desc, phase desc`,
    [league],
  );
}

export async function getLeagueAttendanceByTeam(league: string, season: number) {
  return sql<{
    team_id: string;
    team_name: string;
    phase: string;
    games: number;
    avg: number;
    max: number;
    sold_out: number;
    fill_pct: number | null;
    road_avg: number | null;
  }>(
    `select a.team_id, t.name as team_name, a.phase, a.games::int, a.avg::int, a.max::int, a.sold_out::int, a.fill_pct::float,
            r.avg::int as road_avg
     from attendance_team_season a
     join team t on t.id = a.team_id
     left join attendance_road_draw r on r.team_id = a.team_id and r.season = a.season and r.league_id = a.league_id
     where a.league_id = $1 and a.season = $2
     order by a.phase desc, a.avg desc`,
    [league, season],
  );
}

// ---------- head to head ----------

export async function getHeadToHead(teamA: string, teamB: string, limit = 50) {
  return sql<GameRowDb>(
    `select ${GAME_SELECT} ${GAME_FROM}
     where ((g.home_team_id = $1 and g.away_team_id = $2) or (g.home_team_id = $2 and g.away_team_id = $1))
       and g.status = 'final'
     order by g.start_at desc limit $3`,
    [teamA, teamB, limit],
  );
}

export async function getAllTeamGames(teamId: string) {
  return sql<GameRowDb>(
    `select ${GAME_SELECT} ${GAME_FROM}
     where (g.home_team_id = $1 or g.away_team_id = $1) and g.status = 'final'
     order by g.start_at`,
    [teamId],
  );
}

/** Official final rank of a team in each season, matched by the name it used that season. */
export async function getTeamFinalRanks(teamId: string) {
  return sql<{ season: number; rank: number; pts: number; team_name: string }>(
    `select sf.season, sf.rank, sf.pts, sf.team_name from standing_final sf
     where sf.split = 'overall' and exists (
       select 1 from game g where g.season = sf.season and g.home_team_id = $1 and g.home_name = sf.team_name
     )`,
    [teamId],
  );
}

export async function getPlayerShots(id: string, season: number) {
  return sql<{ game_id: string; seq: number; period: number; period_seconds: number; x: number; y: number; xg: number | null; situation: string | null; result: string }>(
    `select e.game_id, e.seq, e.period, e.period_seconds, e.x, e.y, e.xg, e.situation, e.payload->>'result' as result
     from game_event e join game g on g.id = e.game_id
     where e.type = 'shot' and e.player_ids[1] = $1 and g.season = $2 and e.x is not null`,
    [id, season],
  );
}

/** Photos for a set of player ids (hcz-…). */
export async function getPhotos(ids: string[]) {
  if (ids.length === 0) return {} as Record<string, string>;
  const rows = await sql<{ id: string; headshot: string }>(
    "select id, headshot from player where id = any($1) and headshot is not null",
    [ids],
  );
  return Object.fromEntries(rows.map((r) => [r.id, r.headshot])) as Record<string, string>;
}

export async function getTeamLogos(league: string) {
  const rows = await sql<{ id: string; logo_url: string | null }>("select id, logo_url from team where league_id = $1", [league]);
  return Object.fromEntries(rows.filter((r) => r.logo_url).map((r) => [r.id, r.logo_url!])) as Record<string, string>;
}

// ---------- match insights (streaks, milestones) ----------

export interface TeamStreak {
  team_id: string;
  kind: "W" | "L" | "P" | "home_W" | "away_W";
  length: number;
}

/** Current streaks of a team before `before` (wins, losses, games with a point). */
export async function getTeamStreaks(teamId: string, before: string) {
  const rows = await sql<{ home: boolean; gf: number; ga: number; decided_in: string | null }>(
    `select g.home_team_id = $1 as home,
            case when g.home_team_id = $1 then g.home_score else g.away_score end as gf,
            case when g.home_team_id = $1 then g.away_score else g.home_score end as ga,
            g.decided_in
     from game g
     where (g.home_team_id = $1 or g.away_team_id = $1) and g.status = 'final' and g.start_at < $2
     order by g.start_at desc limit 40`,
    [teamId, before],
  );
  const count = (pred: (r: (typeof rows)[number]) => boolean, list = rows) => {
    let n = 0;
    for (const r of list) {
      if (!pred(r)) break;
      n++;
    }
    return n;
  };
  const won = (r: (typeof rows)[number]) => r.gf > r.ga;
  const pointed = (r: (typeof rows)[number]) => r.gf > r.ga || r.gf === r.ga || (r.decided_in != null && r.decided_in !== "REG");
  return {
    wins: count(won),
    losses: count((r) => r.gf < r.ga),
    points: count(pointed),
    homeWins: count(won, rows.filter((r) => r.home)),
    awayWins: count(won, rows.filter((r) => !r.home)),
    last10: rows.slice(0, 10).map((r) => (r.gf > r.ga ? (r.decided_in && r.decided_in !== "REG" ? "OTW" : "W") : r.gf === r.ga ? "T" : r.decided_in && r.decided_in !== "REG" ? "OTL" : "L")),
  };
}

export interface PlayerNote {
  player_id: string;
  name: string;
  headshot: string | null;
  team_id: string;
  text: string;
  /** Higher = more interesting. */
  weight: number;
}

/**
 * Player storylines for a match: point streaks entering the game and round-number milestones
 * that are one game/goal/point away (pre-game) or were reached in this game (post-game).
 */
export async function getPlayerNotes(teamIds: string[], before: string, gameId: string | null) {
  const rows = await sql<{
    player_id: string;
    name: string;
    headshot: string | null;
    team_id: string;
    league_id: string;
    career_gp: number;
    career_g: number;
    career_pts: number;
    club_gp: number;
    club_g: number;
    club_pts: number;
    streak: number;
    goal_streak: number;
  }>(
    `with last_game as (
       select b.team_id, max(g.start_at) as at
       from box_skater b join game g on g.id = b.game_id
       where b.team_id = any($1) and g.status = 'final' and g.start_at < $2
       group by b.team_id
     ),
     roster as (
       select distinct b.player_id, b.team_id
       from box_skater b join game g on g.id = b.game_id
       join last_game lg on lg.team_id = b.team_id and g.start_at = lg.at
     ),
     log as (
       select l.*, row_number() over (partition by l.player_id order by l.start_at desc) as rn
       from skater_career_log_for(array(select player_id from roster)) l
       where l.start_at < $2
     ),
     streaks as (
       select player_id,
         coalesce(min(rn) filter (where pts = 0), max(rn) + 1) - 1 as streak,
         coalesce(min(rn) filter (where g = 0), max(rn) + 1) - 1 as goal_streak
       from log where rn <= 30 group by player_id
     )
     select l.player_id, p.name, p.headshot, r.team_id, l.league_id,
       l.career_gp::int, l.career_g::int, l.career_pts::int, l.club_gp::int, l.club_g::int, l.club_pts::int,
       s.streak::int, s.goal_streak::int
     from log l
     join roster r on r.player_id = l.player_id
     join player p on p.id = l.player_id
     join streaks s on s.player_id = l.player_id
     where l.rn = 1 and l.team_id = r.team_id`,
    [teamIds, before],
  );

  const notes: PlayerNote[] = [];
  const next = (v: number, step: number) => (Math.floor(v / step) + 1) * step;
  for (const r of rows) {
    const base = { player_id: r.player_id, name: r.name, headshot: r.headshot, team_id: r.team_id };
    if (r.streak >= 3) notes.push({ ...base, text: `boduje ${csCount(r.streak, CS.zapas)} v řadě`, weight: r.streak * 2 });
    if (r.goal_streak >= 2) notes.push({ ...base, text: `skóroval ${r.goal_streak}× v řadě`, weight: r.goal_streak * 3 });
    const checks: [number, number, string, number][] = [
      [r.career_gp, 100, "zápas v extralize", 5],
      [r.club_gp, 100, "zápas za klub", 4],
      [r.career_pts, 50, "bod v extralize", 6],
      [r.career_g, 25, "gól v extralize", 7],
      [r.club_pts, 50, "bod za klub", 4],
    ];
    for (const [value, step, label, w] of checks) {
      const target = next(value, step);
      const need = target - value;
      if (label.startsWith("zápas") ? need === 1 : need <= 2) {
        notes.push({
          ...base,
          text: label.startsWith("zápas")
            ? `v zápase odehraje ${target}. ${label}`
            : `potřebuje ${csCount(need, label.startsWith("gól") ? CS.gol : CS.bod)} k ${target}. ${label.replace(/^(gól|bod)/, "$1u")}`,
          weight: w + (target >= 500 ? 5 : target >= 200 ? 3 : 0),
        });
      }
    }
  }
  let reached: { player_id: string; name: string; headshot: string | null; team_id: string; kind: string; value: number }[] = [];
  if (gameId) {
    reached = await sql(
      `select m.player_id, p.name, p.headshot, m.team_id, m.kind, m.value
       from game_milestones($1) m join player p on p.id = m.player_id`,
      [gameId],
    );
  }
  return { notes: notes.sort((a, b) => b.weight - a.weight).slice(0, 12), reached };
}
