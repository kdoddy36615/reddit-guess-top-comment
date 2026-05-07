import type { ReactNode } from 'react';
import { AppBar } from '@/components/layout/app-bar';
import { AvatarMenu } from '@/components/layout/avatar-menu';
import { Footer } from '@/components/layout/footer';
import type { AvatarMenuState } from '@/lib/auth/avatar-menu-state';

export interface AppLayoutShellProps {
  children: ReactNode;
  menuState: AvatarMenuState;
  nickname: string | null;
}

export function AppLayoutShell({ children, menuState, nickname }: AppLayoutShellProps) {
  return (
    <>
      <AppBar actions={<AvatarMenu state={menuState} nickname={nickname} />} />
      <main className="flex-1 mx-auto w-full px-4 md:px-6 sm:max-w-[600px] lg:max-w-[880px] xl:max-w-content">
        {children}
      </main>
      <Footer />
    </>
  );
}
