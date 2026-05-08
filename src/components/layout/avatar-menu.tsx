'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { AvatarMenuState } from '@/lib/auth/avatar-menu-state';
import { cn } from '@/lib/cn';

export interface AvatarMenuProps {
  state: AvatarMenuState;
  nickname: string | null;
  /** Optional log-out hook. Wired by the SSR-aware wrapper in a later slice. */
  onLogOut?: () => void;
}

export function AvatarMenu({ state, nickname, onLogOut }: AvatarMenuProps) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  const trimmedNickname = nickname?.trim() ?? '';
  const displayName = trimmedNickname.length > 0 ? trimmedNickname : 'anon';
  const closeMenu = () => setOpen(false);
  const openSettings = () => {
    setOpen(false);
    setSettingsOpen(true);
  };
  const handleLogOut = () => {
    setOpen(false);
    onLogOut?.();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="open user menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <Avatar
          name={displayName}
          size="md"
          variant={state === 'permanent' ? 'you' : 'default'}
          slot={state === 'permanent' ? undefined : slotFor(displayName)}
        />
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="user menu"
          className={cn(
            'absolute right-2 top-full z-50 mt-2 w-56 overflow-hidden rounded-md border border-border-strong bg-surface-2 py-1 text-sm text-text shadow-[var(--shadow-md)]',
            'motion-safe:animate-[dialog-content-in_var(--duration-base,200ms)_var(--ease-out)]',
          )}
        >
          {state !== 'anonymous' ? (
            <div
              data-testid="avatar-menu-header"
              className="flex items-baseline gap-1.5 px-3 py-2 font-medium"
            >
              <span className="truncate">{displayName}</span>
              {state === 'guest' ? <span className="text-xs text-text-muted">(guest)</span> : null}
            </div>
          ) : null}

          {state === 'anonymous' ? (
            <>
              <MenuLink href="/login" onSelect={closeMenu}>
                Log in
              </MenuLink>
              <MenuLink href="/signup" onSelect={closeMenu}>
                Sign up
              </MenuLink>
              <MenuSeparator />
              <MenuButton onSelect={openSettings}>Settings</MenuButton>
            </>
          ) : null}

          {state === 'guest' ? (
            <>
              <MenuLink href="/account" onSelect={closeMenu}>
                Save your scores
              </MenuLink>
              <MenuSeparator />
              <MenuButton onSelect={openSettings}>Settings</MenuButton>
              <MenuButton onSelect={handleLogOut}>Log out</MenuButton>
            </>
          ) : null}

          {state === 'permanent' ? (
            <>
              <MenuLink href="/account" onSelect={closeMenu}>
                Account
              </MenuLink>
              <MenuLink href="/leaderboard" onSelect={closeMenu}>
                Leaderboard
              </MenuLink>
              <MenuSeparator />
              <MenuButton onSelect={openSettings}>Settings</MenuButton>
              <MenuButton onSelect={handleLogOut}>Log out</MenuButton>
            </>
          ) : null}
        </div>
      ) : null}

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

function MenuLink({
  href,
  onSelect,
  children,
}: {
  href: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      role="menuitem"
      href={href}
      onClick={onSelect}
      className="block px-3 py-2 text-sm text-text outline-none hover:bg-surface focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
    >
      {children}
    </Link>
  );
}

function MenuButton({ onSelect, children }: { onSelect: () => void; children: React.ReactNode }) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onSelect}
      className="block w-full px-3 py-2 text-left text-sm text-text outline-none hover:bg-surface focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
    >
      {children}
    </button>
  );
}

function MenuSeparator() {
  return <hr className="my-1 border-0 border-t border-border" />;
}

function slotFor(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function SettingsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [soundOn, setSoundOn] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>
          Lightweight preferences. More options will land alongside the multiplayer slices.
        </DialogDescription>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-3">
          <span id="settings-sound-label" className="text-sm text-text">
            Sound
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={soundOn}
            aria-labelledby="settings-sound-label"
            onClick={() => setSoundOn((s) => !s)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill border border-border-strong transition-colors duration-[var(--duration-fast,120ms)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
              soundOn ? 'bg-accent' : 'bg-surface-3',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'inline-block h-4 w-4 rounded-full bg-text shadow-[var(--shadow-sm)] transition-transform duration-[var(--duration-fast,120ms)]',
                soundOn ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
        </div>

        <p className="mt-3 text-xs text-text-muted">
          Reduced motion: this app respects your system{`'`}s prefers-reduced-motion setting and
          minimizes animation when it{`'`}s enabled.
        </p>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-pill border border-border-strong bg-surface px-4 py-2 text-sm text-text hover:bg-surface-2/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
