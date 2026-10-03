/** Fan-hub queries: search, on this day, records, comparisons. */
import { sql, type GameRowDb } from "./queries";

const GAME_SELECT = `
  g.id, g.start_at, g.season, g.phase, g.round, g.home_team_id, g.away_team_id,
  coalesce(g.home_name, th.name) as home_name, coalesce(g.away_name, ta.name) as away_name,
  th.abbrev as home_abbrev, ta.abbrev as away_abbrev, season_logo(g.home_team_id, g.season) as home_logo, season_logo(g.away_team_id, g.season) as away_logo,
  g.home_score, g.away_score, g.decided_in, g.status, g.attendance, g.capacity, g.venue,
  (g.team_stats->'xG'->>0)::float as xg_home, (g.team_stats->'xG'->>1)::float as xg_away`;
const GAME_FROM = `from game g join team th on th.id = g.home_team_id join team ta on ta.id = g.away_team_id`;

export interface SearchHit {
  kind: "team" | "player";
  id: string;
  name: string;
  sub: string | null;
  image: string | null;
}

/** Prefix full-text search over teams and players (diacritics-insensitive). */
export async function search(q: string, limit = 12): Promise<SearchHit[]> {
  const words = q
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(0, 4);
  if (words.length === 0) return [];
  const tsq = words.map((w) => `${w}:*`).join(" & ");
  const [teams, players] = await Promise.all([
    sql<SearchHit>(
      `select 'team' as kind, id, name, abbrev as sub, logo_url as image from team
       where search @@ to_tsquery('simple', $1) order by length(name) limit 5`,
      [tsq],
    ),
    sql<SearchHit>(
      `select 'player' as kind, p.id, p.name,
              concat_ws(' · ', case p.position when 'G' then 'brankář' when 'D' then 'obránce' when 'F' then 'útočník' end, t.short_name) as sub,
              p.headshot as image
       from player p left join team t on t.id = p.current_team_id
       left join lateral (select count(*) as n from box_skater b where b.player_id = p.id) c on true
       where p.search @@ to_tsquery('simple', $1)
       order by (p.current_team_id is not null) desc, c.n desc nulls last limit $2`,
      [tsq, limit],
    ),
  ]);
  return [...teams, ...players];
}

/** Games played on this calendar day (Prague) in past seasons. */
export async function gamesOnThisDay(month: number, day: number) {
  return sql<GameRowDb>(
    `select ${GAME_SELECT} ${GAME_FROM}
     where g.status = 'final' and g.league_id = 'cz-elh'
       and extract(month from g.start_at at time zone 'Europe/Prague') = $1
       and extract(day from g.start_at at time zone 'Europe/Prague') = $2
     order by g.start_at desc`,
    [month, day],
  );
}

export async function birthdaysOnThisDay(month: number, day: number) {
  return sql<{ id: string; name: string; headshot: string | null; birth_date: string; position: string | null; games: number; points: number }>(
    `select p.id, p.name, p.headshot, to_char(p.birth_date, 'YYYY-MM-DD') as birth_date, p.position,
            count(b.*)::int as games, coalesce(sum(b.pts), 0)::int as points
     from player p left join box_skater b on b.player_id = p.id
     where extract(month from p.birth_date) = $1 and extract(day from p.birth_date) = $2
     group by p.id having count(b.*) > 0
     order by count(b.*) desc limit 24`,
    [month, day],
  );
}

/** Individual big games on this day: hat-tricks and 4+ point nights. */
export async function bigNightsOnThisDay(month: number, day: number) {
  return sql<{
    player_id: string;
    name: string;
    headshot: string | null;
    game_id: string;
    start_at: string;
    goals: number;
    assists: number;
    team_name: string;
    opp_name: string;
  }>(
    `select b.player_id, p.name, p.headshot, g.id as game_id, g.start_at, b.g as goals, b.a as assists,
            case when b.team_id = g.home_team_id then g.home_name else g.away_name end as team_name,
            case when b.team_id = g.home_team_id then g.away_name else g.home_name end as opp_name
     from box_skater b join game g on g.id = b.game_id join player p on p.id = b.player_id
     where extract(month from g.start_at at time zone 'Europe/Prague') = $1
       and extract(day from g.start_at at time zone 'Europe/Prague') = $2
       and (b.g >= 3 or b.pts >= 4)
     order by b.pts desc, b.g desc limit 20`,
    [month, day],
  );
}

// ---------- records ----------

export async function recordGames(league: string) {
  const [biggestWins, highestScoring, attendance, comebacks] = await Promise.all([
    sql<GameRowDb>(
      `select ${GAME_SELECT} ${GAME_FROM} where g.league_id = $1 and g.status = 'final'
       order by abs(g.home_score - g.away_score) desc, g.home_score + g.away_score desc limit 10`,
      [league],
    ),
    sql<GameRowDb>(
      `select ${GAME_SELECT} ${GAME_FROM} where g.league_id = $1 and g.status = 'final'
       order by g.home_score + g.away_score - (case when g.decided_in = 'SO' then 1 else 0 end) desc, g.start_at limit 10`,
      [league],
    ),
    sql<GameRowDb>(
      `select ${GAME_SELECT} ${GAME_FROM} where g.league_id = $1 and g.attendance is not null
       order by g.attendance desc limit 10`,
      [league],
    ),
    // Biggest deficit overcome, from the goal sequence.
    sql<GameRowDb & { deficit: number }>(
      `with seq as (
         select e.game_id, e.team_id, e.seq,
                sum(case when e.team_id = g.home_team_id then 1 else -1 end) over (partition by e.game_id order by e.period, e.period_seconds, e.seq) as diff
         from game_event e join game g on g.id = e.game_id
         where e.type = 'goal' and g.league_id = $1 and g.status = 'final'
       ), worst as (
         select game_id, min(diff) as min_d, max(diff) as max_d from seq group by game_id
       )
       select ${GAME_SELECT},
              case when g.home_score > g.away_score then -w.min_d else w.max_d end as deficit
       ${GAME_FROM} join worst w on w.game_id = g.id
       where (g.home_score > g.away_score and w.min_d <= -3) or (g.away_score > g.home_score and w.max_d >= 3)
       order by deficit desc, g.start_at desc limit 10`,
      [league],
    ),
  ]);
  return { biggestWins, highestScoring, attendance, comebacks };
}

