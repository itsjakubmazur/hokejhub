-- Analytics layer: attendance, player season totals, running career counters (milestones).

alter table game add column if not exists capacity int;
alter table game add column if not exists season int
  generated always as (nullif(regexp_replace(coalesce(season_id, ''), '^.*-(\d{4})$', '\1'), '')::int) stored;
create index if not exists game_season_int_idx on game (league_id, season, phase);
create index if not exists box_skater_player_idx on box_skater (player_id);
create index if not exists box_goalie_player_idx on box_goalie (player_id);
create index if not exists game_event_type_idx on game_event (type, game_id);

-- ---------- attendance ----------

-- One row per played home game with a reported attendance.
create or replace view attendance_game as
select
  g.id as game_id, g.league_id, g.season, g.phase, g.start_at, g.venue,
  g.home_team_id as team_id, g.away_team_id as opponent_id,
  g.home_name as team_name, g.away_name as opponent_name,
  g.attendance, g.capacity,
  case when g.capacity > 0 then least(g.attendance::numeric / g.capacity, 1.0) end as fill,
  (g.capacity > 0 and g.attendance >= g.capacity) as sold_out
from game g
where g.status = 'final' and g.attendance > 0;

-- Per home team, season and phase.
create or replace view attendance_team_season as
select
  league_id, season, phase, team_id,
  max(team_name) as team_name,
  count(*) as games,
  sum(attendance) as total,
  round(avg(attendance)) as avg,
  percentile_cont(0.5) within group (order by attendance) as median,
  max(attendance) as max,
  min(attendance) as min,
  count(*) filter (where sold_out) as sold_out,
  round(avg(capacity)) as avg_capacity,
  round(avg(fill) * 100, 1) as fill_pct
from attendance_game
group by league_id, season, phase, team_id;

-- League-wide per season and phase.
create or replace view attendance_league_season as
select
  league_id, season, phase,
  count(*) as games,
  sum(attendance) as total,
  round(avg(attendance)) as avg,
  count(*) filter (where sold_out) as sold_out,
  round(avg(fill) * 100, 1) as fill_pct,
  max(attendance) as record
from attendance_game
group by league_id, season, phase;

-- Home attendance split by visiting opponent (who draws the crowds).
create or replace view attendance_by_opponent as
select
  league_id, season, team_id, opponent_id,
  max(opponent_name) as opponent_name,
  count(*) as games,
  round(avg(attendance)) as avg,
  count(*) filter (where sold_out) as sold_out,
  round(avg(fill) * 100, 1) as fill_pct
from attendance_game
group by league_id, season, team_id, opponent_id;

-- Road attendance: how many people a team draws when visiting.
create or replace view attendance_road_draw as
select
  league_id, season, opponent_id as team_id,
  max(opponent_name) as team_name,
  count(*) as games,
  round(avg(attendance)) as avg,
  round(avg(fill) * 100, 1) as fill_pct
from attendance_game
group by league_id, season, opponent_id;

-- ---------- player totals ----------

create or replace view skater_season as
select
  b.player_id, g.league_id, g.season, g.phase, b.team_id,
  count(*) as gp,
  sum(b.g) as g, sum(b.a) as a, sum(b.pts) as pts, sum(b.pm) as pm, sum(b.pim) as pim,
  sum(b.sog) as sog, sum(b.hits) as hits, sum(b.blk) as blk,
  sum(b.fo_w) as fo_w, sum(b.fo_taken) as fo_taken,
  round(avg(b.toi_s)) as toi_avg,
  sum(b.ri) as ri
from box_skater b
join game g on g.id = b.game_id
where g.status = 'final'
group by b.player_id, g.league_id, g.season, g.phase, b.team_id;

