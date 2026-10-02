-- Precomputed player statistics.
--
-- skater_season, goalie_season and player_xg_season were views aggregating the whole box-score
-- and shot history on every page view. Their definitions move to *_src views, the results are
-- kept in *_t tables, and a trigger marks every game written by the crawler as dirty so only the
-- players of those games are recomputed. The public views are pointed at the tables by a later
-- migration, once the tables have been filled season by season (too large for one transaction).

-- ---------- sources: the live definitions, unchanged ----------

create or replace view skater_season_src as
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

create or replace view goalie_season_src as
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

create or replace view player_xg_season_src as
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

-- ---------- tables ----------

create table if not exists skater_season_t as select * from skater_season_src with no data;
create index if not exists skater_season_t_player_idx on skater_season_t (player_id);
create index if not exists skater_season_t_league_idx on skater_season_t (league_id, season, phase);
create index if not exists skater_season_t_team_idx on skater_season_t (team_id, season);

create table if not exists goalie_season_t as select * from goalie_season_src with no data;
create index if not exists goalie_season_t_player_idx on goalie_season_t (player_id);
create index if not exists goalie_season_t_league_idx on goalie_season_t (league_id, season, phase);
create index if not exists goalie_season_t_team_idx on goalie_season_t (team_id, season);

create table if not exists player_xg_season_t as select * from player_xg_season_src with no data;
create index if not exists player_xg_season_t_player_idx on player_xg_season_t (player_id);
create index if not exists player_xg_season_t_league_idx on player_xg_season_t (league_id, season, phase);

-- Current form entering the next game: consecutive games with a point / a goal (last 30 games).
create table if not exists skater_form_t (
  player_id text primary key,
  last_at timestamptz not null,
  pts_streak int not null,
  g_streak int not null
);

-- Team strength snapshot written by the app after each crawl (Elo is computed in TypeScript).
create table if not exists elo_rating (
  league_id text not null,
  team_id text not null,
  name text,
  rating real not null,
  updated_at timestamptz not null default now(),
  primary key (league_id, team_id)
);

-- Games written since the last refresh.
create table if not exists stats_dirty_game (
  game_id text primary key,
  at timestamptz not null default now()
);

-- ---------- dirty tracking ----------

create or replace function mark_stats_dirty_row() returns trigger language plpgsql as $$
begin
  insert into stats_dirty_game (game_id) values (new.game_id) on conflict do nothing;
  return null;
end $$;

create or replace function mark_stats_dirty_game() returns trigger language plpgsql as $$
begin
  insert into stats_dirty_game (game_id) values (new.id) on conflict do nothing;
  return null;
end $$;

drop trigger if exists box_skater_stats_dirty on box_skater;
create trigger box_skater_stats_dirty after insert or update on box_skater
  for each row execute function mark_stats_dirty_row();

drop trigger if exists box_goalie_stats_dirty on box_goalie;
create trigger box_goalie_stats_dirty after insert or update on box_goalie
  for each row execute function mark_stats_dirty_row();

drop trigger if exists game_event_stats_dirty on game_event;
create trigger game_event_stats_dirty after insert or update on game_event
  for each row when (new.type = 'shot') execute function mark_stats_dirty_row();

drop trigger if exists game_stats_dirty on game;
create trigger game_stats_dirty after update on game
  for each row
  when (old.status is distinct from new.status or old.phase is distinct from new.phase
        or old.season_id is distinct from new.season_id or old.league_id is distinct from new.league_id)
  execute function mark_stats_dirty_game();

-- ---------- refresh ----------

create or replace function refresh_player_form(p_players text[]) returns int language plpgsql as $$
begin
  if p_players is null or cardinality(p_players) = 0 then return 0; end if;
  delete from skater_form_t where player_id = any(p_players);
  insert into skater_form_t (player_id, last_at, pts_streak, g_streak)
  select p.pid, x.last_at, x.pts_streak, x.g_streak
  from unnest(p_players) as p(pid)
  cross join lateral (
    select max(y.start_at) as last_at,
      (coalesce(min(y.rn) filter (where coalesce(y.pts, 0) = 0), count(*) + 1) - 1)::int as pts_streak,
      (coalesce(min(y.rn) filter (where coalesce(y.g, 0) = 0), count(*) + 1) - 1)::int as g_streak
    from (
      select b.pts, b.g, g.start_at, row_number() over (order by g.start_at desc) as rn
      from box_skater b join game g on g.id = b.game_id
      where b.player_id = p.pid and g.status = 'final'
      order by g.start_at desc
      limit 30
    ) y
  ) x
  where x.last_at is not null;
  return cardinality(p_players);
end $$;

-- Every season row of the given players, recomputed from the sources.
create or replace function refresh_player_stats(p_players text[]) returns int language plpgsql as $$
begin
  if p_players is null or cardinality(p_players) = 0 then return 0; end if;
  delete from skater_season_t where player_id = any(p_players);
  insert into skater_season_t select * from skater_season_src where player_id = any(p_players);
  delete from goalie_season_t where player_id = any(p_players);
  insert into goalie_season_t select * from goalie_season_src where player_id = any(p_players);
  delete from player_xg_season_t where player_id = any(p_players);
  insert into player_xg_season_t select * from player_xg_season_src where player_id = any(p_players);
  perform refresh_player_form(p_players);
  return cardinality(p_players);
end $$;

-- One league season at a time, for the initial fill and full rebuilds.
create or replace function refresh_stats_season(p_league text, p_season int) returns int language plpgsql as $$
declare n int;
begin
  delete from skater_season_t where league_id = p_league and season = p_season;
  insert into skater_season_t select * from skater_season_src where league_id = p_league and season = p_season;
  get diagnostics n = row_count;
  delete from goalie_season_t where league_id = p_league and season = p_season;
  insert into goalie_season_t select * from goalie_season_src where league_id = p_league and season = p_season;
  delete from player_xg_season_t where league_id = p_league and season = p_season;
  insert into player_xg_season_t select * from player_xg_season_src where league_id = p_league and season = p_season;
  return n;
end $$;

-- Players of the games written since the last call; returns the number of games handled.
create or replace function refresh_dirty_stats(p_limit int default 100) returns int language plpgsql as $$
declare
  games text[];
  players text[];
begin
  with picked as (
    select game_id from stats_dirty_game order by at limit p_limit for update skip locked
  ), gone as (
    delete from stats_dirty_game d using picked where d.game_id = picked.game_id returning d.game_id
  )
  select array_agg(game_id) into games from gone;
  if games is null then return 0; end if;
  select array_agg(distinct pid) into players from (
    select player_id as pid from box_skater where game_id = any(games)
    union select player_id from box_goalie where game_id = any(games)
    union select player_ids[1] from game_event where game_id = any(games) and type = 'shot'
  ) s where pid is not null;
  perform refresh_player_stats(players);
  return cardinality(games);
end $$;

grant select on skater_season_t, goalie_season_t, player_xg_season_t, skater_form_t, elo_rating to anon, authenticated;
