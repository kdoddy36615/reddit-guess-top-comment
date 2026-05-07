import type { ReactNode } from 'react';
import { getAvatarMenuState } from '@/lib/auth/avatar-menu-state';
import { getCurrentAuthStatus, getCurrentPlayer } from '@/lib/auth/current-player';
import { AppLayoutShell } from './app-layout-shell';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [authStatus, player] = await Promise.all([getCurrentAuthStatus(), getCurrentPlayer()]);
  const menuState = getAvatarMenuState({
    isAnonymous: authStatus?.isAnonymous ?? null,
    nickname: player?.nickname ?? null,
  });
  return (
    <AppLayoutShell menuState={menuState} nickname={player?.nickname ?? null}>
      {children}
    </AppLayoutShell>
  );
}
