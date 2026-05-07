import { describe, expect, it } from 'vitest';
import { getAvatarMenuState } from './avatar-menu-state';

describe('getAvatarMenuState', () => {
  it('returns "anonymous" when there is no auth session at all', () => {
    expect(getAvatarMenuState({ isAnonymous: null, nickname: null })).toBe('anonymous');
  });

  it('returns "anonymous" when an anon session exists but no nickname has been chosen', () => {
    expect(getAvatarMenuState({ isAnonymous: true, nickname: null })).toBe('anonymous');
    expect(getAvatarMenuState({ isAnonymous: true, nickname: '' })).toBe('anonymous');
    expect(getAvatarMenuState({ isAnonymous: true, nickname: '   ' })).toBe('anonymous');
  });

  it('returns "guest" when the session is anonymous and a nickname is set', () => {
    expect(getAvatarMenuState({ isAnonymous: true, nickname: 'kev' })).toBe('guest');
  });

  it('returns "permanent" when the session is non-anonymous (linkIdentity’d)', () => {
    expect(getAvatarMenuState({ isAnonymous: false, nickname: 'kev' })).toBe('permanent');
  });

  it('still returns "permanent" if a permanent user somehow has no nickname yet', () => {
    // Defensive: nickname is required at signup so this is unusual, but the menu
    // shouldn’t collapse a permanent user back to "anonymous" because of it.
    expect(getAvatarMenuState({ isAnonymous: false, nickname: null })).toBe('permanent');
  });
});
