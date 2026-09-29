-- Web push: per-device preferences + scoreboard snapshots for the rule engine.

alter table push_subscription add column if not exists prefs jsonb not null default '{}';
alter table push_subscription add column if not exists fail_count int not null default 0;

create table if not exists push_game_state (
  game_id text primary key,
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

alter table push_subscription enable row level security;
alter table push_game_state enable row level security;
alter table notification_outbox enable row level security;
