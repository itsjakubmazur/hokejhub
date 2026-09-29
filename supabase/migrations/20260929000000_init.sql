-- HokejHub initial schema. See docs/architecture.md §4.
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Immutable wrapper so unaccent can be used in generated columns / indexes.
create or replace function unaccent_simple(text) returns text
  language sql immutable parallel safe
  as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

-- ---------- reference ----------
create table league (
  id text primary key,                 -- 'cz-elh', 'nhl', ...
  name text not null,
  short_name text not null,
  grp text not null default 'other',
  sort int not null default 100,
  source_ids jsonb not null default '{}'  -- {"esports": ["16"]}
);

create table season (
  id text primary key,                 -- 'nhl-20262027', 'cz-elh-2026'
  league_id text not null references league(id),
  label text not null,
  start_date date,
  end_date date
);

create table team (
  id text primary key,                 -- 'onl-165', 'nhl-13'
  league_id text references league(id),
  name text not null,
  short_name text not null,
  abbrev text not null,
  logo_url text,
  external jsonb not null default '{}',
  search tsvector generated always as (to_tsvector('simple', unaccent_simple(name || ' ' || short_name || ' ' || abbrev))) stored
);

create table player (
  id text primary key,                 -- 'nhl-8478402', 'cz-...'
  name text not null,
  birth_date date,
  position text,
  shoots text,
  nationality text,
  headshot text,
  external jsonb not null default '{}',
  search tsvector generated always as (to_tsvector('simple', unaccent_simple(name))) stored
);

create table roster (
  team_id text references team(id),
  season_id text references season(id),
  player_id text references player(id),
  number int,
  primary key (team_id, season_id, player_id)
);

-- ---------- games ----------
create table game (
  id text primary key,                 -- 'cz-532950', 'nhl-2026020001'
  source text not null,
  league_id text not null references league(id),
  season_id text references season(id),
  start_at timestamptz not null,
  home_team_id text not null references team(id),
  away_team_id text not null references team(id),
  status text not null,                -- scheduled|live|intermission|final|postponed|cancelled
  status_label text,
  period int,
  clock text,
  home_score int,
  away_score int,
  periods jsonb not null default '[]',
  decided_in text,                     -- REG|OT|SO
  series text,
  external jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
create index game_start_idx on game (start_at);
create index game_league_start_idx on game (league_id, start_at);
create index game_live_idx on game (status) where status in ('live', 'intermission');
create index game_home_idx on game (home_team_id, start_at);
create index game_away_idx on game (away_team_id, start_at);

create table game_event (
  game_id text not null references game(id) on delete cascade,
  seq int not null,
  type text not null,
  period int,
  period_seconds int,
  team_id text references team(id),
  player_ids text[],
  x real,
  y real,
  shot_type text,
  situation text,
  xg real,
  payload jsonb,
  primary key (game_id, seq)
);

create table game_state_log (
  game_id text not null references game(id) on delete cascade,
  at timestamptz not null default now(),
  status text,
  period int,
  clock text,
  home_score int,
  away_score int,
  strength text,
  win_prob_home real,
  primary key (game_id, at)
);

create table box_skater (
  game_id text references game(id) on delete cascade,
  player_id text references player(id),
  team_id text references team(id),
  toi_s int, g int, a int, pts int, pm int, sog int, hits int, blk int,
  fo_w int, fo_l int, pim int, pp_toi_s int, sh_toi_s int,
  extra jsonb,
  primary key (game_id, player_id)
);

create table box_goalie (
  game_id text references game(id) on delete cascade,
  player_id text references player(id),
  team_id text references team(id),
  toi_s int, sa int, ga int, sv_pct real,
  extra jsonb,
  primary key (game_id, player_id)
);

-- ---------- odds ----------
create table odds_snapshot (
  game_id text not null references game(id) on delete cascade,
  bookmaker text not null,
  market text not null default '1x2',
  phase text not null,                 -- pre|live
  home real, draw real, away real,
  captured_at timestamptz not null default now(),
  primary key (game_id, bookmaker, market, captured_at)
);

create table bet_distribution (
  game_id text not null references game(id) on delete cascade,
  captured_at timestamptz not null default now(),
  home_pct real, draw_pct real, away_pct real,
  payload jsonb,
  primary key (game_id, captured_at)
);

-- ---------- standings & stats ----------
create table standing_snapshot (
  league_id text references league(id),
  season_id text references season(id),
  date date not null,
  team_id text references team(id),
  gp int, w int, otw int, otl int, l int, gf int, ga int, pts int, rank int,
  primary key (league_id, season_id, date, team_id)
);

create table player_season_stats (
  player_id text references player(id),
  season_id text references season(id),
  team_id text references team(id),
  kind text not null,                  -- regular|playoff
  stats jsonb not null,
  primary key (player_id, season_id, team_id, kind)
);

-- ---------- predictions ----------
create table team_rating (
  team_id text references team(id),
  as_of date not null,
  elo real not null,
  att real,
  def real,
  primary key (team_id, as_of)
);

create table prediction (
  game_id text references game(id) on delete cascade,
  model text not null,
  version text not null,
  created_at timestamptz not null default now(),
  p_home real, p_draw real, p_away real,
  exp_home real, exp_away real,
  market_p jsonb,
  edge jsonb,
  primary key (game_id, model, version)
);

create table game_summary (
  game_id text primary key references game(id) on delete cascade,
  lang text not null default 'cs',
  text text not null,
  model text,
  created_at timestamptz not null default now()
);

-- ---------- personal (single user for now; user_id kept for future multi-user) ----------
create table favorite (
  user_id uuid not null,
  kind text not null,                  -- team|player|league
  ref_id text not null,
  primary key (user_id, kind, ref_id)
);

create table push_subscription (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);

create table notification_rule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  trigger text not null,               -- game_start|period_start|goal|fav_goal|power_play|tie|lead_change|close_finish|ot|so|final|odds_move|lineup|injury
  scope jsonb not null default '{}',   -- {"leagues":[], "teams":[], "players":[], "favoritesOnly":true}
  params jsonb not null default '{}',
  enabled boolean not null default true
);
create index notification_rule_trigger_idx on notification_rule (trigger) where enabled;
create index notification_rule_scope_idx on notification_rule using gin (scope);

create table notification_outbox (
  id bigserial primary key,
  user_id uuid not null,
  dedupe_key text not null unique,
  payload jsonb not null,
  url text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  error text
);
create index notification_outbox_pending_idx on notification_outbox (created_at) where sent_at is null;

-- ---------- ops ----------
create table source_health (
  source text primary key,
  last_ok_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  etag text,
  last_modified text
);

create table ingest_cursor (
  key text primary key,
  value jsonb not null
);

-- ---------- RLS: public read for sports data, everything else service-role only ----------
do $$
declare t text;
begin
  foreach t in array array['league','season','team','player','roster','game','game_event','game_state_log',
    'box_skater','box_goalie','odds_snapshot','bet_distribution','standing_snapshot','player_season_stats',
    'team_rating','prediction','game_summary']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (true)', t || '_read', t);
  end loop;
  foreach t in array array['favorite','push_subscription','notification_rule','notification_outbox','source_health','ingest_cursor']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
