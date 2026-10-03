-- 1992/93 was the last Czechoslovak league (Slovan Bratislava, Poprad, Trenčín…), not the
-- extraliga, which starts in 1993/94. hokej.cz lists it among the extraliga seasons, so it was
-- stored as cz-elh and counted into extraliga careers, records and milestones. The games move to
-- a league of their own (nothing is deleted); the crawler now stores that season there too.
-- Season rows are rebuilt afterwards with refresh_stats_season for both leagues.
insert into league (id, name, short_name, grp, sort)
values ('cs-liga', 'Československá liga', 'ČSHL', 'cz', 90)
on conflict (id) do nothing;

insert into season (id, league_id, label, start_date, end_date)
select 'cs-liga-1992', 'cs-liga', label, start_date, end_date from season where id = 'cz-elh-1992'
on conflict (id) do nothing;
insert into season (id, league_id, label) values ('cs-liga-1992', 'cs-liga', '1992/93') on conflict (id) do nothing;

update game set league_id = 'cs-liga', season_id = 'cs-liga-1992'
where league_id = 'cz-elh' and season_id = 'cz-elh-1992';

update competition set league_id = 'cs-liga' where league_id = 'cz-elh' and season = 1992;
update standing_final set league_id = 'cs-liga' where league_id = 'cz-elh' and season = 1992;
