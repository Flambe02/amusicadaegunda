import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { createPageUrl } from '@/utils';
import {
  GraduationCap,
  Home,
  Library,
  Gift,
  Info,
  FileText,
  Menu as MenuLines,
  Mic,
  Search,
  Tv
} from 'lucide-react';
import { AppBottomNav } from '@/components/mobile';
import { HomeFilled, MenuFilled, MicFilled, SearchFilled } from '@/components/mobile/icons/FilledIcons';
import { ShellContext } from '@/components/mobile/ShellContext';
import RotateOverlay from '@/components/mobile/RotateOverlay';
import { useSEO } from '../hooks/useSEO';
import { getRouteSEO, getCurrentPage } from '@/config/routes';
import { BRAND_SQUARE_MEDIUM } from '@/lib/imageAssets';

const TutorialManager = lazy(() => import('@/components/TutorialManager'));
const StandaloneOnboarding = lazy(() => import('@/components/StandaloneOnboarding'));
const SearchSheet = lazy(() => import('@/components/mobile/search/SearchSheet'));
const MenuSheet = lazy(() => import('@/components/mobile/menu/MenuSheet'));

function getNextMondayMs() {
  const now = new Date();
  const target = new Date(now);
  const daysUntil = ((8 - now.getDay()) % 7) || 7;
  target.setDate(now.getDate() + daysUntil);
  target.setHours(0, 0, 0, 0);
  return Math.max(target.getTime() - now.getTime(), 0);
}

