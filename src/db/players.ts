import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type Db = SupabaseClient<Database>;

export type Player = {
  id: string;
  authUserId: string;
  nickname: string;
};

export async function getPlayerByAuthId(db: Db, authUserId: string): Promise<Player | null> {
  const { data, error } = await db
    .from('players')
    .select('id, auth_user_id, nickname')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, authUserId: data.auth_user_id, nickname: data.nickname };
}

export async function createPlayer(
  db: Db,
  args: { authUserId: string; nickname: string },
): Promise<Player> {
  const { data, error } = await db
    .from('players')
    .insert({ auth_user_id: args.authUserId, nickname: args.nickname })
    .select('id, auth_user_id, nickname')
    .single();
  if (error) throw error;
  return { id: data.id, authUserId: data.auth_user_id, nickname: data.nickname };
}
