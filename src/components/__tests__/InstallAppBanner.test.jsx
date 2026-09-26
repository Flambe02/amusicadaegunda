import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import indexCss from '../../index.css?raw';

vi.mock('@/hooks/usePWAInstall', () => ({
  default: () => ({
    canInstall: false, isIOS: true, showIOSHint: true, updateAvailable: false,
    promptInstall: vi.fn(), dismissIOSHint: vi.fn(), applyUpdate: vi.fn(),
  }),
}));

import InstallAppBanner from '../InstallAppBanner';

describe('InstallAppBanner — jamais par-dessus des contrôles sur mobile', () => {
  it('sits just above the bottom nav on mobile; tablet and desktop positions unchanged', () => {
    const { container } = render(<InstallAppBanner />);
    const banner = container.querySelector('[data-install-banner]');
    expect(banner).not.toBeNull();
    expect(banner.className).toContain('max-md:bottom-[calc(var(--app-nav-h,0px)+0.5rem)]');
    expect(banner.className).toContain('bottom-[88px]');
    expect(banner.className).toContain('lg:bottom-6');
  });

  it('is hidden on mobile while a control screen is shown (feed, Catálogo, O Palco, karaoke player)', () => {
    const css = indexCss.replace(/\r\n/g, '\n'); // fins de ligne Windows (checkout local) ou Linux (CI)
    const rule = css.slice(css.indexOf('@media (max-width: 767px) {\n  body:has('));
    expect(rule).toMatch(/body:has\(\[data-feed-phase\], \[data-catalogo-stage\], \[data-palco\], \.karaoke-overlay\.km-m\) \[data-install-banner\] \{\s*display: none;/);
  });
});
