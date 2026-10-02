-- A game only changes the season rows of its own league season, so the dirty refresh recomputes
-- the affected players within those seasons instead of their whole careers. Reading a career of
-- shots per player from a cold cache took seconds per batch; a season is read game by game.

create or replace function refresh_player_stats_in(p_players text[], p_league text, p_season int) returns void language plpgsql as $$
begin
  delete from skater_season_t where league_id = p_league and season = p_season and player_id = any(p_players);
  insert into skater_season_t
    select * from skater_season_src where league_id = p_league and season = p_season and player_id = any(p_players);
  delete from goalie_season_t where league_id = p_league and season = p_season and player_id = any(p_players);
  insert into goalie_season_t
    select * from goalie_season_src where league_id = p_league and season = p_season and player_id = any(p_players);
  delete from player_xg_season_t where league_id = p_league and season = p_season and player_id = any(p_players);
  insert into player_xg_season_t
    select * from player_xg_season_src where league_id = p_league and season = p_season and player_id = any(p_players);
end $$;

create or replace function refresh_dirty_stats(p_limit int default 100) returns int language plpgsql as $$
declare
  games text[];
  players text[];
  rec record;
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
  if players is null then return cardinality(games); end if;
  for rec in select distinct league_id, season from game where id = any(games) loop
    if rec.season is null or rec.league_id is null then
      -- no season to scope by: whole careers, as before
      perform refresh_player_stats(players);
    else
      perform refresh_player_stats_in(players, rec.league_id, rec.season);
    end if;
  end loop;
  perform refresh_player_form(players);
  return cardinality(games);
end $$;
