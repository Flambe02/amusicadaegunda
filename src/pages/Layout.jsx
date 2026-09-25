import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { createPageUrl } from '@/utils';
import {
  GraduationCap,
  Home,
  Library,
  ListMusic,
  Gift,
  Info,
  FileText,
  Menu as MenuLines,
  Mic,
  Search,
  Tv
} from 'lucide-react';
import { AppBottomNav } from '@/components/mobile';
import { HomeFilled, MenuFilled, MusicListFilled, SearchFilled } from '@/components/mobile/icons/FilledIcons';
import { ShellContext } from '@/components/mobile/ShellContext';
import { useSEO } from '../hooks/useSEO';
import { getRouteSEO, getCurrentPage } from '@/config/routes';
import { BRAND_SQUARE_MEDIUM } from '@/lib/imageAssets';

const TutorialManager = lazy(() => import('@/components/TutorialManager'));
const StandaloneOnboarding = lazy(() => import('@/components/StandaloneOnboarding'));
const SearchSheet = lazy(() => import('@/components/mobile/search/SearchSheet'));

function getNextMondayMs() {
  const now = new Date();
  const target = new Date(now);
  const daysUntil = ((8 - now.getDay()) % 7) || 7;
  target.setDate(now.getDate() + daysUntil);
  target.setHours(0, 0, 0, 0);
  return Math.max(target.getTime() - now.getTime(), 0);
}

/**
 * Nombres en toutes lettres. Le modèle HTML écrit « em um dia e quatro horas »,
 * pas « 1d 04h 25m » : le décompte du pied de page se lit comme une promesse
 * éditoriale, pas comme une minuterie brute (spec §10).
 * Deux listes car le portugais accorde : « um dia » mais « uma hora ».
 */
const NOMBRES_MASC = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete'];
const NOMBRES_FEM = [
  'zero', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete',
  'dezoito', 'dezenove', 'vinte', 'vinte e uma', 'vinte e duas', 'vinte e três',
];

function enToutesLettres(valeur, liste) {
  return liste[valeur] || String(valeur);
}

