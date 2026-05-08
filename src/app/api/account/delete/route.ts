import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createSsrClient } from '@/lib/supabase/ssr';

export const runtime = 'nodejs';

/**
 * Permanently delete the calling user's account.
 *
 * The auth user is the source of truth: deleting it cascades through the
 * `auth_user_id on delete cascade` FK to `public.players`, which in turn
 * cascades to `guesses`, `game_sessions` (and so to `session_rounds`),
 * `daily_run_totals`, and `round_reports`. Migration
 * `20260508130000_cascade_player_deletes.sql` adds the missing cascade FKs
 * on `guesses.player_id` and `game_sessions.creator_player_id` so the chain
 * doesn't stall.
 *
 * Anonymous (signInAnonymously) users can also delete: the same cascade chain
 * applies. For anonymous users this is effectively "forget me" — the next
 * visit creates a fresh anonymous identity.
 */
export async function POST() {
  const ssr = await createSsrClient();
  const { data: userResp } = await ssr.auth.getUser();
  const authUser = userResp.user;
  if (!authUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(authUser.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Tear down the auth cookies so the client immediately reflects the gone
  // user. signOut() on the SSR client clears the auth cookies via the
  // setAll() hook we wired in lib/supabase/ssr.ts.
  await ssr.auth.signOut();

  return NextResponse.json({ ok: true });
}
