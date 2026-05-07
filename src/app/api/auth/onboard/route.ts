import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPlayer, getPlayerByAuthId } from '@/db/players';
import { createSsrClient } from '@/lib/supabase/ssr';

export const runtime = 'nodejs';

const Body = z.object({
  nickname: z.string().trim().min(1).max(40),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid nickname' }, { status: 400 });
  }

  const supabase = await createSsrClient();
  const { data: userResp } = await supabase.auth.getUser();
  const authUser = userResp.user;
  if (!authUser) {
    return NextResponse.json(
      { error: 'No auth user — call signInAnonymously() first' },
      { status: 401 },
    );
  }

  // Idempotent: if a player already exists, return it (matches "returning visitor" path).
  const existing = await getPlayerByAuthId(supabase, authUser.id);
  if (existing) {
    return NextResponse.json({ player: existing });
  }

  const player = await createPlayer(supabase, {
    authUserId: authUser.id,
    nickname: parsed.data.nickname,
  });
  return NextResponse.json({ player });
}
