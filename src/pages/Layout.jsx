
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Calendar, Gift, Info, FileText, ListMusic, Search } from 'lucide-react';
import TutorialManager from '@/components/TutorialManager';
import OptimizedImage from '@/components/OptimizedImage';
import BottomNavigation from '@/components/BottomNavigation';
import { useSEO } from '../hooks/useSEO';
import { getRouteSEO, getCurrentPage } from '@/config/routes';

export default function Layout({ children }) {
  const location = useLocation();

  // ✅ SEO: Application automatique des métadonnées globales
  const pageName = getCurrentPage(location.pathname);
  const seoData = getRouteSEO(pageName);

  // N'applique le SEO que si des données sont définies dans routes.js
  // Les pages dynamiques (comme Song) ont seo: null et gèrent leur propre SEO
  useSEO({
    ...seoData,
    enabled: !!seoData
  });

  const pages = [
    { name: 'Início', url: createPageUrl('Home'), icon: Home },
    { name: 'Calendário', url: createPageUrl('Calendar'), icon: Calendar },
    { name: 'Playlist', url: createPageUrl('Playlist'), icon: ListMusic },
    { name: 'Blog', url: createPageUrl('Blog'), icon: FileText },
    { name: 'A Roda', url: createPageUrl('Roda'), icon: Gift },
    { name: 'Sobre', url: createPageUrl('Sobre'), icon: Info },
    { name: 'Pesquisar', url: createPageUrl('Search'), icon: Search },
  ];

  const isActive = (page) => {
    if (page.name === 'Início' && location.pathname === '/') return true;
    return location.pathname === page.url;
  };

  return (
    <>
      {/* Skip link pour accessibilité */}
      <a href="#main" className="skip-link">Ir para o conteúdo</a>

      {/* Layout Mobile Immersif - 3 zones Flexbox */}
      <div className="lg:hidden flex flex-col h-[100dvh] overflow-hidden bg-black text-white">
        {/* Header Mobile - Fixe en haut */}
        <header className="flex-shrink-0 bg-black/90 backdrop-blur-lg border-b border-white/10 z-40">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Link to="/" className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0 bg-white">
                <img
                  src="/images/2026 logo.png"
                  alt="Logo A Música da Segunda - Paródias Musicais do Brasil"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="text-lg font-black text-white leading-tight truncate drop-shadow-sm">A Música da Segunda</div>
                <p className="text-xs text-gray-300 mt-0.5 truncate drop-shadow-sm">Nova música toda segunda-feira</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Zone flexible avec scroll interne */}
        <main id="main" className="flex-1 overflow-hidden relative">
          <div className="h-full overflow-y-auto overscroll-behavior-contain pb-20">
            {children}
          </div>
        </main>

        {/* Bottom Navigation - Glassmorphism */}
        <BottomNavigation />
      </div>

      {/* Layout Desktop - Inchangé */}
      <div className="hidden lg:block min-h-screen bg-gradient-to-b from-teal-200 to-rose-200">
        {/* Header Desktop avec Navigation */}
        <header className="bg-white/90 backdrop-blur-lg border-b border-white/50 shadow-lg sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo + Titre */}
              <div className="flex items-center gap-4">
                <Link to="/" className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0 bg-white">
                  <img
                    src="/images/2026 logo.png"
                    alt="Logo A Música da Segunda - Paródias Musicais do Brasil"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </Link>
                <div>
                  <div className="text-2xl font-black text-gray-800 leading-tight">A Música da Segunda</div>
                  <p className="text-xs text-gray-600 mt-0.5">Site oficial de paródias musicais inteligentes e divertidas</p>
                </div>
              </div>

              {/* Navigation Desktop */}
              <nav className="flex items-center gap-1" aria-label="Navigation principale">
                {pages.map((page) => (
                  <Link
                    key={page.name}
                    to={page.url}
                    aria-current={isActive(page) ? 'page' : undefined}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 font-medium ${isActive(page)
                        ? 'bg-[#32a2dc] text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                      }`}
                  >
                    <page.icon className="w-4 h-4" aria-hidden="true" />
                    <span>{page.name}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </header>

        <main id="main" className="relative z-10">
          {children}
        </main>

        {/* Footer Desktop discret pour crédit de production */}
        <footer className="border-t border-white/60 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <p className="text-[11px] md:text-xs text-gray-500 text-center">
              © 2026 A Música da Segunda. Uma produção The Pimentão Rouge Project.
            </p>
          </div>
        </footer>
      </div>

      {/* Gestionnaire de tutoriel intégré */}
      <TutorialManager />
    </>
  );
}
