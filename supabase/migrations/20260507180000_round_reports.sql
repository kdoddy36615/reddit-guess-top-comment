-- ============================================================================
-- round_reports — per-(player, round) report records, idempotent by PK.
--
-- Threshold-based auto-unpublish lives in the application layer (`src/db/reports.ts`)
-- so the threshold can be tuned without a migration. The `rounds.report_count`
-- + `rounds.status` columns already exist in the initial schema; this migration
-- just adds the report ledger and access policies.
-- ============================================================================

create table public.round_reports (
  round_id    uuid not null references public.rounds(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  reason      text check (reason is null or length(reason) between 1 and 500),
  reported_at timestamptz not null default now(),
  primary key (round_id, player_id)
);

create index round_reports_round_idx
  on public.round_reports (round_id, reported_at desc);

alter table public.round_reports enable row level security;
-- No policies, no grants — service_role only (route handler bypasses RLS).
