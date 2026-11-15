import { describe, it, expect, beforeEach } from 'vitest';
import { installInviteAllowed, snoozeInstallInvite, INSTALL_INVITE_SNOOZE_MS } from '../installInvite';

describe('installInvite', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('never invites on the first visit, even after several pages', () => {
    expect(installInviteAllowed()).toBe(false);
    expect(installInviteAllowed()).toBe(false); // même session : pas une nouvelle visite
  });

  it('invites from the second visit on', () => {
    installInviteAllowed();
    window.sessionStorage.clear(); // nouvelle session
    expect(installInviteAllowed()).toBe(true);
  });

  it('stays quiet for 30 days after « Fechar », then invites again', () => {
    window.localStorage.setItem('amds-visits', '5');
    const now = 1_000_000_000_000;
    snoozeInstallInvite(now);
    expect(installInviteAllowed(now + 1000)).toBe(false);
    expect(installInviteAllowed(now + INSTALL_INVITE_SNOOZE_MS - 1)).toBe(false);
    expect(installInviteAllowed(now + INSTALL_INVITE_SNOOZE_MS + 1)).toBe(true);
  });
});
