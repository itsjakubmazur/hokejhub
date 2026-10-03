-- HC Železárny Třinec (1994-1999): the crest from a club puck of the time, cut out and squared
-- (no flat copy of it is published anywhere we could find).
insert into team_season_logo (team_id, league_id, season, logo_url, name)
select 'hcz-11', 'cz-elh', s, '/crests/trinec-1994.png', 'HC Železárny Třinec' from generate_series(1994, 1998) s
on conflict (team_id, league_id, season) do update set logo_url = excluded.logo_url, name = excluded.name;
