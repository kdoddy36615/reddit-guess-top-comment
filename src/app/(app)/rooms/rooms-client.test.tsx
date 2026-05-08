import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetToasts } from '@/components/ui/toast';
import { RoomsClient } from './rooms-client';

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, refresh: vi.fn() }),
}));

const mockFetch = vi.fn();

beforeEach(() => {
  __resetToasts();
  mockReplace.mockReset();
  mockPush.mockReset();
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RoomsClient — entry hub', () => {
  it('renders three options: join random, create room, and join by code', () => {
    render(<RoomsClient />);
    expect(screen.getByTestId('join-random-card')).toBeInTheDocument();
    expect(screen.getByTestId('create-room-card')).toBeInTheDocument();
    expect(screen.getByTestId('join-by-code-card')).toBeInTheDocument();
  });

  it('Join random posts to /api/rooms/random and redirects to /r/{code}', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ code: 'ABCDEF' }),
    });
    render(<RoomsClient />);
    await user.click(screen.getByTestId('join-random-button'));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/rooms/random',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockReplace).toHaveBeenCalledWith('/r/ABCDEF');
  });

  it('Create room posts to /api/rooms/create and redirects to /r/{code}', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ code: 'XYZ234' }),
    });
    render(<RoomsClient />);
    await user.click(screen.getByTestId('create-room-button'));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/rooms/create',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockReplace).toHaveBeenCalledWith('/r/XYZ234');
  });

  it('rejects invalid codes client-side without calling the API', async () => {
    const user = userEvent.setup();
    render(<RoomsClient />);
    const input = screen.getByTestId('join-code-input');
    await user.type(input, 'BAD');
    await user.click(screen.getByTestId('join-code-button'));
    expect(mockFetch).not.toHaveBeenCalled();
    expect(screen.getByTestId('join-code-error')).toBeInTheDocument();
  });

  it('uppercases the code, posts to /api/rooms/join, and redirects to /r/{code} on success', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ code: 'ABCDEF' }),
    });
    render(<RoomsClient />);
    const input = screen.getByTestId('join-code-input');
    await user.type(input, 'abcdef');
    await user.click(screen.getByTestId('join-code-button'));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/rooms/join',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ code: 'ABCDEF' }),
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith('/r/ABCDEF');
  });

  it('surfaces a server error from /api/rooms/join (e.g. unknown code)', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Room not found' }),
    });
    render(<RoomsClient />);
    const input = screen.getByTestId('join-code-input');
    await user.type(input, 'ABCDEF');
    await user.click(screen.getByTestId('join-code-button'));
    expect(screen.getByTestId('join-code-error')).toHaveTextContent(/Room not found/i);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('disables join-random button while the request is in flight', async () => {
    const user = userEvent.setup();
    let resolveFetch: (v: { ok: boolean; json: () => Promise<unknown> }) => void = () => {};
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    render(<RoomsClient />);
    const button = screen.getByTestId('join-random-button');
    await user.click(button);
    expect(button).toBeDisabled();
    resolveFetch({ ok: true, json: async () => ({ code: 'ABCDEF' }) });
  });
});
