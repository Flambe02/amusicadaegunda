import { Suspense, useRef, useState } from 'react';
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
 *   { value, label, icon, activeIcon, onSelect, buttonRef? } action (Buscar), jamais active
 *   { value, label, icon, activeIcon, sheet: Component }     ouvre un panneau (Menu)
 *     sheet reçoit { open, onOpenChange, returnFocusRef }
 */
export default function AppBottomNav({ items = [], activeValue }) {
  const [openSheet, setOpenSheet] = useState(null);
  // Le panneau (chargé à la demande) n'est monté qu'après la première ouverture.
  const [sheetRequested, setSheetRequested] = useState(false);
  const sheetButtonRef = useRef(null);

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

  const sheetItem = items.find((i) => i.sheet);
  const Sheet = sheetItem?.sheet;
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

            if (item.sheet) {
              return (
                <li key={item.value}>
                  <button
                    ref={sheetButtonRef}
                    type="button"
                    onClick={() => {
                      setSheetRequested(true);
                      setOpenSheet(item.value);
                    }}
                    className={tabClass}
                    aria-haspopup="dialog"
                    aria-expanded={openSheet === item.value}
                    data-active={isActive ? 'true' : 'false'}
                  >
                    {renderItemContent(item, isActive)}
                  </button>
                </li>
              );
            }

            if (item.onSelect) {
              // Action sans page (Buscar ouvre le panneau de recherche) : jamais active.
              return (
                <li key={item.value}>
                  <button
                    ref={item.buttonRef}
                    type="button"
                    onClick={item.onSelect}
                    className={tabClass}
                    aria-haspopup="dialog"
                  >
                    {renderItemContent(item, false)}
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

      {Sheet && sheetRequested ? (
        <Suspense fallback={null}>
          <Sheet
            open={openSheet === sheetItem.value}
            onOpenChange={(open) => setOpenSheet(open ? sheetItem.value : null)}
            returnFocusRef={sheetButtonRef}
          />
        </Suspense>
      ) : null}
    </>
  );
}
