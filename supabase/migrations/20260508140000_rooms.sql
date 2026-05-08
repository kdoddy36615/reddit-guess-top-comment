-- ============================================================================
-- Multiplayer rooms — `room_metadata` + `room_players`
--
-- Per PRD §Schema additions (issue #16) and the multiplayer spec settled in
-- /grill-me. Two enter-paths:
--   - Random matchmaking: server-managed lobby, max 8, locked at 8 rounds/30s.
--   - Host-created: 6-char code, max 32, host-configurable rounds/timer.
--
-- `game_sessions.mode='room', room_id=<code>` joins to `room_metadata.code`.
-- Room metadata lives in its own table so a single room can host multiple
-- matches (replay flow inserts a fresh `game_sessions` row, leaves
-- `room_metadata` intact, and resets status='lobby').
--
-- Player references `public.players(id)` rather than `auth.users(id)` —
-- same convention as `game_sessions`, `guesses`, `daily_run_totals`. Keeps
-- the player identity layer consistent so linkIdentity() upgrades preserve
-- room history (and keeps RLS policies in line with the rest of the schema).
--
-- RLS: a player can SELECT room_metadata + room_players rows for any room
-- they have a row in (i.e., they joined). Writes (insert/update/delete) are
-- service_role only — host actions (start, kick, lock, settings) all flow
-- through route handlers that bypass RLS. There's no client-direct write
-- path; the server enforces who-can-do-what at the API layer.
-- ============================================================================

-- ============================================================================
-- 1. room_metadata — one row per room code (table first; policies below
--    after room_players exists, since the policy references it).
-- ============================================================================
create table public.room_metadata (
  code           text primary key,
  host_id        uuid references public.players(id) on delete set null,
  mode           text not null check (mode in ('random', 'host')),
  max_players    integer not null check (max_players between 2 and 32),
  round_count    integer not null default 8 check (round_count between 3 and 20),
  timer_seconds  integer not null default 30 check (timer_seconds between 10 and 120),
  status         text not null default 'lobby'
                       check (status in ('lobby', 'live', 'ended')),
  locked         boolean not null default false,
  created_at     timestamptz not null default now(),
  started_at     timestamptz,
  ended_at       timestamptz
);

create index room_metadata_status_idx on public.room_metadata (status);
create index room_metadata_mode_status_idx
  on public.room_metadata (mode, status, locked)
  where status = 'lobby';

alter table public.room_metadata enable row level security;

-- ============================================================================
-- 2. room_players — players currently in or joined to a room
-- ============================================================================
create table public.room_players (
  room_code   text not null
                  references public.room_metadata(code) on delete cascade,
  player_id   uuid not null
                  references public.players(id) on delete cascade,
  is_kicked   boolean not null default false,
  joined_at   timestamptz not null default now(),
  primary key (room_code, player_id)
);

create index room_players_player_idx on public.room_players (player_id);

alter table public.room_players enable row level security;

-- ============================================================================
-- Policies — both tables now exist, so cross-references resolve.
-- ============================================================================
create policy "room_metadata: read if member"
  on public.room_metadata for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.room_players rp
      where rp.room_code = code
        and rp.player_id in (
          select p.id from public.players p where p.auth_user_id = auth.uid()
        )
    )
  );

-- All writes are service_role (admin transitions, host actions via route
-- handlers). No client-facing insert/update/delete policies.

grant select on public.room_metadata to anon, authenticated;

create policy "room_players: read if same room"
  on public.room_players for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.room_players self
      where self.room_code = room_players.room_code
        and self.player_id in (
          select p.id from public.players p where p.auth_user_id = auth.uid()
        )
    )
  );

-- Writes (join, kick, leave) are service_role only. Joining is gated by a
-- route handler that checks lock + capacity + status='lobby' before inserting.

grant select on public.room_players to anon, authenticated;
