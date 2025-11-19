import { Link, useLocation } from 'react-router-dom';
import { Home, ListMusic, Calendar, Menu } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useState } from 'react';
import MenuDrawer from './MenuDrawer';

export default function BottomNavigation() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigationItems = [
    { 
      name: 'Home', 
      url: createPageUrl('Home'), 
      icon: Home,
      isLink: true
    },
    { 
      name: 'Playlist', 
      url: createPageUrl('Playlist'), 
      icon: ListMusic,
      isLink: true
    },
    { 
      name: 'Agenda', 
      url: createPageUrl('Calendar'), 
      icon: Calendar,
      isLink: true
    },
    { 
      name: 'Menu', 
      url: '#', 
      icon: Menu,
      isLink: false,
      onClick: () => setIsMenuOpen(true)
    },
  ];

  const isActive = (item) => {
    if (item.name === 'Home' && location.pathname === '/') return true;
    if (item.name === 'Menu') return false; // Menu n'est jamais actif
    return location.pathname === item.url;
  };

  const handleMenuClick = (e) => {
    e.preventDefault();
    setIsMenuOpen(true);
  };

  return (
    <>
      {/* Bottom Navigation - Glassmorphism avec fond sombre */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-[100] bg-black/90 backdrop-blur-md border-t border-white/20 shadow-2xl"
        aria-label="Navigation principale"
      >
        <div className="flex items-center justify-around px-2 py-3 safe-area-inset-bottom">
          {navigationItems.map((item) => {
            const active = isActive(item);
            
            if (item.isLink) {
              return (
                <Link
                  key={item.name}
                  to={item.url}
                  aria-current={active ? 'page' : undefined}
                  className={`
                    flex flex-col items-center justify-center
                    min-w-[64px] min-h-[64px] px-4 py-3
                    rounded-2xl transition-all duration-300
                    touch-manipulation
                    ${active
                      ? 'bg-cyan-500/30 text-white scale-105'
                      : 'text-white/60 hover:text-white hover:bg-white/10 active:scale-95'
                    }
                  `}
                >
                  <item.icon 
                    className={`w-6 h-6 mb-1 flex-shrink-0 transition-colors ${active ? 'text-white scale-110' : 'text-white/60'}`} 
                    aria-hidden="true" 
                  />
                  <span className={`text-[10px] font-medium text-center leading-tight ${active ? 'text-white font-semibold' : 'text-white/60'}`}>
                    {item.name}
                  </span>
                </Link>
              );
            } else {
              return (
                <button
                  key={item.name}
                  onClick={handleMenuClick}
                  className={`
                    flex flex-col items-center justify-center
                    min-w-[64px] min-h-[64px] px-4 py-3
                    rounded-2xl transition-all duration-300
                    touch-manipulation
                    text-white/60 hover:text-white hover:bg-white/10 active:scale-95
                  `}
                  aria-label="Ouvrir le menu"
                >
                  <item.icon 
                    className="w-6 h-6 mb-1 flex-shrink-0 text-white/60 transition-colors" 
                    aria-hidden="true" 
                  />
                  <span className="text-[10px] font-medium text-center leading-tight text-white/60">
                    {item.name}
                  </span>
                </button>
              );
            }
          })}
        </div>
      </nav>

      {/* Menu Drawer */}
      <MenuDrawer
        open={isMenuOpen}
        onOpenChange={setIsMenuOpen}
      />
    </>
  );
}