function SidebarCountdown() {
  const [ms, setMs] = useState(() => getNextMondayMs());

  useEffect(() => {
    const t = setInterval(() => setMs(getNextMondayMs()), 1000);
    return () => clearInterval(t);
  }, []);

  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const d = Math.floor(ms / 86400000);

  const parts = d > 0
    ? `${d}d ${String(h % 24).padStart(2,'0')}h ${String(m).padStart(2,'0')}m`
    : `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;

  return (
    <div className="mt-auto pt-4 border-t border-white/8">
      <p className="text-[10px] uppercase tracking-[0.22em] text-white/30 mb-1.5">
        Próxima estreia
      </p>
      <p className="font-mono text-sm font-semibold text-white/50 tabular-nums">
        {parts}
      </p>
    </div>
  );
}

// Onglets de la barre mobile (addendum catálogo §A, révisé le 2026-09-25) : inicio,
// karaoke, catalogo (pastille centrale), buscar, menu. « Buscar » n'est jamais actif
// (il ouvre un panneau, pas une page). Tout ce qui parcourt les musiques (le catalogue, les fiches /musica/…, les
// catégories, l'arquivo) allume « Catálogo » ; les pages atteintes depuis la feuille
// « Menu » allument « Menu ».
function getMobileActiveTab(pathname, search = '') {
  // Calque « Ouvir » du feed (/?ouvir=<slug>) : c'est le Catálogo qui est à l'écran.
  if (pathname === '/') return new URLSearchParams(search).has('ouvir') ? 'catalogo' : 'inicio';
  if (pathname === '/karaoke') return 'karaoke';
  if (
    pathname === '/catalogo' ||
    pathname === '/search' ||
    pathname === '/roda' ||
    pathname === '/musica' ||
    pathname.startsWith('/musica/') ||
    pathname === '/playlist' ||
    pathname.startsWith('/chansons') ||
    pathname.startsWith('/categoria/') ||
    pathname.startsWith('/arquivo/')
  ) {
    return 'catalogo';
  }
  if (
    pathname === '/blog' ||
    pathname === '/sobre' ||
    pathname === '/tv' ||
    pathname === '/festa' ||
    pathname.startsWith('/apprendre')
  ) {
    return 'menu';
  }
  return 'inicio';
}

export default function Layout({ children }) {
  const location = useLocation();
  const [deferredAuxUiReady, setDeferredAuxUiReady] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchRequested, setSearchRequested] = useState(false);
  const buscarButtonRef = useRef(null);
  const isHomePage = location.pathname === '/';
  const isImmersiveMobilePage = isHomePage || location.pathname === '/sobre';

  const pageName = getCurrentPage(location.pathname);
  const seoData = getRouteSEO(pageName);

  useSEO({
    ...seoData,
    enabled: !!seoData
  });

  const pages = [
    { name: 'Início', url: createPageUrl('Home'), icon: Home },
    { name: 'Catálogo', url: createPageUrl('Musica'), icon: Library },
    { name: 'Karaokê', url: createPageUrl('Karaoke'), icon: Mic },
    { name: 'Roda', url: createPageUrl('Roda'), icon: Gift },
    { name: 'Blog', url: createPageUrl('Blog'), icon: FileText },
    { name: 'Pesquisa', url: createPageUrl('Search'), icon: Search },
    { name: 'TV', url: createPageUrl('Tv'), icon: Tv },
    { name: 'Sobre', url: createPageUrl('Sobre'), icon: Info },
    // URL en dur (pas createPageUrl('Apprender')) : la route existante est '/apprendre'
    // (orthographe française), alors que createPageUrl('Apprender') calculerait
    // '/apprender' — un lien mort. Voir routes.js : name:'Apprender' / path:'/apprendre'.
    // Libellé « Aprender » seul (pas « Aprender Beta », ni badge séparé) : à 260px de
    // large, la sidebar tronque tout ce qui dépasse — vérifié visuellement avec les
    // deux variantes. La mention « Beta » reste très visible une fois sur la page
    // (bandeau ambre en tête) et dans le menu mobile/PWA, où « Aprender Beta » tient
    // sans troncature.
    { name: 'Aprender', url: '/apprendre', icon: GraduationCap }
  ];

  const isActive = (page) => {
    if (page.name === 'Início' && location.pathname === '/') return true;
    if (page.name === 'Catálogo' && (location.pathname === '/musica' || location.pathname.startsWith('/musica/'))) return true;
    return location.pathname === page.url;
  };

  // Panneau de recherche mobile, ouvert par « Buscar » — sans focus sur le champ :
  // le clavier ne s'ouvre que si l'utilisateur touche le champ (test iPhone).
  const openSearch = () => {
    setSearchRequested(true);
    setSearchOpen(true);
  };

  const mobileNavItems = [
    { value: 'inicio', label: 'Início', href: '/', icon: Home, activeIcon: HomeFilled },
    // Micro (décision du 2026-09-25, « O Palco ») : plein et blanc actif, contour sinon.
    { value: 'karaoke', label: 'Karaokê', href: '/karaoke', icon: Mic, activeIcon: MicFilled },
    // Au centre, la Caipivara dans sa pastille jaune : le seul jaune de la barre.
    { value: 'catalogo', label: 'Catálogo', href: '/catalogo', variant: 'pill', image: '/images/caipivara-3d-head-128.webp' },
    // Ouvre le panneau de recherche (étape 10) par-dessus l'écran courant, sans changer
    // de page ; jamais affiché comme actif.
    { value: 'buscar', label: 'Buscar', icon: Search, activeIcon: SearchFilled, onSelect: openSearch, buttonRef: buscarButtonRef },
    {
      value: 'menu',
      label: 'Menu',
      icon: MenuLines,
      activeIcon: MenuFilled,
      // Menu simplifié (étape 11) : Catálogo, Festa na TV, Sobre, plateformes.
      sheet: MenuSheet,
    },
  ];

  // Tout changement de page referme le panneau de recherche.
  useEffect(() => {
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    let timeoutId = null;
    let idleId = null;

    const revealAuxUi = () => setDeferredAuxUiReady(true);

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(revealAuxUi, { timeout: 2000 });
    } else {
      timeoutId = window.setTimeout(revealAuxUi, 1200);
    }

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (idleId !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, []);

  return (
    <>
      <div className="md:hidden relative flex min-h-0 flex-col h-svh overflow-hidden bg-black text-white">
        <a href="#main-mobile" className="skip-link">Ir para o conteúdo</a>

        {/* En-tête mobile. Início : transparent, posé PAR-DESSUS le contenu (le feed passe
            dessous) ; la zone vide laisse passer les taps vers la vidéo, seul le logo
            capte. Sobre : masqué. Ailleurs : verre opaque à 92 %. */}
        <header
          data-mobile-header={isHomePage ? 'overlay' : isImmersiveMobilePage ? 'hidden' : 'solid'}
          className={
            isHomePage
              ? 'pointer-events-none absolute inset-x-0 top-0 z-40 text-white'
              : `z-40 flex-shrink-0 border-b border-white/10 bg-black/90 text-white backdrop-blur-2xl${isImmersiveMobilePage ? ' hidden' : ''}`
          }
        >
          <div className="px-3 pb-2 pt-[max(env(safe-area-inset-top),0.35rem)]">
            <div className="flex min-h-[52px] items-center justify-between gap-2">
              {/* Left: Logo */}
              {/* Caipivara 3D fixe (tête recadrée), pas l'ancien logo au micro. */}
              <Link to="/" className="pointer-events-auto flex h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/10 shadow-sm">
                <img
                  src="/images/caipivara-3d-head-128.webp"
                  srcSet="/images/caipivara-3d-head-128.webp 128w, /images/caipivara-3d-head-256.webp 256w"
                  sizes="40px"
                  alt="A Música da Segunda — página inicial"
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                  width="40"
                  height="40"
                />
              </Link>
              {/* Center: Title */}
              <span
                className={`text-sm font-black tracking-tight text-white${
                  isHomePage ? ' [text-shadow:0_1px_3px_rgba(0,0,0,0.6),0_0_12px_rgba(0,0,0,0.35)]' : ''
                }`}
              >
                A Música da Segunda
              </span>
              {/* Pas de bouton « i » (Sobre) : il doublait l'onglet Menu, sur toutes les
                  pages mobiles. Une cale de même taille garde le nom centré. */}
              <span aria-hidden="true" className="h-11 w-11 flex-shrink-0" />
            </div>
          </div>
        </header>

        <main id="main-mobile" className="relative min-h-0 flex-1 overflow-hidden">
          <div id="mobile-scroll" className={`min-h-0 h-full overflow-y-auto overscroll-behavior-contain${isImmersiveMobilePage ? '' : ' pb-[env(safe-area-inset-bottom)]'}`}>
            <ShellContext.Provider value="mobile">{children}</ShellContext.Provider>
          </div>
        </main>

        <AppBottomNav
          items={mobileNavItems}
          activeValue={getMobileActiveTab(location.pathname, location.search)}
        />

        {searchRequested ? (
          <Suspense fallback={null}>
            <SearchSheet open={searchOpen} onOpenChange={setSearchOpen} returnFocusRef={buscarButtonRef} />
          </Suspense>
        ) : null}
      </div>

      <div className="hidden md:block min-h-screen text-white">
        <a href="#main-desktop" className="skip-link">Ir para o conteudo</a>

        {/* Desktop sidebar shell */}
        <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-[260px] p-4">
          <div className="glass-panel desktop-shell-gradient relative flex h-full w-full flex-col overflow-hidden rounded-[30px] px-5 py-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(253,224,71,0.2),_transparent_65%)]" />

            {/* Desktop branding */}
            <div className="relative flex items-center gap-4 border-b border-white/8 pb-5">
              <Link
                to="/"
                className="h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-lg shadow-black/30"
              >
                <img
                  src={BRAND_SQUARE_MEDIUM}
                  alt="Capybara A Musica da Segunda"
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                  width="64"
                  height="64"
                />
              </Link>

              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">
                  A Musica da Segunda
                </p>
                <p className="mt-2 text-base font-semibold leading-tight text-white">
                  Descubra música nova toda segunda
                </p>
              </div>
            </div>

            {/* Desktop navigation. min-h-0 + overflow-y-auto : le conteneur parent est en
                overflow-hidden, donc sans ces deux classes les derniers items (TV, Sobre,
                Aprender) et le compte a rebours sont coupes SANS scroll possible des que la
                hauteur utile passe sous ~990px - le cas de la plupart des portables. */}
            <nav className="relative mt-8 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto" aria-label="Navegacao principal">
              {pages.map((page) => {
                const active = isActive(page);

                return (
                  <Link
                    key={page.name}
                    to={page.url}
                    aria-current={active ? 'page' : undefined}
                    className={`group flex items-center gap-3 rounded-[22px] px-4 py-3.5 transition-all duration-300 ${
                      active
                        ? 'bg-[#FDE047]/12 text-[#FDE047] shadow-[inset_0_0_0_1px_rgba(253,224,71,0.22)]'
                        : 'text-white/68 hover:bg-white/6 hover:text-white'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 ${
                        active
                          ? 'bg-[#FDE047]/14 text-[#FDE047]'
                          : 'bg-white/[0.04] text-white/65 group-hover:bg-white/[0.08] group-hover:text-white'
                      }`}
                    >
                      <page.icon className="h-5 w-5" aria-hidden="true" />
                    </span>

                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{page.name}</span>
                      <span
                        className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                          active ? 'bg-[#FDE047]' : 'bg-white/10 group-hover:bg-white/30'
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                );
              })}
            </nav>

            <SidebarCountdown />
          </div>
        </aside>

        {/* Desktop content area */}
        <div className="relative min-h-screen md:ml-[260px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(253,224,71,0.08),_transparent_18%),radial-gradient(circle_at_85%_10%,_rgba(255,255,255,0.06),_transparent_20%)]" />

          <main id="main-desktop" className="relative z-10 min-h-screen px-6 pb-32 pt-4 xl:px-8 2xl:px-10">
            <ShellContext.Provider value="desktop">{children}</ShellContext.Provider>
          </main>

          <footer className="relative z-10 px-6 pb-6 xl:px-8 2xl:px-10">
            <div className="glass-panel rounded-[28px] px-6 py-4">
              <p className="text-center text-[11px] uppercase tracking-[0.24em] text-white/38">
                (c) 2026 A Musica da Segunda. The Pimentao Rouge Project.
              </p>
              <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-[11px] uppercase tracking-[0.24em]">
                <Link to="/guia" className="text-white/38 transition-colors hover:text-white/70">
                  Guia da Paródia Musical
                </Link>
                <Link to="/privacy" className="text-white/38 transition-colors hover:text-white/70">
                  Política de Privacidade
                </Link>
              </p>
            </div>
          </footer>
        </div>
      </div>

      {/* Téléphone en paysage : « Gire o celular » par-dessus tout (hors des deux
          coquilles : en paysage, un téléphone dépasse souvent 768 px de large). */}
      <RotateOverlay />

      {deferredAuxUiReady ? (
        <Suspense fallback={null}>
          <TutorialManager />
          <StandaloneOnboarding />
        </Suspense>
      ) : null}
    </>
  );
}
