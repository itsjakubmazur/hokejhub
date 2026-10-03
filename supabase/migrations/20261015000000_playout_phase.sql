-- The play-out groups after the regular season ("Extraliga - o udržení" 1993-95, "… – o umístění"
-- 2007-2019) were classified as regular season because their names contain "extraliga": their
-- games inflated regular-season totals and the standings of those seasons (64 or 58 games for the
-- bottom four). They are play-out, stored with the relegation phase. Season rows are rebuilt
-- afterwards with refresh_stats_season.
update competition set phase = 'relegation'
where league_id = 'cz-elh' and phase = 'regular' and (name ilike '%o udržení%' or name ilike '%o umístění%');

update game g set phase = 'relegation'
from competition c
where g.competition_id = c.id and g.league_id = 'cz-elh' and g.phase = 'regular'
  and (c.name ilike '%o udržení%' or c.name ilike '%o umístění%');