create or replace view goalie_season as
select
  b.player_id, g.league_id, g.season, g.phase, b.team_id,
  count(*) filter (where b.toi_s > 0) as gp,
  sum(b.toi_s) as toi_s,
  sum(b.saves) as saves,
  sum(b.ga) as ga,
  round(sum(b.saves)::numeric / nullif(sum(b.saves) + sum(b.ga), 0) * 100, 2) as sv_pct,
  round(sum(b.ga)::numeric * 3600 / nullif(sum(b.toi_s), 0), 2) as gaa,
  count(*) filter (where b.ga = 0 and b.toi_s >= 3000) as shutouts
from box_goalie b
join game g on g.id = b.game_id
where g.status = 'final'
group by b.player_id, g.league_id, g.season, g.phase, b.team_id;

-- Per-player xG from the shot feed (player_ids[1] = shooter).
create or replace view player_xg_season as
select
  e.player_ids[1] as player_id, g.league_id, g.season, g.phase,
  count(*) as attempts,
  count(*) filter (where e.payload->>'result' <> 'blocked') as unblocked,
  count(*) filter (where e.payload->>'result' = 'goal') as goals,
  round(sum(coalesce(e.xg, 0))::numeric, 2) as xg
from game_event e
join game g on g.id = e.game_id
where e.type = 'shot' and e.player_ids[1] is not null
group by e.player_ids[1], g.league_id, g.season, g.phase;

-- ---------- career counters (milestones) ----------

-- Every skater appearance with running totals: career and per club, in game order.
create or replace view skater_career_log as
select
  b.player_id, b.team_id, b.game_id, g.start_at, g.league_id, g.season, g.phase,
  b.g, b.a, b.pts,
  row_number() over w_all as career_gp,
  sum(b.g) over w_all as career_g,
  sum(b.pts) over w_all as career_pts,
  row_number() over w_team as club_gp,
  sum(b.g) over w_team as club_g,
  sum(b.pts) over w_team as club_pts
from box_skater b
join game g on g.id = b.game_id
where g.status = 'final'
window
  w_all as (partition by b.player_id, g.league_id order by g.start_at, g.id rows unbounded preceding),
  w_team as (partition by b.player_id, g.league_id, b.team_id order by g.start_at, g.id rows unbounded preceding);

-- Milestones reached in a game: round numbers crossed by this game's contribution.
create or replace function game_milestones(p_game_id text)
returns table (player_id text, team_id text, kind text, value int)
language sql stable as $$
  with l as (select * from skater_career_log where game_id = p_game_id),
  checks as (
    select l.player_id, l.team_id, 'career_gp' as kind, l.career_gp::int as value, 1 as step_in_game from l
    union all select l.player_id, l.team_id, 'club_gp', l.club_gp::int, 1 from l
    union all select l.player_id, l.team_id, 'career_g', l.career_g::int, l.g from l
    union all select l.player_id, l.team_id, 'club_g', l.club_g::int, l.g from l
    union all select l.player_id, l.team_id, 'career_pts', l.career_pts::int, l.pts from l
    union all select l.player_id, l.team_id, 'club_pts', l.club_pts::int, l.pts from l
  )
  select c.player_id, c.team_id, c.kind,
    -- the round number crossed by this game (e.g. 99 → 101 goals crosses 100)
    (floor(c.value / case when c.kind like '%gp' then 100 else 50 end)
      * case when c.kind like '%gp' then 100 else 50 end)::int as value
  from checks c
  where c.step_in_game > 0
    and floor(c.value / case when c.kind like '%gp' then 100.0 else 50.0 end)
      > floor((c.value - c.step_in_game) / case when c.kind like '%gp' then 100.0 else 50.0 end)
    and c.value >= case when c.kind like '%gp' then 100 else 50 end
$$;

grant select on attendance_game, attendance_team_season, attendance_league_season, attendance_by_opponent,
  attendance_road_draw, skater_season, goalie_season, player_xg_season, skater_career_log to anon, authenticated;
grant execute on function game_milestones(text) to anon, authenticated;
