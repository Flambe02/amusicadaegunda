import { describe, it, expect } from 'vitest';
import { detectInterface } from '../interfaceRule';
import rootIndexHtml from '../../../index.html?raw';
import viteConfigSource from '../../../vite.config.js?raw';

// ── Fausse fenêtre ───────────────────────────────────────────────────────────────────
function fakeWindow({ ua = '', search = '', width = 390, height = 844, touch = 5, stored = null, capacitor = undefined, fine = false, anyFine = fine, ui = null } = {}) {
  const store = new Map();
  if (stored != null) store.set('force-tv', stored);
  if (ui != null) store.set('force-ui', ui);
  return {
    location: { search },
    navigator: { userAgent: ua, maxTouchPoints: touch },
    innerWidth: width,
    innerHeight: height,
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
    matchMedia: (query) => ({ matches: query === '(max-width: 767px)' ? width <= 767 : query === '(pointer: fine)' ? fine : query === '(any-pointer: fine)' ? anyFine : false }),
    Capacitor: capacitor,
    __store: store,
  };
}

// ── L'ancien isTV() (src/tv/platform.js avant la phase 1), recopié tel quel ──────────
// Référence : la nouvelle règle doit donner EXACTEMENT le même résultat, sauf `?tv=0`.
const OLD_TV_UA = /(SmartTV|Smart-TV|GoogleTV|Google TV|Android ?TV|AFT[A-Z]|BRAVIA|AQUOS|Web0S|WebOS|Tizen|HbbTV|NetCast|VIDAA|Roku|CrKey|\bTV\b)/i;
function oldIsTV(win, nativeAndroid) {
  const override = (() => {
    const p = new URLSearchParams(win.location.search);
    if (p.get('tv') === '1') { win.localStorage.setItem('force-tv', '1'); return true; }
    if (p.get('tv') === '0') { win.localStorage.removeItem('force-tv'); return false; }
    return win.localStorage.getItem('force-tv') === '1';
  })();
  if (override) return true;
  if (OLD_TV_UA.test(win.navigator.userAgent || '')) return true;
  const noTouch = (win.navigator.maxTouchPoints || 0) === 0;
  const wideLandscape = win.innerWidth >= 960 && win.innerWidth > win.innerHeight;
  return Boolean(nativeAndroid && noTouch && wideLandscape);
}

const UA = {
  phoneApp: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UQ1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36',
  tvBox: 'Mozilla/5.0 (Linux; Android 12; Chromecast Build/STTE; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Safari/537.36 AndroidTV',
  tvBoxNoTag: 'Mozilla/5.0 (Linux; Android 12; MiTV-AESP0 Build/STTE; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  chromePhone: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  tizen: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 7.0) AppleWebKit/537.36 (KHTML, like Gecko) 94.0.4606.31/7.0 TV Safari/537.36',
  webos: 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.5359.211 Safari/537.36 WebAppManager',
  fireTv: 'Mozilla/5.0 (Linux; Android 9; AFTMM Build/PS7233) AppleWebKit/537.36 (KHTML, like Gecko) Silk/112.5.1 like Chrome/112.0.5615.213 Safari/537.36',
};

describe('detectInterface — même résultat que l’ancien isTV()', () => {
  const sizes = [
    { width: 390, height: 844, touch: 5 },
    { width: 844, height: 390, touch: 5 },
    { width: 960, height: 540, touch: 0 },
    { width: 1920, height: 1080, touch: 0 },
    { width: 1280, height: 800, touch: 10 },
    { width: 800, height: 1280, touch: 10 },
    { width: 1366, height: 768, touch: 0 },
    { width: 959, height: 540, touch: 0 },
  ];
  const cases = [];
  for (const [name, ua] of Object.entries(UA)) {
    for (const size of sizes) {
      for (const nativeAndroid of [false, true]) {
        for (const [search, stored] of [['', null], ['?tv=1', null], ['', '1'], ['?musica=x&tv=1', null], ['?foo=1', null]]) {
          cases.push({ name, ua, size, nativeAndroid, search, stored });
        }
      }
    }
  }

  it(`agrees on all ${cases.length} combinations of device, screen, platform and manual override`, () => {
    const disagreements = [];
    for (const c of cases) {
      const before = oldIsTV(fakeWindow({ ua: c.ua, search: c.search, stored: c.stored, ...c.size }), c.nativeAndroid);
      const after = detectInterface(fakeWindow({ ua: c.ua, search: c.search, stored: c.stored, ...c.size }), c.nativeAndroid).tv;
      if (before !== after) disagreements.push({ ...c, before, after });
    }
    expect(disagreements).toEqual([]);
  });

  it('the phone app is never a TV; the TV box always is — with or without the native UA tag', () => {
    // Téléphone : portrait verrouillé, écran tactile.
    expect(detectInterface(fakeWindow({ ua: UA.phoneApp, width: 412, height: 915, touch: 5 }), true)).toMatchObject({ kind: 'mobile', input: 'touch', tv: false });
    // Le bug WebView connu : maxTouchPoints transitoirement à 0 sur un téléphone.
    expect(detectInterface(fakeWindow({ ua: UA.phoneApp, width: 412, height: 915, touch: 0 }), true).tv).toBe(false);
    // Box TV : tag « AndroidTV » posé par MainActivity.
    expect(detectInterface(fakeWindow({ ua: UA.tvBox, width: 960, height: 540, touch: 0 }), true)).toMatchObject({ kind: 'bigscreen', input: 'dpad', tv: true });
    // Sans le tag : le filet (Android natif, pas de tactile, large et paysage).
    expect(detectInterface(fakeWindow({ ua: UA.tvBoxNoTag, width: 960, height: 540, touch: 0 }), true).tv).toBe(true);
  });

  it('reads the native platform from window.Capacitor when it is not given (index.html, before the app)', () => {
    const android = { getPlatform: () => 'android' };
    expect(detectInterface(fakeWindow({ ua: UA.tvBoxNoTag, width: 960, height: 540, touch: 0, capacitor: android })).tv).toBe(true);
    expect(detectInterface(fakeWindow({ ua: UA.tvBoxNoTag, width: 960, height: 540, touch: 0 })).tv).toBe(false);
    expect(detectInterface(fakeWindow({ ua: UA.phoneApp, width: 412, height: 915, touch: 5, capacitor: android })).tv).toBe(false);
  });
});

