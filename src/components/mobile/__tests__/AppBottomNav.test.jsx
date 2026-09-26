import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppBottomNav from '../AppBottomNav';

const Icon = () => <svg />;
const ITEMS = [
  { value: 'inicio', label: 'Início', href: '/', icon: Icon },
  { value: 'karaoke', label: 'Karaokê', href: '/karaoke', icon: Icon },
];

afterEach(() => { vi.restoreAllMocks(); });

describe('AppBottomNav — hauteur publiée (étape 7)', () => {
  it('publishes its real height in --app-nav-h, so the mobile karaoke player stops above it; removed on unmount', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(93);
    const { unmount } = render(
      <MemoryRouter>
        <AppBottomNav items={ITEMS} activeValue="karaoke" />
      </MemoryRouter>
    );
    expect(document.documentElement.style.getPropertyValue('--app-nav-h')).toBe('93px');
    unmount();
    expect(document.documentElement.style.getPropertyValue('--app-nav-h')).toBe('');
  });
});
