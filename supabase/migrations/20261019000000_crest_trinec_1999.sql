-- Hand-checked crests the sources lack (files in apps/web/public/crests/).
-- HC Oceláři Třinec wore this crest from the 1999 rename until the start of 2014/15; hokej.cz
-- shows its later round dragon for those seasons.
insert into team_season_logo (team_id, league_id, season, logo_url, name)
select 'hcz-11', 'cz-elh', s, '/crests/trinec-1999.jpg', 'HC Oceláři Třinec' from generate_series(1999, 2013) s
on conflict (team_id, league_id, season) do update set logo_url = excluded.logo_url;