describe('detectInterface — choix manuel', () => {
  it('?tv=1 forces the TV and is remembered', () => {
    const win = fakeWindow({ ua: UA.desktop, width: 1366, height: 768, touch: 0, search: '?tv=1' });
    expect(detectInterface(win).tv).toBe(true);
    win.location.search = '';
    expect(detectInterface(win).tv).toBe(true);
  });

  it('?tv=0 now really turns the TV off, even when the user agent looks like a TV, and is remembered', () => {
    const win = fakeWindow({ ua: UA.tizen, width: 1920, height: 1080, touch: 0, search: '?tv=0' });
    expect(detectInterface(win)).toMatchObject({ kind: 'bigscreen', input: 'pointer', tv: false });
    win.location.search = '';
    expect(detectInterface(win).tv).toBe(false);
  });

  it('?tv=auto forgets the choice', () => {
    const win = fakeWindow({ ua: UA.tizen, width: 1920, height: 1080, touch: 0, stored: '0' });
    expect(detectInterface(win).tv).toBe(false);
    win.location.search = '?tv=auto';
    expect(detectInterface(win).tv).toBe(true);
    expect(win.__store.has('force-tv')).toBe(false);
  });

  it('a blocked localStorage never breaks the detection', () => {
    const win = fakeWindow({ ua: UA.chromePhone });
    win.localStorage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() {} };
    expect(detectInterface(win)).toMatchObject({ kind: 'mobile', input: 'touch', tv: false });
  });
});

describe('detectInterface — interface', () => {
  it('under 768 px: mobile; from 768 px: big screen with a pointer (today’s desktop shell)', () => {
    expect(detectInterface(fakeWindow({ ua: UA.iphone, width: 390 }))).toMatchObject({ kind: 'mobile', input: 'touch', tv: false });
    expect(detectInterface(fakeWindow({ ua: UA.chromePhone, width: 767 })).kind).toBe('mobile');
    expect(detectInterface(fakeWindow({ ua: UA.desktop, width: 768, height: 900, touch: 0 }))).toMatchObject({ kind: 'bigscreen', input: 'pointer', tv: false });
    expect(detectInterface(fakeWindow({ ua: UA.ipad, width: 820, height: 1180, touch: 5 })).kind).toBe('bigscreen');
  });

  it('a phone forced into TV mode is big screen — so index.html paints no feed poster there', () => {
    expect(detectInterface(fakeWindow({ ua: UA.chromePhone, width: 390, search: '?tv=1' }))).toMatchObject({ kind: 'bigscreen', input: 'dpad', tv: true });
  });

  it('no window: big screen, not a TV (never throws)', () => {
    expect(detectInterface(null)).toMatchObject({ kind: 'bigscreen', input: 'pointer', tv: false });
  });
});

