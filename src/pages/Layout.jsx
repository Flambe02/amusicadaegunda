import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Home,
  Gift,
  Info,
  FileText,
  Search
} from 'lucide-react';
import TutorialManager from '@/components/TutorialManager';
import OnboardingScreen from '@/components/OnboardingScreen';
import BottomNavigationModern from '@/components/BottomNavigationModern';
import { useSEO } from '../hooks/useSEO';
import { getRouteSEO, getCurrentPage } from '@/config/routes';

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

export default function Layout({ children }) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const pageName = getCurrentPage(location.pathname);
  const seoData = getRouteSEO(pageName);

  useSEO({
    ...seoData,
    enabled: !!seoData
  });

  const pages = [
    { name: 'Início', url: createPageUrl('Home'), icon: Home },
    { name: 'Roda', url: createPageUrl('Roda'), icon: Gift },
    { name: 'Blog', url: createPageUrl('Blog'), icon: FileText },
    { name: 'Pesquisa', url: createPageUrl('Search'), icon: Search },
    { name: 'Sobre', url: createPageUrl('Sobre'), icon: Info }
  ];

  const isActive = (page) => {
    if (page.name === 'Início' && location.pathname === '/') return true;
    return location.pathname === page.url;
  };

  return (
    <>
      <div className="lg:hidden flex flex-col h-[100dvh] overflow-hidden bg-black text-white">
        <a href="#main-mobile" className="skip-link">Ir para o conteúdo</a>

        <header className="z-40 flex-shrink-0 border-b border-white/10 bg-black/92 text-white backdrop-blur-2xl">
          <div className="px-3 pb-2 pt-[max(env(safe-area-inset-top),0.35rem)]">
            <div className="flex min-h-[52px] items-center justify-between gap-2">
              {/* Left: Logo */}
              <Link to="/" className="flex h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/8 shadow-sm">
                <img
                  src="/images/Caipivara_square.png"
                  alt="Logo A Musica da Segunda"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </Link>
              {/* Center: Title */}
              <span className="text-sm font-black tracking-tight text-white">
                A Música da Segunda
              </span>
              {/* Right: Info */}
              <Link
                to={createPageUrl('Sobre')}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] touch-manipulation"
                aria-label="Sobre o projeto"
              >
                <Info className="h-4 w-4 text-white/72" />
              </Link>
            </div>
          </div>
        </header>

        <main id="main-mobile" className="flex-1 overflow-hidden relative">
          <div className={`h-full overscroll-behavior-contain pb-[88px] ${isHomePage ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            {children}
          </div>
        </main>

        <BottomNavigationModern />
      </div>

      <div className="hidden lg:block min-h-screen text-white">
        <a href="#main-desktop" className="skip-link">Ir para o conteudo</a>

        {/* Desktop sidebar shell */}
        <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[260px] p-4">
          <div className="glass-panel desktop-shell-gradient relative flex h-full w-full flex-col overflow-hidden rounded-[30px] px-5 py-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(253,224,71,0.2),_transparent_65%)]" />

            {/* Desktop branding */}
            <div className="relative flex items-center gap-4 border-b border-white/8 pb-5">
              <Link
                to="/"
                className="h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-lg shadow-black/30"
              >
                <img
                  src="/images/Caipivara_square.png"
                  alt="Capybara A Musica da Segunda"
                  className="h-full w-full object-cover"
                  loading="eager"
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

            {/* Desktop navigation */}
            <nav className="relative mt-8 flex flex-1 flex-col gap-3" aria-label="Navegacao principal">
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
        <div className="relative min-h-screen lg:ml-[260px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(253,224,71,0.08),_transparent_18%),radial-gradient(circle_at_85%_10%,_rgba(255,255,255,0.06),_transparent_20%)]" />

          <main id="main-desktop" className="relative z-10 min-h-screen px-6 pb-32 pt-4 xl:px-8 2xl:px-10">
            {children}
          </main>

          <footer className="relative z-10 px-6 pb-6 xl:px-8 2xl:px-10">
            <div className="glass-panel rounded-[28px] px-6 py-4">
              <p className="text-center text-[11px] uppercase tracking-[0.24em] text-white/38">
                (c) 2026 A Musica da Segunda. The Pimentao Rouge Project.
              </p>
            </div>
          </footer>
        </div>
      </div>

      <TutorialManager />
      <OnboardingScreen />
    </>
  );
}
