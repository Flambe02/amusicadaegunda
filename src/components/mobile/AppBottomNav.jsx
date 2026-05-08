import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function AppBottomNav({ items = [], activeValue }) {
  const [openMenu, setOpenMenu] = useState(null);

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
      <nav className="z-40 flex-shrink-0 border-t border-app-border bg-app-surface-strong backdrop-blur-2xl pb-[env(safe-area-inset-bottom)] shadow-app-nav">
        <ul className={`grid grid-cols-${items.length || 4} gap-1 px-2 pt-2 pb-1`}>
          {items.map((item) => {
            const isActive = item.value === activeValue;
            const sharedClass =
              'flex w-full flex-col items-center justify-center rounded-xl px-1 py-1.5 transition active:bg-white/5';

            if (item.menuItems) {
              return (
                <li key={item.value}>
                  <button
                    type="button"
                    onClick={() => setOpenMenu(item.value)}
                    className={sharedClass}
                    aria-haspopup="menu"
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
        <div className="fixed inset-0 z-[60] flex items-end" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpenMenu(null)}
            aria-label="Fechar menu"
          />
          <div className="relative w-full rounded-t-[28px] border-t border-white/10 bg-app-charcoal pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/22" aria-hidden="true" />
            <ul className="space-y-1 px-3">
              {openItem.menuItems.map((sub) => {
                const SubIcon = sub.icon;
                return (
                  <li key={sub.value}>
                    <Link
                      to={sub.href}
                      onClick={() => setOpenMenu(null)}
                      className="flex items-center gap-3 rounded-2xl px-3 py-3 transition active:bg-white/5"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/8 text-white/72">
                        {SubIcon ? <SubIcon className="h-5 w-5" /> : null}
                      </span>
                      <span className="text-base font-semibold text-white">{sub.label}</span>
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
