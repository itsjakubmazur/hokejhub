-- player_xg_season aggregates every shot in history before joining (4–11 s on league pages).
-- These variants filter first: by the season's games, or by the requested players.

create index if not exists game_event_shooter_idx on game_event ((player_ids[1])) where type = 'shot';
create index if not exists game_league_season_idx on game (league_id, season, phase);

create or replace function player_xg_league(p_league text, p_season int, p_phase text)
returns table (player_id text, league_id text, season int, phase text, attempts bigint, unblocked bigint, goals bigint, xg numeric)
language sql stable as $$
  select e.player_ids[1], g.league_id, g.season, g.phase,
    count(*),
    count(*) filter (where e.payload->>'result' <> 'blocked'),
    count(*) filter (where e.payload->>'result' = 'goal'),
    round(sum(coalesce(e.xg, 0))::numeric, 2)
  from game g
  join game_event e on e.game_id = g.id and e.type = 'shot'
  where g.league_id = p_league and g.season = p_season and g.phase = p_phase and e.player_ids[1] is not null
  group by 1, 2, 3, 4
$$;

create or replace function player_xg_players(p_players text[])
returns table (player_id text, league_id text, season int, phase text, attempts bigint, unblocked bigint, goals bigint, xg numeric)
language sql stable as $$
  select e.player_ids[1], g.league_id, g.season, g.phase,
    count(*),
    count(*) filter (where e.payload->>'result' <> 'blocked'),
    count(*) filter (where e.payload->>'result' = 'goal'),
    round(sum(coalesce(e.xg, 0))::numeric, 2)
  from game_event e
  join game g on g.id = e.game_id
  where e.type = 'shot' and e.player_ids[1] = any(p_players)
  group by 1, 2, 3, 4
$$;
