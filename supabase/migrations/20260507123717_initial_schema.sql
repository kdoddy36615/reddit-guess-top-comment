-- ============================================================================
-- Initial schema for reddit-guess-top-comment
-- See PRD.md for design rationale. RLS policies follow Supabase guidance:
--   - Every public table has RLS enabled.
--   - UPDATE policies require matching SELECT policies (otherwise updates
--     silently fail).
--   - Service role bypasses RLS — used by cron jobs and admin operations.
--   - "Automatically expose new tables" is OFF in project settings; explicit
--     GRANTs below control which tables the Data API can reach.
-- ============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists vector;

-- ============================================================================
-- 1. rounds — Reddit content + LLM gate output + embedding (denormalized)
-- ============================================================================
create table public.rounds (
  id                  uuid primary key default gen_random_uuid(),
  reddit_post_id      text unique not null,
  subreddit           text not null,
  title               text not null,
  post_url            text not null,
  post_score          int  not null,
  top_comment_text    text not null,
  top_comment_score   int  not null,

  gate_verdict        text not null
                          check (gate_verdict in ('publish', 'reject')),
  gate_reasoning      text,
  difficulty          text not null
                          check (difficulty in ('easy', 'medium', 'hard')),
  punchline_word      text,
  key_noun            text,
  joke_structure      text,

  comment_embedding   vector(768),

  status              text not null default 'pending_gate'
                          check (status in (
                            'pending_gate', 'auto_published', 'rejected',
                            'reported', 'unpublished'
                          )),
  report_count        int  not null default 0,
  fetched_at          timestamptz not null default now(),
  published_at        timestamptz
);

create index rounds_eligible_idx
  on public.rounds (difficulty, published_at desc)
  where status = 'auto_published';

create index rounds_subreddit_idx
  on public.rounds (subreddit, published_at desc)
  where status = 'auto_published';

alter table public.rounds enable row level security;

create policy "rounds: read auto_published"
  on public.rounds for select
  to anon, authenticated
  using (status = 'auto_published');

grant select on public.rounds to anon, authenticated;

-- ============================================================================
-- 2. players — anonymous identity, optionally upgraded via linkIdentity
-- ============================================================================
create table public.players (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid not null unique
                    references auth.users(id) on delete cascade,
  nickname      text not null check (length(nickname) between 1 and 40),
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create index players_auth_user_idx on public.players (auth_user_id);

alter table public.players enable row level security;

create policy "players: read own"
  on public.players for select
  to authenticated
  using (auth.uid() = auth_user_id);

create policy "players: insert own"
  on public.players for insert
  to authenticated
  with check (auth.uid() = auth_user_id);

create policy "players: update own"
  on public.players for update
  to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

grant select, insert, update on public.players to authenticated;

-- ============================================================================
-- 3. game_sessions — solo, daily, or (future) room. Same table, same code path.
-- ============================================================================
create table public.game_sessions (
  id                   uuid primary key default gen_random_uuid(),
  mode                 text not null check (mode in ('solo', 'daily', 'room')),
  room_id              text,
  creator_player_id    uuid references public.players(id),
  current_round_id     uuid references public.rounds(id),
  current_round_state  text not null default 'guessing'
                          check (current_round_state in (
                            'guessing', 'revealed', 'session_complete'
                          )),
  created_at           timestamptz not null default now(),
  completed_at         timestamptz,
  unique (mode, room_id)
);

create index game_sessions_creator_idx
  on public.game_sessions (creator_player_id, created_at desc)
  where mode = 'solo';

alter table public.game_sessions enable row level security;

create policy "sessions: read daily"
  on public.game_sessions for select
  to anon, authenticated
  using (mode = 'daily');

create policy "sessions: read own solo"
  on public.game_sessions for select
  to authenticated
  using (
    creator_player_id in (
      select p.id from public.players p where p.auth_user_id = auth.uid()
    )
  );

create policy "sessions: insert own solo"
  on public.game_sessions for insert
  to authenticated
  with check (
    mode = 'solo'
    and creator_player_id in (
      select p.id from public.players p where p.auth_user_id = auth.uid()
    )
  );

-- State machine transitions happen via service_role (route handlers).

grant select, insert on public.game_sessions to anon, authenticated;

-- ============================================================================
-- 4. session_rounds — ordered round sequence per session
-- ============================================================================
create table public.session_rounds (
  session_id   uuid not null
                   references public.game_sessions(id) on delete cascade,
  round_index  int  not null check (round_index >= 0),
  round_id     uuid not null references public.rounds(id),
  primary key (session_id, round_index)
);

alter table public.session_rounds enable row level security;

create policy "session_rounds: read if session visible"
  on public.session_rounds for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.game_sessions s
      where s.id = session_id
        and (
          s.mode = 'daily'
          or s.creator_player_id in (
            select p.id from public.players p where p.auth_user_id = auth.uid()
          )
        )
    )
  );

grant select on public.session_rounds to anon, authenticated;

-- ============================================================================
-- 5. guesses — keyed (session, round, player). Immutable once submitted.
-- ============================================================================
create table public.guesses (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null
                      references public.game_sessions(id) on delete cascade,
  round_id        uuid not null references public.rounds(id),
  player_id       uuid not null references public.players(id),
  guess_text      text not null check (length(guess_text) between 1 and 500),
  score           int  not null check (score between 0 and 100),
  score_breakdown jsonb not null,
  submitted_at    timestamptz not null default now(),
  unique (session_id, round_id, player_id)
);

create index guesses_session_idx on public.guesses (session_id);
create index guesses_round_idx   on public.guesses (round_id);
create index guesses_player_idx  on public.guesses (player_id, submitted_at desc);

alter table public.guesses enable row level security;

create policy "guesses: read own"
  on public.guesses for select
  to authenticated
  using (
    player_id in (
      select p.id from public.players p where p.auth_user_id = auth.uid()
    )
  );

create policy "guesses: insert own"
  on public.guesses for insert
  to authenticated
  with check (
    player_id in (
      select p.id from public.players p where p.auth_user_id = auth.uid()
    )
  );

grant select, insert on public.guesses to authenticated;

-- ============================================================================
-- 6. guess_embedding_cache — server-side embedding cache
-- ============================================================================
create table public.guess_embedding_cache (
  normalized_text  text primary key,
  embedding        vector(768) not null,
  hit_count        int  not null default 1,
  created_at       timestamptz not null default now()
);

alter table public.guess_embedding_cache enable row level security;
-- No policies, no grants — service_role only (it bypasses RLS).

-- ============================================================================
-- 7. cron_budget — daily cost circuit breaker
-- ============================================================================
create table public.cron_budget (
  date          date primary key,
  gemini_calls  int not null default 0,
  reddit_calls  int not null default 0,
  est_cost_usd  numeric(10, 4) not null default 0,
  halted        boolean not null default false,
  halt_reason   text
);

alter table public.cron_budget enable row level security;
-- No policies, no grants — service_role only.

-- ============================================================================
-- 8. cron_runs — observability log
-- ============================================================================
create table public.cron_runs (
  id            uuid primary key default gen_random_uuid(),
  job_name      text not null check (job_name in ('pull', 'process')),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  candidates    int,
  publishes     int,
  rejects       int,
  error         text
);

create index cron_runs_recent_idx on public.cron_runs (started_at desc);

alter table public.cron_runs enable row level security;
-- No policies, no grants — service_role only.