/** Décompte éditorial du pied de page desktop (>= 1024 px). */
function FooterCountdown() {
  const [ms, setMs] = useState(() => getNextMondayMs());

  useEffect(() => {
    // Une minute suffit : le libellé ne descend pas sous l'heure sauf tout à la fin.
    const t = setInterval(() => setMs(getNextMondayMs()), 60000);
    return () => clearInterval(t);
  }, []);

  // Spec §10 : jamais de valeur négative, jamais « 0d 00h 00m ». Passé l'échéance,
  // le décompte disparaît au lieu d'annoncer un retard.
  if (ms <= 0) return null;

  const totalHeures = Math.floor(ms / 3600000);
  const jours = Math.floor(totalHeures / 24);
  const heures = totalHeures % 24;

  const morceaux = [];
  if (jours > 0) {
    morceaux.push(`${enToutesLettres(jours, NOMBRES_MASC)} ${jours > 1 ? 'dias' : 'dia'}`);
  }
  if (heures > 0) {
    morceaux.push(`${enToutesLettres(heures, NOMBRES_FEM)} ${heures > 1 ? 'horas' : 'hora'}`);
  }
  if (morceaux.length === 0) {
    const minutes = Math.max(Math.floor(ms / 60000), 1);
    morceaux.push(`${enToutesLettres(minutes, NOMBRES_FEM)} ${minutes > 1 ? 'minutos' : 'minuto'}`);
  }

  return (
    <span className="text-[12px] text-white/50">
      Próxima notícia em música: segunda, em {morceaux.join(' e ')}
    </span>
  );
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
function getMobileActiveTab(pathname) {
  if (pathname === '/') return 'inicio';
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

/**
 * Clavier iOS : Safari ne l'ouvre que si un champ reçoit le focus DANS le geste. Le
 * panneau de recherche est chargé à la demande et son champ n'existe pas encore au
 * tap : un champ relais temporaire reçoit le focus tout de suite, le panneau le
 * reprend à l'ouverture (le clavier reste ouvert), et le relais disparaît dès qu'il
 * perd le focus. 16 px pour qu'iOS ne zoome pas.
 */
function focusKeyboardRelay() {
  const relay = document.createElement('input');
  relay.type = 'text';
  relay.tabIndex = -1;
  relay.setAttribute('aria-label', 'Buscar');
  relay.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;pointer-events:none;';
  relay.addEventListener('blur', () => relay.remove(), { once: true });
  document.body.appendChild(relay);
  relay.focus({ preventScroll: true });
  // Filet : si le panneau ne prend jamais le focus, le relais ne reste pas.
  window.setTimeout(() => relay.isConnected && relay.blur(), 3000);
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

  // Barre horizontale desktop (>= 1024 px), cf. addendum §3. Volontairement plus
  // courte que `pages` : « Catálogo » fusionne dans « Músicas », et Blog / TV /
  // Aprender descendent en pied de page. Aucune route n'est supprimée.
  // `pages` reste la source de la sidebar, conservée entre 768 et 1023 px.
  const topBarPages = [
    { name: 'Início', url: '/', match: (p) => p === '/' },
    { name: 'Músicas', url: '/musica', match: (p) => p === '/musica' || p.startsWith('/musica/') },
    { name: 'Karaokê', url: '/karaoke', match: (p) => p === '/karaoke' },
    { name: 'Roda', url: '/roda', match: (p) => p === '/roda' },
    { name: 'Sobre', url: '/sobre', match: (p) => p === '/sobre' },
  ];

  // Pied de page desktop. Reprend la ligne du modèle HTML, augmentée de « Blog » et
  // « App para TV » que l'addendum §3 y fait descendre depuis la navigation.
  // Routes inchangées ; « Contato » vise le mail déjà utilisé sur /sobre, faute de
  // route dédiée — pas de lien mort.
  const footerLinks = [
    { name: 'Blog', url: '/blog' },
    { name: 'App para TV', url: '/tv' },
    { name: `Arquivo ${new Date().getFullYear()}`, url: `/arquivo/${new Date().getFullYear()}` },
    { name: 'Guia da paródia', url: '/guia' },
    { name: 'Apprendre le portugais', url: '/apprendre' },
    { name: 'Contato', url: 'mailto:contact@amusicadasegunda.com', external: true },
  ];

  // Panneau de recherche mobile, ouvert par « Buscar » (voir focusKeyboardRelay).
  const openSearch = () => {
    focusKeyboardRelay();
    setSearchRequested(true);
    setSearchOpen(true);
  };

  const mobileNavItems = [
    { value: 'inicio', label: 'Início', href: '/', icon: Home, activeIcon: HomeFilled },
    // Icône de paroles, pas de micro : le karaokê fonctionne sans microphone.
    { value: 'karaoke', label: 'Karaokê', href: '/karaoke', icon: ListMusic, activeIcon: MusicListFilled },
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
      menuItems: [
        { value: 'inicio', label: 'Início', href: '/', icon: Home },
        {
          value: 'musicas',
          label: 'Todas as músicas',
          description: 'O arquivo completo, semana a semana',
          href: '/musica',
          icon: Library,
        },
        { value: 'roleta', label: 'Roda', href: '/roda', icon: Gift },
        { value: 'blog', label: 'Blog', href: '/blog', icon: FileText },
        { value: 'pesquisa', label: 'Pesquisa', href: '/search', icon: Search },
        { value: 'tv', label: 'App para TV', href: '/tv', icon: Tv },
        { value: 'sobre', label: 'Sobre', href: '/sobre', icon: Info },
        { value: 'apprender', label: 'Aprender Beta', href: '/apprendre', icon: GraduationCap },
      ],
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
            dessous) ; la zone vide laisse passer les taps vers la vidéo, seuls le logo et
            le bouton Sobre captent. Sobre : masqué. Ailleurs : verre opaque à 92 %. */}
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
              {/* Right: Info — sauf sur l'Início, où il doublait l'onglet Menu. Une cale
                  de même taille garde le nom centré. */}
              {isHomePage ? (
                <span aria-hidden="true" className="h-11 w-11 flex-shrink-0" />
              ) : (
                <Link
                  to={createPageUrl('Sobre')}
                  className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] touch-manipulation"
                  aria-label="Sobre o projeto"
                >
                  <Info className="h-4 w-4 text-white/70" />
                </Link>
              )}
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
          activeValue={getMobileActiveTab(location.pathname)}
        />

        {searchRequested ? (
          <Suspense fallback={null}>
            <SearchSheet open={searchOpen} onOpenChange={setSearchOpen} returnFocusRef={buscarButtonRef} />
          </Suspense>
        ) : null}
      </div>

      <div className="hidden md:block min-h-screen text-white">
        <a href="#main-desktop" className="skip-link">Ir para o conteudo</a>

        {/* Sidebar verticale — conservée telle quelle entre 768 et 1023 px. Le spec
            §11 borne la refonte à >= 1024 px et verrouille tout ce qui est en dessous,
            or la coquille desktop démarre à 768 px : cette bande garde donc l'ancienne
            navigation, la barre horizontale prend le relais à partir de `lg`. */}
        <aside className="hidden md:flex lg:hidden fixed inset-y-0 left-0 z-40 w-[260px] p-4">
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

        {/* Barre de navigation horizontale (>= 1024 px). Aucun bouton à fond plein :
            le jaune plein reste réservé aux deux actions de la page (cf. addendum §3). */}
        <header className="fixed inset-x-0 top-0 z-40 hidden border-b border-white/8 bg-black/80 backdrop-blur-xl lg:block">
          <div className="mx-auto flex h-[72px] max-w-[1440px] items-center gap-8 px-8">
            <Link to="/" className="flex flex-shrink-0 items-center gap-3" aria-label="A Música da Segunda, página inicial">
              <span className="h-11 w-11 overflow-hidden rounded-xl border border-white/10 bg-white/10">
                <img
                  src={BRAND_SQUARE_MEDIUM}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                  width="44"
                  height="44"
                />
              </span>
              <span className="text-[15px] font-bold leading-[1.15] text-white">
                A Música
                <br />
                da Segunda
              </span>
            </Link>

            <nav className="flex flex-1 items-center justify-center gap-8" aria-label="Navegação principal">
              {topBarPages.map((page) => {
                const active = page.match(location.pathname);

                return (
                  <Link
                    key={page.name}
                    to={page.url}
                    aria-current={active ? 'page' : undefined}
                    className={`relative py-2 text-[15px] transition-colors ${
                      active
                        ? 'font-semibold text-[#FDE047] after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[2px] after:rounded-full after:bg-[#FDE047] after:content-[""]'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {page.name}
                  </Link>
                );
              })}
            </nav>

            <Link
              to="/search"
              aria-label="Pesquisar músicas"
              aria-current={location.pathname === '/search' ? 'page' : undefined}
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/10 transition-colors ${
                location.pathname === '/search'
                  ? 'bg-white/10 text-[#FDE047]'
                  : 'bg-white/[0.04] text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Search className="h-[18px] w-[18px]" aria-hidden="true" />
            </Link>
          </div>
        </header>

        {/* Desktop content area */}
        <div className="relative min-h-screen md:ml-[260px] lg:ml-0 lg:pt-[72px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(253,224,71,0.08),_transparent_18%),radial-gradient(circle_at_85%_10%,_rgba(255,255,255,0.06),_transparent_20%)]" />

          {/* `lg:pb-10` : le pied de page plat vient se coller au contenu comme dans le
              modèle. Le `pb-32` d'origine reste pour la bande 768-1023 px. */}
          <main id="main-desktop" className="relative z-10 min-h-screen px-6 pb-32 pt-4 lg:pb-10 xl:px-8 2xl:px-10">
            <ShellContext.Provider value="desktop">{children}</ShellContext.Provider>
          </main>

          {/* Pied de page plat (>= 1024 px), calqué sur le modèle HTML : deux rangées
              séparées par un filet, bord à bord, sans arrondi ni panneau flottant. */}
          <footer className="relative z-10 hidden lg:block">
            <div className="flex items-center justify-between gap-6 border-t border-white/8 px-6 py-4 xl:px-8 2xl:px-10">
              <span className="text-[12px] text-white/50">
                <span className="text-[#FDE047]" aria-hidden="true">—</span> Notícia. Humor. Música.
              </span>

              <FooterCountdown />
            </div>

            <div className="border-t border-white/6 px-6 pb-6 pt-3 xl:px-8 2xl:px-10">
              <nav
                className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/35"
                aria-label="Mais do projeto"
              >
                {footerLinks.map((link, index) => (
                  <span key={link.url} className="flex items-center gap-2">
                    {index > 0 ? <span aria-hidden="true">·</span> : null}
                    {link.external ? (
                      <a href={link.url} className="transition-colors hover:text-white/70">
                        {link.name}
                      </a>
                    ) : (
                      <Link to={link.url} className="transition-colors hover:text-white/70">
                        {link.name}
                      </Link>
                    )}
                  </span>
                ))}
              </nav>
            </div>
          </footer>

          {/* Pied de page d'origine, conservé tel quel pour la bande 768-1023 px. */}
          <footer className="relative z-10 px-6 pb-6 lg:hidden xl:px-8 2xl:px-10">
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

      {deferredAuxUiReady ? (
        <Suspense fallback={null}>
          <TutorialManager />
          <StandaloneOnboarding />
        </Suspense>
      ) : null}
    </>
  );
}
