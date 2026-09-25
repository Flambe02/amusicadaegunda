import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Barre de navigation basse mobile (< 768 px, montée uniquement par Layout).
 *
 * Fond opaque #050505 (token `app-black`) : la barre ne laisse plus transparaître le
 * contenu, y compris sur le feed vidéo de l'Início. Tous les onglets sont égaux et
 * plats ; seul l'onglet actif prend le jaune (icône + légende).
 *
 * `items` : { value, label, href, icon } ou, pour l'ouverture d'une feuille,
 * { value, label, icon, menuItems: [{ value, label, description?, href, icon }] }.
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
    const Icon = item.icon;
    const colorClass = isActive ? 'text-app-yellow' : 'text-white/55';

    return (
      <>
        {Icon ? <Icon className={`h-5 w-5 ${colorClass}`} aria-hidden="true" /> : null}
        <span className={`mt-0.5 text-[10px] font-semibold ${colorClass}`}>{item.label}</span>
      </>
    );
  };

  const openItem = openMenu ? items.find((i) => i.value === openMenu) : null;

  return (
    <>
      <nav
        className="z-40 flex-shrink-0 border-t border-app-border bg-app-black pb-[env(safe-area-inset-bottom)] shadow-app-nav"
        aria-label="Navegação principal"
      >
        <ul
          className="grid gap-1 px-2 pt-2 pb-1"
          style={{ gridTemplateColumns: `repeat(${items.length || 4}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const isActive = item.value === activeValue;
            const sharedClass =
              'flex min-h-[48px] w-full touch-manipulation select-none flex-col items-center justify-center rounded-xl px-1 py-1.5 transition active:bg-white/5';

            if (item.menuItems) {
              return (
                <li key={item.value}>
                  <button
                    type="button"
                    onClick={() => setOpenMenu(item.value)}
                    className={sharedClass}
                    aria-haspopup="dialog"
                    aria-expanded={openMenu === item.value}
                  >
                    {renderItemContent(item, isActive)}
                  </button>
                </li>
              );
            }

            return (
              <li key={item.value}>
                <Link to={item.href} className={sharedClass} aria-current={isActive ? 'page' : undefined}>
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
