// Narrow, collapsible admin sidebar with real route links.
// Only implemented routes are listed (no dead nav): Catálogo, Biblioteca, Links,
// Configurações.
import { NavLink } from 'react-router-dom';
import { Library, FolderOpen, Link2, Settings, ChevronsLeft, ChevronsRight } from 'lucide-react';

const ITEMS = [
  { to: '/admin', end: true, icon: Library, label: 'Catálogo' },
  { to: '/admin/biblioteca', icon: FolderOpen, label: 'Biblioteca' },
  { to: '/admin/links', icon: Link2, label: 'Links' },
  { to: '/admin/configuracoes', icon: Settings, label: 'Configurações' },
];

export default function AdminSidebar({ collapsed, onToggleCollapse, adminEmail }) {
  return (
    <nav
      className={`sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 flex-col border-r border-white/10 bg-gray-950 md:flex ${collapsed ? 'w-16' : 'w-52'}`}
      aria-label="Navegação do administrador"
    >
      <div className="flex-1 space-y-1 p-3">
        {ITEMS.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${collapsed ? 'justify-center' : ''} ${
                isActive ? 'bg-purple-500/15 text-purple-300' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
                {isActive && !collapsed && <span className="ml-auto h-4 w-1 rounded-full bg-purple-400" />}
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="border-t border-white/10 p-3">
        {adminEmail && !collapsed && (
          <p className="mb-2 truncate px-1 text-[11px] text-gray-600" title={adminEmail}>{adminEmail}</p>
        )}
        <button
          onClick={onToggleCollapse}
          className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-gray-500 hover:bg-white/5 hover:text-white transition-colors ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> Recolher</>}
        </button>
      </div>
    </nav>
  );
}
