import { describe, it, expect } from 'vitest';
import indexCss from '../index.css?raw';
import layoutSource from '../pages/Layout.jsx?raw';

// PWA installée sur iPhone (barre d'état translucide) : 100svh y est plus court que
// l'écran → bande vide sous la barre de navigation. En standalone, #root couvre tout
// l'écran et la coquille mobile le suit.
describe('PWA installée — la coquille mobile couvre tout l\u2019écran', () => {
  const css = indexCss.replace(/\r\n/g, '\n');

  it('in standalone mode on phones, #root is fixed to the whole screen, on a black background', () => {
    const block = css.slice(css.indexOf('@media (max-width: 767px) and (display-mode: standalone) {'));
    expect(block).toMatch(/^@media \(max-width: 767px\) and \(display-mode: standalone\) \{/);
    expect(block).toMatch(/#root \{\s*position: fixed;\s*inset: 0;\s*height: auto;\s*min-height: 0;/);
    expect(block).toMatch(/html,\s*body \{\s*background: #000;/);
  });

  it('the mobile shell follows #root (h-full), not 100svh', () => {
    expect(layoutSource).toMatch(/className="md:hidden relative flex min-h-0 flex-col h-full overflow-hidden bg-black text-white"/);
    expect(layoutSource).not.toMatch(/md:hidden[^"]*\bh-svh\b/);
  });
});
