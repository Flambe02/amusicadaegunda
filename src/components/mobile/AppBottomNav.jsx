import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Barre de navigation basse mobile (< 768 px, montée uniquement par Layout), façon
 * TikTok (décision du 2026-09-25).
 *
 * Fond noir pur, filet supérieur très discret. Onglet actif : icône pleine blanche +
 * libellé en gras ; inactifs : icône en contour, blanc à 60 %. Aucun jaune sur les
 * onglets : le seul jaune de la barre est la pastille centrale de la Caipivara
 * (Catálogo), sans libellé ; active, elle prend un léger contour blanc.
 *
 * `items` :
 *   { value, label, href, icon, activeIcon }                 onglet
 *   { value, label, href, image, variant: 'pill' }           pastille centrale
 *   { value, label, icon, activeIcon, menuItems: [...] }     ouvre une feuille
 *     menuItems : [{ value, label, description?, href, icon }]
 */
export default function AppBottomNav({ items = [], activeValue }) {
  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => {
    if (!openMenu) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openMenu]);

  const renderItemContent = (item, isActive) => {
    const Icon = isActive && item.activeIcon ? item.activeIcon : item.icon;
    const colorClass = isActive ? 'text-white' : 'text-white/60';

    return (
      <>
        {Icon ? <Icon className={`h-6 w-6 ${colorClass}`} aria-hidden="true" /> : null}
        <span className={`mt-0.5 text-[10px] leading-tight ${isActive ? 'font-bold' : 'font-medium'} ${colorClass}`}>
          {item.label}
        </span>
      </>
    );
  };

  const openItem = openMenu ? items.find((i) => i.value === openMenu) : null;
  const tabClass =
    'flex min-h-[48px] w-full touch-manipulation select-none flex-col items-center justify-center px-1 py-1 active:opacity-70';

  return (
    <>
      <nav
        className="z-40 flex-shrink-0 border-t border-white/10 bg-black pb-[env(safe-area-inset-bottom)]"
        aria-label="Navegação principal"
      >
        <ul
          className="grid px-1 pb-1 pt-1.5"
          style={{ gridTemplateColumns: `repeat(${items.length || 5}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const isActive = item.value === activeValue;

            if (item.variant === 'pill') {
              return (
                <li key={item.value} className="flex items-center justify-center">
                  <Link
                    to={item.href}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    data-active={isActive ? 'true' : 'false'}
                    className="flex min-h-[48px] min-w-[48px] touch-manipulation select-none items-center justify-center active:opacity-80"
                  >
                    <span
                      className={`flex h-[34px] w-[46px] items-center justify-center rounded-[11px] bg-app-yellow ${
                        isActive ? 'ring-[1.5px] ring-white ring-offset-[1.5px] ring-offset-black' : ''
                      }`}
                    >
                      <img src={item.image} alt="" width="28" height="28" className="h-7 w-7 object-contain" />
                    </span>
                  </Link>
                </li>
              );
            }

            if (item.menuItems) {
              return (
                <li key={item.value}>
                  <button
                    type="button"
                    onClick={() => setOpenMenu(item.value)}
                    className={tabClass}
                    aria-haspopup="dialog"
                    aria-expanded={openMenu === item.value}
                    data-active={isActive ? 'true' : 'false'}
                  >
                    {renderItemContent(item, isActive)}
                  </button>
                </li>
              );
            }

            return (
              <li key={item.value}>
                <Link to={item.href} className={tabClass} aria-current={isActive ? 'page' : undefined}>
                  {renderItemContent(item, isActive)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {openItem && openItem.menuItems ? (
        <div className="fixed inset-0 z-[60] flex items-end" role="dialog" aria-modal="true" aria-label={openItem.label}>
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpenMenu(null)}
            aria-label="Fechar menu"
          />
          <div className="relative max-h-[85svh] w-full overflow-y-auto overscroll-contain rounded-t-[28px] border-t border-white/10 bg-app-charcoal pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/20" aria-hidden="true" />
            <ul className="space-y-1 px-3">
              {openItem.menuItems.map((sub) => {
                const SubIcon = sub.icon;
                return (
                  <li key={sub.value}>
                    <Link
                      to={sub.href}
                      onClick={() => setOpenMenu(null)}
                      className="flex min-h-[44px] touch-manipulation items-center gap-3 rounded-2xl px-3 py-3 transition active:bg-white/5"
                    >
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/70">
                        {SubIcon ? <SubIcon className="h-5 w-5" aria-hidden="true" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-base font-semibold text-white">{sub.label}</span>
                        {sub.description ? (
                          <span className="block text-sm leading-snug text-white/70">{sub.description}</span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
