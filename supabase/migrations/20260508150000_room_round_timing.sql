-- ============================================================================
-- Room round timing — `current_round_started_at` + `current_round_revealed_at`
--
-- Multiplayer rooms (slice 45) need server-authoritative timestamps for the
-- round timer ring and the 5s reveal hold so all clients converge on the
-- same auto-advance moment regardless of skew.
--
-- Semantics:
--   - `current_round_started_at` set when a round enters `guessing`. Round
--     ends at `current_round_started_at + (room.timer_seconds * interval '1s')`.
--   - `current_round_revealed_at` set when the round flips to `revealed`.
--     The 5s reveal hold ends at `current_round_revealed_at + interval '5s'`,
--     after which the next round is served.
--
-- Both columns are nullable: solo / daily sessions don't use them (their
-- reveal advance is manual via `[next round →]`). Only room-mode flows write
-- to these columns.
-- ============================================================================

alter table public.game_sessions
  add column if not exists current_round_started_at  timestamptz,
  add column if not exists current_round_revealed_at timestamptz;
