import type { ReactNode } from 'react';
import { AppBar } from '@/components/layout/app-bar';
import { Footer } from '@/components/layout/footer';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppBar />
      <main className="flex-1 mx-auto w-full px-4 md:px-6 sm:max-w-[600px] lg:max-w-[880px] xl:max-w-content">
        {children}
      </main>
      <Footer />
    </>
  );
}