describe('index.html applique LA MÊME fonction', () => {
  // vite.config.js écrit `(function detectInterface…)` à la place du repère : on rejoue
  // ici exactement ce que le navigateur évaluera.
  const embedded = new Function(`return (${detectInterface.toString()})`)();

  it('the function survives being copied as text: no import, no outer variable', () => {
    const win = () => fakeWindow({ ua: UA.tvBox, width: 960, height: 540, touch: 0, capacitor: { getPlatform: () => 'android' } });
    expect(embedded(win())).toEqual(detectInterface(win()));
    expect(embedded(fakeWindow({ ua: UA.iphone }))).toMatchObject({ kind: 'mobile', input: 'touch', tv: false });
  });

  it('it is written for old WebViews: no arrow function, no optional chaining', () => {
    const source = detectInterface.toString();
    expect(source).not.toMatch(/=>/);
    expect(source).not.toMatch(/\?\./);
    expect(source).not.toMatch(/\b(const|let)\b/);
  });

  it('index.html calls it, and decides the feed poster from its answer alone', () => {
    expect(rootIndexHtml).toContain('var ui = __AMDS_DETECT_INTERFACE__(window);');
    expect(rootIndexHtml).toContain("ui.kind !== 'mobile'");
    expect(rootIndexHtml).toContain('if (ui.tv) return;');
    // Plus de seconde règle écrite à la main dans index.html.
    const boot = rootIndexHtml.slice(rootIndexHtml.indexOf('amds-boot'), rootIndexHtml.indexOf('</script>', rootIndexHtml.indexOf('__AMDS_DETECT_INTERFACE__')));
    expect(boot).not.toContain('max-width: 767px');
  });

  it('the build replaces the marker with the function of the app', () => {
    expect(viteConfigSource).toContain("import { detectInterface } from './src/lib/interfaceRule.js'");
    expect(viteConfigSource).toContain(".replace('__AMDS_DETECT_INTERFACE__', `(${detectInterface.toString()})`)");
  });
});

describe('Grand écran sur le web — le défaut sur ordinateur', () => {
  const computer = (extra = {}) => fakeWindow({ ua: UA.desktop, width: 1440, height: 900, touch: 0, fine: true, ...extra });

  it('a computer (a fine pointer available, 900 px or more) gets the big screen by default, without any flag', () => {
    expect(detectInterface(computer())).toMatchObject({ kind: 'bigscreen', input: 'pointer', tv: false, desktop: true, webBigScreen: true });
    expect(detectInterface(computer({ width: 900 })).webBigScreen).toBe(true);
  });

  it('a laptop scaled by Windows (1366 px at 150 % = 911 px) with a mouse is a computer', () => {
    expect(detectInterface(computer({ width: 911, height: 512 }))).toMatchObject({ desktop: true, webBigScreen: true });
  });

  it('a touch-screen laptop with a trackpad is a computer, even when touch is the primary pointer', () => {
    expect(detectInterface(fakeWindow({ ua: UA.desktop, width: 1366, height: 768, touch: 10, fine: false, anyFine: true }))).toMatchObject({ desktop: true, webBigScreen: true });
  });

  it('a window under 900 px, or a tablet without mouse or trackpad, is not: the old desktop stays', () => {
    expect(detectInterface(computer({ width: 899 }))).toMatchObject({ kind: 'bigscreen', desktop: false, webBigScreen: false });
    expect(detectInterface(fakeWindow({ ua: UA.ipad, width: 1366, height: 1024, touch: 5, fine: false, anyFine: false }))).toMatchObject({ kind: 'bigscreen', desktop: false, webBigScreen: false });
    expect(detectInterface(fakeWindow({ ua: UA.ipad, width: 820, height: 1180, touch: 5, fine: false, anyFine: false })).webBigScreen).toBe(false);
  });

  it('?ui=legacy keeps the old desktop and is remembered; ?ui=auto returns to the default', () => {
    const win = computer({ search: '?ui=legacy' });
    expect(detectInterface(win).webBigScreen).toBe(false);
    win.location.search = '';
    expect(detectInterface(win).webBigScreen).toBe(false);
    win.location.search = '?x=1&ui=auto';
    expect(detectInterface(win).webBigScreen).toBe(true);
    expect(win.__store.has('force-ui')).toBe(false);
  });

  it('?ui=bigscreen still forces the big screen where it is not the default (tablet)', () => {
    expect(detectInterface(fakeWindow({ ua: UA.ipad, width: 1024, height: 768, fine: false, anyFine: false, ui: 'bigscreen' })).webBigScreen).toBe(true);
  });

  it('never on a phone, and the TV does not read the flag', () => {
    expect(detectInterface(fakeWindow({ ua: UA.iphone, width: 390, ui: 'bigscreen', fine: true })).webBigScreen).toBe(false);
    expect(detectInterface(fakeWindow({ ua: UA.tvBox, width: 960, height: 540, touch: 0, fine: true }), true)).toMatchObject({ tv: true, webBigScreen: false });
  });

  it('index.html preloads the poster with the same rule (webBigScreen), not its own reading of the flag', () => {
    expect(rootIndexHtml).toContain('ui.webBigScreen');
    // Une seule règle : index.html reçoit le texte de detectInterface au build, il ne
    // contient ni seuil ni requête de pointeur à lui.
    expect(rootIndexHtml).toContain('__AMDS_DETECT_INTERFACE__(window)');
    expect(rootIndexHtml).not.toMatch(/any-pointer|pointer: fine|innerWidth >= \d/);
    expect(detectInterface.toString()).toContain("(any-pointer: fine)");
    expect(detectInterface.toString()).toContain('innerWidth >= 900');
    expect(rootIndexHtml).not.toContain("getItem('force-ui')");
  });
});
