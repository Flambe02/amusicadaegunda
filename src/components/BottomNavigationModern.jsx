import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Menu, Search, Shuffle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import MenuDrawerModern from './MenuDrawerModern';

export default function BottomNavigationModern() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMonday = new Date().getDay() === 1;

  const items = [
    { name: 'Home', url: createPageUrl('Home'), icon: Home, isLink: true },
    { name: 'Pesquisa', url: createPageUrl('Search'), icon: Search, isLink: true },
    { name: 'Roda', url: createPageUrl('Roda'), icon: Shuffle, isLink: true },
    { name: 'Menu', url: '#', icon: Menu, isLink: false },
  ];

  const isActive = (item) => {
    if (item.name === 'Home' && location.pathname === '/') return true;
    if (!item.isLink) return false;
    return location.pathname === item.url;
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-[100] border-t border-white/12 bg-black/82 backdrop-blur-2xl shadow-[0_-12px_32px_rgba(0,0,0,0.32)]"
        aria-label="Navigation principale"
      >
        <div className="safe-area-inset-bottom flex min-h-[64px] items-center justify-around gap-1 px-2 pb-3 pt-2">
          {items.map((item) => {
            const active = isActive(item);
            const content = (
              <>
                <div className="relative">
                  <item.icon
                    className={`mb-1 h-5 w-5 transition-colors ${
                      active ? 'text-[#FDE047]' : 'text-white/66'
                    }`}
                    aria-hidden="true"
                  />
                  {!item.isLink && isMonday ? (
                    <span className="absolute -right-2 -top-1 rounded-full bg-[#FDE047] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-black">
                      New
                    </span>
                  ) : null}
                </div>
                <span
                  className={`text-center text-[10px] font-medium leading-tight ${
                    active ? 'font-semibold text-white' : 'text-white/60'
                  }`}
                >
                  {item.name}
                </span>
              </>
            );

            const className = `flex min-h-[60px] min-w-[64px] flex-col items-center justify-center rounded-[20px] px-3 py-2 transition-all duration-200 touch-manipulation ${
              active
                ? 'bg-white/12 text-white'
                : 'text-white/56 hover:bg-white/8 hover:text-white active:scale-95'
            }`;

            if (item.isLink) {
              return (
                <Link
                  key={item.name}
                  to={item.url}
                  aria-current={active ? 'page' : undefined}
                  className={className}
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className={className}
                aria-label="Ouvrir le menu"
              >
                {content}
              </button>
            );
          })}
        </div>
      </nav>

      <MenuDrawerModern open={isMenuOpen} onOpenChange={setIsMenuOpen} />
    </>
  );
}
