-- Club crests by season. hokej.cz match pages show the crest a club wore that season (from
-- about 2014/15; older seasons carry one crest per club), while team.logo_url is the current
-- crest from hokej.cz's navigation. Historical views (a past season's table, an old game, a
-- player's season row) read the crest of their season through season_logo().
create table if not exists team_season_logo (
  team_id text not null references team(id),
  league_id text not null,
  season int not null,
  logo_url text not null,
  name text,
  primary key (team_id, league_id, season)
);
grant select on team_season_logo to anon, authenticated;

create or replace function season_logo(p_team text, p_season int) returns text
language sql stable as $$
  select coalesce(
    (select l.logo_url from team_season_logo l where l.team_id = p_team and l.season = p_season
     order by l.league_id = 'cz-elh' desc limit 1),
    (select t.logo_url from team t where t.id = p_team))
$$;
