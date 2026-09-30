-- Tipping league: accounts, sessions, private groups, score tips and settled results.

create table if not exists tip_user (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  nickname_key text generated always as (lower(nickname)) stored unique,
  pass_hash text not null,
  club_id text references team(id),
  failed_logins int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists tip_session (
  token_hash text primary key,
  user_id uuid not null references tip_user(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists tip_session_user_idx on tip_session (user_id);

create table if not exists tip_group (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  owner_id uuid not null references tip_user(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists tip_group_member (
  group_id uuid not null references tip_group(id) on delete cascade,
  user_id uuid not null references tip_user(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Game snapshot at tipping time (feeds have no stable game table for future NHL/ELH games).
create table if not exists tip_game (
  game_id text primary key,
  league_key text not null,
  play_date date not null,
  start_at timestamptz not null,
  home_name text not null,
  away_name text not null,
  home_logo text,
  away_logo text,
  model_home int,
  model_away int,
  home_score int,
  away_score int,
  decided_in text,
  settled_at timestamptz
);
create index if not exists tip_game_unsettled_idx on tip_game (start_at) where settled_at is null;

create table if not exists tip (
  user_id uuid not null references tip_user(id) on delete cascade,
  game_id text not null references tip_game(game_id) on delete cascade,
  home int not null check (home between 0 and 20),
  away int not null check (away between 0 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);
create index if not exists tip_game_idx on tip (game_id);

-- Points for a tip: 5 exact (60-min result), 3 winner + goal difference, 2 winner, else 0.
-- Overtime/shootout games count as the regulation draw (level score).
create or replace function tip_points(th int, ta int, h int, a int, decided text) returns int
  language sql immutable as $$
  select case
    when h is null or a is null then null
    else (
      with r as (
        select case when decided in ('OT', 'SO') then least(h, a) else h end as rh,
               case when decided in ('OT', 'SO') then least(h, a) else a end as ra
      )
      select case
        when th = rh and ta = ra then 5
        when sign(th - ta) <> sign(rh - ra) then 0
        when th - ta = rh - ra then 3
        else 2
      end from r
    )
  end
$$;

alter table tip_user enable row level security;
alter table tip_session enable row level security;
alter table tip_group enable row level security;
alter table tip_group_member enable row level security;
alter table tip_game enable row level security;
alter table tip enable row level security;
