-- Finished games are now re-read for a week to pick up corrections (an assist reassigned, a
-- goal credited to another player). Re-reading writes the same rows again, so updates only mark
-- a game dirty when a row actually changed.

drop trigger if exists box_skater_stats_dirty on box_skater;
create trigger box_skater_stats_dirty after insert on box_skater
  for each row execute function mark_stats_dirty_row();
create trigger box_skater_stats_dirty_upd after update on box_skater
  for each row when (old.* is distinct from new.*) execute function mark_stats_dirty_row();

drop trigger if exists box_goalie_stats_dirty on box_goalie;
create trigger box_goalie_stats_dirty after insert on box_goalie
  for each row execute function mark_stats_dirty_row();
create trigger box_goalie_stats_dirty_upd after update on box_goalie
  for each row when (old.* is distinct from new.*) execute function mark_stats_dirty_row();

drop trigger if exists game_event_stats_dirty on game_event;
create trigger game_event_stats_dirty after insert on game_event
  for each row when (new.type = 'shot') execute function mark_stats_dirty_row();
create trigger game_event_stats_dirty_upd after update on game_event
  for each row when ((new.type = 'shot' or old.type = 'shot') and old.* is distinct from new.*) execute function mark_stats_dirty_row();

-- A season compared with its source: rows missing from the table and rows that differ.
create or replace function stats_season_drift(p_league text, p_season int)
returns table (kind text, missing bigint, extra bigint) language sql stable as $$
  select 'skater', (select count(*) from (select * from skater_season_src where league_id = p_league and season = p_season
                                         except select * from skater_season_t where league_id = p_league and season = p_season) a),
                   (select count(*) from (select * from skater_season_t where league_id = p_league and season = p_season
                                         except select * from skater_season_src where league_id = p_league and season = p_season) b)
  union all
  select 'goalie', (select count(*) from (select * from goalie_season_src where league_id = p_league and season = p_season
                                         except select * from goalie_season_t where league_id = p_league and season = p_season) a),
                   (select count(*) from (select * from goalie_season_t where league_id = p_league and season = p_season
                                         except select * from goalie_season_src where league_id = p_league and season = p_season) b)
  union all
  select 'xg', (select count(*) from (select * from player_xg_season_src where league_id = p_league and season = p_season
                                     except select * from player_xg_season_t where league_id = p_league and season = p_season) a),
               (select count(*) from (select * from player_xg_season_t where league_id = p_league and season = p_season
                                     except select * from player_xg_season_src where league_id = p_league and season = p_season) b)
$$;
