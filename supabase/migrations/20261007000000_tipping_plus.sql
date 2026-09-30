-- Tipping league, round two: joker (double points), long-term bonus questions, group wall.

alter table tip add column if not exists joker boolean not null default false;

-- Points for a tip including the joker multiplier.
create or replace function tip_score(th int, ta int, h int, a int, decided text, joker boolean) returns int
  language sql immutable as $$
  select tip_points(th, ta, h, a, decided) * case when joker then 2 else 1 end
$$;

-- Season-long questions ("Who wins the title?"): a pick from options until locks_at.
create table if not exists tip_bonus_question (
  id text primary key,                 -- 'cz-elh-2026-champion'
  league_key text not null,
  season int not null,
  title text not null,
  options jsonb not null,              -- [{id, name, logo}]
  points int not null,
  locks_at timestamptz not null,
  answer text,
  settled_at timestamptz,
  sort int not null default 100
);

create table if not exists tip_bonus_answer (
  user_id uuid not null references tip_user(id) on delete cascade,
  question_id text not null references tip_bonus_question(id) on delete cascade,
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table if not exists tip_group_message (
  id bigserial primary key,
  group_id uuid not null references tip_group(id) on delete cascade,
  user_id uuid not null references tip_user(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists tip_group_message_idx on tip_group_message (group_id, id desc);

alter table tip_bonus_question enable row level security;
alter table tip_bonus_answer enable row level security;
alter table tip_group_message enable row level security;
