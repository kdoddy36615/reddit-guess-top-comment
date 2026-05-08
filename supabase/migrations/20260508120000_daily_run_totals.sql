-- ============================================================================
-- daily_run_totals — leaderboard aggregate (one row per player per daily room)
--
-- Populated when a player completes all 5 rounds of a daily session. Powers
-- the today / week / all-time tabs on /leaderboard.
--
-- Player references public.players(id) (same convention as game_sessions and
-- guesses), not auth.users(id) directly — keeps the player identity layer
-- consistent so that linkIdentity() upgrades preserve leaderboard history.
--
-- RLS: select for any authenticated session (anonymous-signed-in players are
-- still `authenticated` for RLS — they can see the board but cannot write to
-- it because no insert/update policy is granted; writes are service-role only).
-- ============================================================================

create table public.daily_run_totals (
  player_id     uuid not null
                    references public.players(id) on delete cascade,
  daily_room_id text not null,
  total_score   integer not null check (total_score >= 0),
  completed_at  timestamptz not null default now(),
  primary key (player_id, daily_room_id)
);

create index daily_run_totals_room_score_idx
  on public.daily_run_totals (daily_room_id, total_score desc);

create index daily_run_totals_completed_at_idx
  on public.daily_run_totals (completed_at desc);

alter table public.daily_run_totals enable row level security;

create policy "daily_run_totals: read all"
  on public.daily_run_totals for select
  to authenticated
  using (true);

-- No insert/update/delete policies — writes happen via service_role only
-- (route handler at end-of-daily-session that bypasses RLS).

grant select on public.daily_run_totals to authenticated;
