-- ============================================================================
-- Replay-friendly uniqueness on `game_sessions`
--
-- Slice 46 (the multiplayer end + replay flow) needs the same room code to
-- host multiple matches over time. The host clicks "play again" after a match
-- ends → the server inserts a fresh `game_sessions` row, leaves
-- `room_metadata` intact, and resets `room_metadata.status` to `lobby`.
--
-- The original schema's `unique (mode, room_id)` was correct when room mode
-- only ever had one session per code. Replay breaks that. We replace the
-- single unique constraint with two partial unique indexes:
--
--   1. Daily sessions still need `(mode, room_id)` uniqueness — one daily
--      session per `daily-YYYY-MM-DD` room_id ever.
--   2. Room sessions need uniqueness only on the *active* session — at most
--      one in-flight match per code at a time. A completed match keeps its
--      historical row; the next match gets a fresh row.
--
-- Solo sessions are unaffected by either index (room_id is null and Postgres
-- treats null as distinct in unique constraints; solo had no enforced
-- uniqueness in practice anyway).
-- ============================================================================

alter table public.game_sessions
  drop constraint if exists game_sessions_mode_room_id_key;

create unique index if not exists game_sessions_daily_room_id_unique_idx
  on public.game_sessions (mode, room_id)
  where mode = 'daily';

create unique index if not exists game_sessions_room_active_unique_idx
  on public.game_sessions (mode, room_id)
  where mode = 'room' and current_round_state <> 'session_complete';
