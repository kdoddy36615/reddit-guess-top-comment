-- ============================================================================
-- Cascade player deletes through guesses + game_sessions
--
-- The /account "delete account" path does `auth.admin.deleteUser(authUserId)`,
-- which cascades to public.players via the existing FK. From there we need
-- the rest of the player's data to follow — `daily_run_totals` and
-- `round_reports` already cascade on player_id, but `guesses` and
-- `game_sessions` were created without cascades and would block the delete.
-- This migration replaces those two FKs with `on delete cascade` so that a
-- single account deletion removes every row keyed to that player.
-- session_rounds already cascades on session_id, so removing game_sessions
-- pulls the round sequence with it.
-- ============================================================================

alter table public.guesses
  drop constraint guesses_player_id_fkey,
  add constraint guesses_player_id_fkey
    foreign key (player_id) references public.players(id) on delete cascade;

alter table public.game_sessions
  drop constraint game_sessions_creator_player_id_fkey,
  add constraint game_sessions_creator_player_id_fkey
    foreign key (creator_player_id) references public.players(id) on delete cascade;
