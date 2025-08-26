
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Calendar, Gift, Info } from 'lucide-react';

export default function Layout({ children }) {
  const location = useLocation();
  const pages = [
    { name: 'Início', url: createPageUrl('Home'), icon: Home },
    { name: 'Calendário', url: createPageUrl('Calendar'), icon: Calendar },
    { name: 'Advento', url: createPageUrl('AdventCalendar'), icon: Gift },
    { name: 'Sobre', url: createPageUrl('Sobre'), icon: Info },
  ];

  const isActive = (page) => {
    if (page.name === 'Início' && location.pathname === '/') return true;
    return location.pathname === page.url;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-200 to-rose-200">
      <main className="pb-28 relative z-10">
        {children}
      </main>

      {/* Navegação Inferior */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/50 z-50">
        <div className="flex justify-around items-center p-1">
          {pages.map((page) => (
            <Link
              key={page.name}
              to={page.url}
              className={`flex-1 flex flex-col items-center py-2 px-2 rounded-3xl transition-all duration-300 ${
                isActive(page)
                  ? 'bg-[#32a2dc] text-white shadow-lg transform scale-105'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
              }`}
            >
              <page.icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-bold">{page.name}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
