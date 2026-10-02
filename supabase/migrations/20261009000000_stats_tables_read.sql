-- Precomputed stats, phase 2: the public views and the xG functions read the filled tables.
-- Column names, types and order are those of the sources the tables were created from.

create or replace view skater_season as select * from skater_season_t;
create or replace view goalie_season as select * from goalie_season_t;
create or replace view player_xg_season as select * from player_xg_season_t;

create or replace function player_xg_league(p_league text, p_season int, p_phase text)
returns table (player_id text, league_id text, season int, phase text, attempts bigint, unblocked bigint, goals bigint, xg numeric)
language sql stable as $$
  select * from player_xg_season_t where league_id = p_league and season = p_season and phase = p_phase
$$;

create or replace function player_xg_players(p_players text[])
returns table (player_id text, league_id text, season int, phase text, attempts bigint, unblocked bigint, goals bigint, xg numeric)
language sql stable as $$
  select * from player_xg_season_t where player_id = any(p_players)
$$;
