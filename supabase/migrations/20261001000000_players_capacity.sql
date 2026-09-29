-- Player bio columns + historical arena capacities (attendance fill % / sell-outs).

alter table player add column if not exists height_cm int;
alter table player add column if not exists weight_kg int;
alter table player add column if not exists current_team_id text;

-- Known arena capacities per club and era. Keyed by the club's (stable) abbreviation.
create table if not exists arena_era (
  abbrev text not null,
  from_season int not null,
  to_season int,                 -- inclusive, null = still valid
  arena text not null,
  capacity int not null,
  source text not null,
  primary key (abbrev, from_season)
);
alter table arena_era enable row level security;
drop policy if exists arena_era_read on arena_era;
create policy arena_era_read on arena_era for select using (true);

insert into arena_era (abbrev, from_season, to_season, arena, capacity, source) values
  ('TRI', 2014, null, 'Werk Arena', 5400, 'hokej.cz; nová Werk Arena otevřena 2014'),
  ('LIB', 2005, null, 'Home Credit Arena', 7500, 'cs.wikipedia: otevřena 8. 9. 2005, 7 500 pro hokej'),
  ('CEB', 2002, null, 'Budvar arena', 6421, 'en.wikipedia List of indoor arenas (otevřena 2002)'),
  ('KVA', 2009, null, 'KV Arena', 5874, 'en.wikipedia List of indoor arenas (otevřena 2009)'),
  ('CHO', 2011, null, 'Rocknet aréna', 5250, 'en.wikipedia List of indoor arenas (otevřena 2011)'),
  ('SPA', 2015, null, 'O2 arena', 17220, 'en.wikipedia List of indoor arenas; Sparta v O2 areně od 2015/16'),
  ('SPA', 1992, 2014, 'Sportovní hala Fortuna (Tipsport arena)', 13238, 'en.wikipedia List of indoor arenas'),
  ('KOM', 2009, null, 'Winning Group Arena (Rondo)', 7700, 'en.wikipedia List of indoor arenas'),
  ('PCE', 2002, null, 'Enteria arena', 10088, 'en.wikipedia List of indoor arenas'),
  ('HKM', 2017, null, 'ČPP Arena', 7700, 'en.wikipedia List of indoor arenas'),
  ('VIT', 2012, null, 'Ostravar Aréna', 9833, 'cs.wikipedia: 9 833 pro extraligu po rekonstrukci 2012'),
  ('OLO', 2014, null, 'Zimní stadion Olomouc', 5500, 'en.wikipedia List of indoor arenas'),
  ('MBL', 2013, null, 'Ško-Energo Aréna', 4200, 'en.wikipedia List of indoor arenas'),
  ('KLA', 2014, null, 'ČEZ stadion Kladno', 5200, 'cs.wikipedia: 5 200 po rekonstrukci 2014'),
  ('ZLN', 1992, null, 'Trinity Bank Arena Luďka Čajky', 7000, 'en.wikipedia List of indoor arenas'),
  ('JIH', 2025, null, 'Horácká aréna', 5750, 'en.wikipedia List of indoor arenas (otevřena 2025)'),
  ('VSE', 1992, null, 'Na Lapači', 5400, 'en.wikipedia List of indoor arenas'),
  ('UNL', 2004, null, 'Zimní stadion Ústí nad Labem', 6500, 'en.wikipedia List of indoor arenas'),
  ('ZNO', 1999, null, 'Nevoga Arena', 4800, 'en.wikipedia List of indoor arenas')
on conflict (abbrev, from_season) do update set to_season = excluded.to_season, arena = excluded.arena,
  capacity = excluded.capacity, source = excluded.source;

-- Effective capacity per home team and season:
-- 1) researched arena era, else
-- 2) hokej.cz capacity (current stadium), raised to the highest attendance seen at that club
--    within ±2 seasons when crowds exceeded it (the old stadium must have been bigger).
create or replace view team_season_capacity as
with seasons as (
  select g.home_team_id as team_id, g.season, max(g.capacity) as hcz_capacity, max(g.attendance) as max_att
  from game g where g.status = 'final' and g.season is not null
  group by g.home_team_id, g.season
),
windowed as (
  select s.*, max(s.max_att) over (partition by s.team_id order by s.season range between 2 preceding and 2 following) as max_att_window
  from seasons s
)
select w.team_id, w.season,
  coalesce(a.capacity,
    case when w.hcz_capacity is null then null
         when w.max_att_window > w.hcz_capacity then w.max_att_window
         else w.hcz_capacity end) as capacity,
  case when a.capacity is not null then 'researched'
       when w.hcz_capacity is null then null
       when w.max_att_window > w.hcz_capacity then 'estimated'
       else 'hokejcz' end as capacity_source,
  a.arena
from windowed w
join team t on t.id = w.team_id
left join arena_era a on a.abbrev = t.abbrev and w.season >= a.from_season and (a.to_season is null or w.season <= a.to_season);

drop view if exists attendance_game cascade;

create view attendance_game as
select
  g.id as game_id, g.league_id, g.season, g.phase, g.start_at, coalesce(c.arena, g.venue) as venue,
  g.home_team_id as team_id, g.away_team_id as opponent_id,
  g.home_name as team_name, g.away_name as opponent_name,
  g.attendance, c.capacity, c.capacity_source,
  case when c.capacity > 0 then least(g.attendance::numeric / c.capacity, 1.0) end as fill,
  (c.capacity > 0 and g.attendance >= c.capacity * 0.99) as sold_out
from game g
left join team_season_capacity c on c.team_id = g.home_team_id and c.season = g.season
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


grant select on team_season_capacity, arena_era, attendance_game, attendance_team_season, attendance_league_season,
  attendance_by_opponent, attendance_road_draw to anon, authenticated;
