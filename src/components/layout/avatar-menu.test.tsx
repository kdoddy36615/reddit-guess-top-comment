import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AvatarMenu } from './avatar-menu';

function getMenu() {
  return screen.getByRole('menu');
}

describe('AvatarMenu', () => {
  it('renders a trigger button labeled for screen readers and is closed by default', () => {
    render(<AvatarMenu state="anonymous" nickname={null} />);
    const trigger = screen.getByRole('button', { name: /open user menu/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens the menu when the trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<AvatarMenu state="anonymous" nickname={null} />);
    await user.click(screen.getByRole('button', { name: /open user menu/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open user menu/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('closes the menu when Escape is pressed', async () => {
    const user = userEvent.setup();
    render(<AvatarMenu state="anonymous" nickname={null} />);
    await user.click(screen.getByRole('button', { name: /open user menu/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  describe('anonymous variant', () => {
    it('shows Log in / Sign up / divider / Settings — and nothing else', async () => {
      const user = userEvent.setup();
      render(<AvatarMenu state="anonymous" nickname={null} />);
      await user.click(screen.getByRole('button', { name: /open user menu/i }));
      const menu = getMenu();
      expect(within(menu).getByRole('menuitem', { name: /log in/i })).toBeInTheDocument();
      expect(within(menu).getByRole('menuitem', { name: /sign up/i })).toBeInTheDocument();
      expect(within(menu).getByRole('menuitem', { name: /settings/i })).toBeInTheDocument();
      // separator before settings
      expect(within(menu).getByRole('separator')).toBeInTheDocument();
      // permanent/guest-only entries must not appear
      expect(within(menu).queryByRole('menuitem', { name: /save your scores/i })).toBeNull();
      expect(within(menu).queryByRole('menuitem', { name: /^account$/i })).toBeNull();
      expect(within(menu).queryByRole('menuitem', { name: /leaderboard/i })).toBeNull();
      expect(within(menu).queryByRole('menuitem', { name: /log out/i })).toBeNull();
    });

    it('renders no nickname header for anonymous users', async () => {
      const user = userEvent.setup();
      render(<AvatarMenu state="anonymous" nickname={null} />);
      await user.click(screen.getByRole('button', { name: /open user menu/i }));
      expect(screen.queryByTestId('avatar-menu-header')).toBeNull();
    });
  });

  describe('guest variant', () => {
    it('shows the nickname with "(guest)" tag, Save your scores → /account, Settings, Log out', async () => {
      const user = userEvent.setup();
      render(<AvatarMenu state="guest" nickname="kev" />);
      await user.click(screen.getByRole('button', { name: /open user menu/i }));
      const menu = getMenu();
      const header = within(menu).getByTestId('avatar-menu-header');
      expect(header.textContent).toContain('kev');
      expect(header.textContent).toMatch(/\(guest\)/);

      const save = within(menu).getByRole('menuitem', { name: /save your scores/i });
      expect(save).toHaveAttribute('href', '/account');
      expect(within(menu).getByRole('menuitem', { name: /settings/i })).toBeInTheDocument();
      expect(within(menu).getByRole('menuitem', { name: /log out/i })).toBeInTheDocument();
      expect(within(menu).getByRole('separator')).toBeInTheDocument();

      // anonymous-only / permanent-only entries must not appear
      expect(within(menu).queryByRole('menuitem', { name: /log in/i })).toBeNull();
      expect(within(menu).queryByRole('menuitem', { name: /sign up/i })).toBeNull();
      expect(within(menu).queryByRole('menuitem', { name: /^account$/i })).toBeNull();
      expect(within(menu).queryByRole('menuitem', { name: /leaderboard/i })).toBeNull();
    });
  });

  describe('permanent variant', () => {
    it('shows nickname / Account / Leaderboard / divider / Settings / Log out', async () => {
      const user = userEvent.setup();
      render(<AvatarMenu state="permanent" nickname="kev" />);
      await user.click(screen.getByRole('button', { name: /open user menu/i }));
      const menu = getMenu();
      const header = within(menu).getByTestId('avatar-menu-header');
      expect(header.textContent).toContain('kev');
      expect(header.textContent).not.toMatch(/\(guest\)/);

      expect(within(menu).getByRole('menuitem', { name: /^account$/i })).toBeInTheDocument();
      expect(within(menu).getByRole('menuitem', { name: /leaderboard/i })).toBeInTheDocument();
      expect(within(menu).getByRole('menuitem', { name: /settings/i })).toBeInTheDocument();
      expect(within(menu).getByRole('menuitem', { name: /log out/i })).toBeInTheDocument();
      expect(within(menu).getByRole('separator')).toBeInTheDocument();

      // anonymous-only entries must not appear
      expect(within(menu).queryByRole('menuitem', { name: /log in/i })).toBeNull();
      expect(within(menu).queryByRole('menuitem', { name: /sign up/i })).toBeNull();
      expect(within(menu).queryByRole('menuitem', { name: /save your scores/i })).toBeNull();
    });
  });

  describe('settings sheet', () => {
    it('opens a dialog when Settings is clicked, with sound + reduced-motion controls', async () => {
      const user = userEvent.setup();
      render(<AvatarMenu state="anonymous" nickname={null} />);
      await user.click(screen.getByRole('button', { name: /open user menu/i }));
      await user.click(screen.getByRole('menuitem', { name: /settings/i }));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      // sound on/off control (a checkbox-style switch)
      expect(within(dialog).getByRole('switch', { name: /sound/i })).toBeInTheDocument();
      // reduced-motion respect note
      expect(within(dialog).getByText(/reduced motion/i)).toBeInTheDocument();
    });
  });
});
