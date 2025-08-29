
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Calendar, Gift, Info, FileText, ListMusic } from 'lucide-react';

export default function Layout({ children }) {
  const location = useLocation();
  const pages = [
    { name: 'Início', url: createPageUrl('Home'), icon: Home },
    { name: 'Calendário', url: createPageUrl('Calendar'), icon: Calendar },
    { name: 'Playlist', url: createPageUrl('Playlist'), icon: ListMusic },
    { name: 'Blog', url: createPageUrl('Blog'), icon: FileText },
    { name: 'Ano 2025', url: createPageUrl('AdventCalendar'), icon: Gift },
    { name: 'Sobre', url: createPageUrl('Sobre'), icon: Info },
  ];

  const isActive = (page) => {
    if (page.name === 'Início' && location.pathname === '/') return true;
    return location.pathname === page.url;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-200 to-rose-200">
      {/* Header Desktop avec Navigation */}
      <header className="hidden lg:block bg-white/90 backdrop-blur-lg border-b border-white/50 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo + Titre */}
            <div className="flex items-center gap-4">
              <Link to="/" className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0">
                <img 
                  src="images/Musica da segunda.jpg" 
                  alt="Logo Música da Segunda"
                  className="w-full h-full object-cover"
                />
              </Link>
              <div>
                <h1 className="text-xl font-black text-gray-800">Música da Segunda</h1>
                <p className="text-sm text-gray-600">Descubra música nova toda segunda-feira</p>
              </div>
            </div>

            {/* Navigation Desktop */}
            <nav className="flex items-center gap-1">
              {pages.map((page) => (
                <Link
                  key={page.name}
                  to={page.url}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 font-medium ${
                    isActive(page)
                      ? 'bg-[#32a2dc] text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <page.icon className="w-4 h-4" />
                  <span>{page.name}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="lg:pb-0 pb-28 relative z-10">
        {children}
      </main>

      {/* Navegação Inferior - Mobile uniquement */}
      <nav className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/50 z-50">
        <div className="flex gap-1 p-1">
          {pages.filter(page => page.name !== 'Sobre').map((page) => (
            <Link
              key={page.name}
              to={page.url}
              className={`flex flex-col items-center justify-center py-3 px-2 rounded-3xl transition-all duration-300 flex-1 min-w-0 ${
                isActive(page)
                  ? 'bg-[#32a2dc] text-white shadow-lg transform scale-105'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
              }`}
            >
              <page.icon className="w-5 h-5 mb-1 flex-shrink-0" />
              <span className="text-xs font-bold text-center leading-tight truncate">{page.name}</span>
            </Link>
          ))}
        </div>
      </nav>
      <div className="fixed bottom-2 right-2 text-xs text-gray-500">V1</div>
    </div>
  );
}
