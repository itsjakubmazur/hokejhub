-- skater_career_log computes running totals over the whole box_skater history before any filter
-- can apply (6 s per game page). These functions filter the players first, then run the windows.

create index if not exists box_skater_team_idx on box_skater (team_id);

create or replace function skater_career_log_for(p_players text[])
returns table (
  player_id text, team_id text, game_id text, start_at timestamptz, league_id text, season int, phase text,
  g int, a int, pts int, career_gp bigint, career_g bigint, career_pts bigint, club_gp bigint, club_g bigint, club_pts bigint
)
language sql stable as $$
  select
    b.player_id, b.team_id, b.game_id, g.start_at, g.league_id, g.season, g.phase,
    b.g, b.a, b.pts,
    row_number() over w_all, sum(b.g) over w_all, sum(b.pts) over w_all,
    row_number() over w_team, sum(b.g) over w_team, sum(b.pts) over w_team
  from box_skater b
  join game g on g.id = b.game_id
  where g.status = 'final' and b.player_id = any(p_players)
  window
    w_all as (partition by b.player_id, g.league_id order by g.start_at, g.id rows unbounded preceding),
    w_team as (partition by b.player_id, g.league_id, b.team_id order by g.start_at, g.id rows unbounded preceding)
$$;

create or replace function game_milestones(p_game_id text)
returns table (player_id text, team_id text, kind text, value int)
language sql stable as $$
  with l as (
    select * from skater_career_log_for(array(select b.player_id from box_skater b where b.game_id = p_game_id))
    where game_id = p_game_id
  ),
  checks as (
    select l.player_id, l.team_id, 'career_gp' as kind, l.career_gp::int as value, 1 as step_in_game from l
    union all select l.player_id, l.team_id, 'club_gp', l.club_gp::int, 1 from l
    union all select l.player_id, l.team_id, 'career_g', l.career_g::int, l.g from l
    union all select l.player_id, l.team_id, 'club_g', l.club_g::int, l.g from l
    union all select l.player_id, l.team_id, 'career_pts', l.career_pts::int, l.pts from l
    union all select l.player_id, l.team_id, 'club_pts', l.club_pts::int, l.pts from l
  )
  select c.player_id, c.team_id, c.kind,
    (floor(c.value / case when c.kind like '%gp' then 100 else 50 end)
      * case when c.kind like '%gp' then 100 else 50 end)::int as value
  from checks c
  where c.step_in_game > 0
    and floor(c.value / case when c.kind like '%gp' then 100.0 else 50.0 end)
      > floor((c.value - c.step_in_game) / case when c.kind like '%gp' then 100.0 else 50.0 end)
    and c.value >= case when c.kind like '%gp' then 100 else 50 end
$$;
