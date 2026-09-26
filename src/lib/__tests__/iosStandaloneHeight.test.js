import { describe, it, expect, beforeEach } from 'vitest';
import indexCss from '../../index.css?raw';
import mainSource from '../../main.jsx?raw';
import { applyIosStandaloneHeight, measureIosStandaloneHeight, ATTR, VAR } from '../iosStandaloneHeight';

// Faux window : iPhone 390×844, viewport raccourci de la barre d'état (47 px) en app installée.
function fakeWin({ standalone = true, screen = { width: 390, height: 844 }, innerWidth = 390, innerHeight = 797, landscape = false } = {}) {
  return {
    navigator: standalone === 'absent' ? {} : { standalone },
    screen,
    innerWidth,
    innerHeight,
    matchMedia: (q) => ({ matches: q === '(orientation: landscape)' ? landscape : false }),
    document: { documentElement: document.documentElement },
  };
}

describe('App installée iPhone — #root à la hauteur réelle de l’écran', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute(ATTR);
    document.documentElement.style.removeProperty(VAR);
  });

  it('installed app with a shortened viewport: publishes the screen height', () => {
    expect(applyIosStandaloneHeight(fakeWin())).toBe(844);
    expect(document.documentElement.hasAttribute(ATTR)).toBe(true);
    expect(document.documentElement.style.getPropertyValue(VAR)).toBe('844px');
  });

  it('does nothing when the viewport already fills the screen (bug absent or fixed by Apple)', () => {
    expect(applyIosStandaloneHeight(fakeWin({ innerHeight: 844 }))).toBeNull();
    expect(document.documentElement.hasAttribute(ATTR)).toBe(false);
  });

  it('does nothing in Safari, Android, desktop and TV (no navigator.standalone === true)', () => {
    expect(measureIosStandaloneHeight(fakeWin({ standalone: false }))).toBeNull();
    expect(measureIosStandaloneHeight(fakeWin({ standalone: 'absent' }))).toBeNull();
  });

  it('removes the attribute when the gap disappears', () => {
    applyIosStandaloneHeight(fakeWin());
    applyIosStandaloneHeight(fakeWin({ innerHeight: 844 }));
    expect(document.documentElement.hasAttribute(ATTR)).toBe(false);
    expect(document.documentElement.style.getPropertyValue(VAR)).toBe('');
  });

  it('landscape uses the short side of the screen', () => {
    expect(measureIosStandaloneHeight(fakeWin({ landscape: true, innerWidth: 844, innerHeight: 360 }))).toBe(390);
  });

  it('ignores a window narrower than the screen (iPad Split View) and gaps larger than a status bar', () => {
    expect(measureIosStandaloneHeight(fakeWin({ screen: { width: 820, height: 1180 }, innerWidth: 400, innerHeight: 1150 }))).toBeNull();
    expect(measureIosStandaloneHeight(fakeWin({ innerHeight: 500 }))).toBeNull();
  });

  it('CSS: in standalone mode on phones, #root takes --app-screen-h only when the attribute is set', () => {
    const css = indexCss.replace(/\r\n/g, '\n');
    const block = css.slice(css.indexOf('@media (max-width: 767px) and (display-mode: standalone) {'));
    expect(block).toMatch(/html\[data-ios-standalone\] #root \{\s*bottom: auto;\s*height: var\(--app-screen-h\);/);
  });

  it('main.jsx starts the measurement before React mounts', () => {
    expect(mainSource).toMatch(/initIosStandaloneHeight\(\)/);
    expect(mainSource.indexOf('initIosStandaloneHeight()')).toBeLessThan(mainSource.indexOf('createRoot'));
  });
});