export async function recordPlayers(league: string) {
  const [gameGoals, gamePoints, seasonPoints, seasonGoals, careerPoints, careerGames] = await Promise.all([
    sql<{
      player_id: string;
      name: string;
      headshot: string | null;
      game_id: string;
      start_at: string;
      value: number;
      opp_name: string;
      team_logo: string | null;
    }>(
      `select b.player_id, p.name, p.headshot, g.id as game_id, g.start_at, b.g as value,
              case when b.team_id = g.home_team_id then g.away_name else g.home_name end as opp_name, season_logo(b.team_id, g.season) as team_logo
       from box_skater b join game g on g.id = b.game_id join player p on p.id = b.player_id left join team t on t.id = b.team_id
       where g.league_id = $1 order by b.g desc, g.start_at limit 10`,
      [league],
    ),
    sql<{
      player_id: string;
      name: string;
      headshot: string | null;
      game_id: string;
      start_at: string;
      value: number;
      opp_name: string;
      team_logo: string | null;
    }>(
      `select b.player_id, p.name, p.headshot, g.id as game_id, g.start_at, b.pts as value,
              case when b.team_id = g.home_team_id then g.away_name else g.home_name end as opp_name, season_logo(b.team_id, g.season) as team_logo
       from box_skater b join game g on g.id = b.game_id join player p on p.id = b.player_id left join team t on t.id = b.team_id
       where g.league_id = $1 order by b.pts desc, b.g desc, g.start_at limit 10`,
      [league],
    ),
    sql<{
      player_id: string;
      name: string;
      headshot: string | null;
      season: number;
      value: number;
      gp: number;
      team_abbrev: string;
      team_logo: string | null;
    }>(
      `select s.player_id, p.name, p.headshot, s.season, s.pts::int as value, s.gp::int, t.abbrev as team_abbrev, season_logo(s.team_id, s.season) as team_logo
       from skater_season s join player p on p.id = s.player_id join team t on t.id = s.team_id
       where s.league_id = $1 and s.phase = 'regular' order by s.pts desc limit 10`,
      [league],
    ),
    sql<{
      player_id: string;
      name: string;
      headshot: string | null;
      season: number;
      value: number;
      gp: number;
      team_abbrev: string;
      team_logo: string | null;
    }>(
      `select s.player_id, p.name, p.headshot, s.season, s.g::int as value, s.gp::int, t.abbrev as team_abbrev, season_logo(s.team_id, s.season) as team_logo
       from skater_season s join player p on p.id = s.player_id join team t on t.id = s.team_id
       where s.league_id = $1 and s.phase = 'regular' order by s.g desc limit 10`,
      [league],
    ),
    sql<{ player_id: string; name: string; headshot: string | null; value: number; gp: number; goals: number }>(
      `select s.player_id, p.name, p.headshot, sum(s.pts)::int as value, sum(s.gp)::int as gp, sum(s.g)::int as goals
       from skater_season s join player p on p.id = s.player_id
       where s.league_id = $1 group by s.player_id, p.name, p.headshot order by sum(s.pts) desc limit 15`,
      [league],
    ),
    sql<{ player_id: string; name: string; headshot: string | null; value: number; seasons: number }>(
      `select s.player_id, p.name, p.headshot, sum(s.gp)::int as value, count(distinct s.season)::int as seasons
       from skater_season s join player p on p.id = s.player_id
       where s.league_id = $1 group by s.player_id, p.name, p.headshot order by sum(s.gp) desc limit 15`,
      [league],
    ),
  ]);
  return { gameGoals, gamePoints, seasonPoints, seasonGoals, careerPoints, careerGames };
}

/** Career totals for the comparison page. */
export async function careerTotals(id: string) {
  const [row] = await sql<{
    gp: number;
    goals: number;
    assists: number;
    points: number;
    pim: number;
    plus_minus: number;
    shots: number;
    hits: number;
    blocks: number;
    fo_w: number;
    fo_taken: number;
    seasons: number;
    toi_avg: number | null;
    xg: number | null;
  }>(
    `select coalesce(sum(s.gp),0)::int as gp, coalesce(sum(s.g),0)::int as goals, coalesce(sum(s.a),0)::int as assists,
            coalesce(sum(s.pts),0)::int as points, coalesce(sum(s.pim),0)::int as pim, coalesce(sum(s.pm),0)::int as plus_minus,
            coalesce(sum(s.sog),0)::int as shots, coalesce(sum(s.hits),0)::int as hits, coalesce(sum(s.blk),0)::int as blocks,
            coalesce(sum(s.fo_w),0)::int as fo_w, coalesce(sum(s.fo_taken),0)::int as fo_taken, count(distinct s.season)::int as seasons,
            (sum(s.toi_avg * s.gp) / nullif(sum(s.gp) filter (where s.toi_avg is not null), 0))::float as toi_avg,
            (select sum(x.xg)::float from player_xg_players(array[$1]) x) as xg
     from skater_season s where s.player_id = $1`,
    [id],
  );
  return row ?? null;
}
