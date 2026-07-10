import { Home, Search, LayoutGrid, LogOut } from 'lucide-react';
import FocusRow from './FocusRow';
import FocusableButton from './FocusableButton';

/**
 * Sidebar d'icônes commune (accueil + fiche) — navigable au D-pad, sans libellés.
 * Le dernier bouton QUITTE l'application (indispensable sur Android TV, où il n'y a
 * pas de geste « accueil système » évident).
 */
export default function TvSidebar({ focusKey = 'SIDEBAR', onHome, onSearch, onCatalog, onExit }) {
  return (
    <FocusRow className="tv-sidebar" focusKey={focusKey}>
      <FocusableButton className="tv-side-btn" ariaLabel="Início" onPress={onHome}><Home size={24} /></FocusableButton>
      <FocusableButton className="tv-side-btn" ariaLabel="Pesquisar" onPress={onSearch}><Search size={24} /></FocusableButton>
      <FocusableButton className="tv-side-btn" ariaLabel="Catálogo" onPress={onCatalog}><LayoutGrid size={24} /></FocusableButton>
      <FocusableButton className="tv-side-btn tv-side-btn-exit" ariaLabel="Sair da aplicação" onPress={onExit}><LogOut size={24} /></FocusableButton>
    </FocusRow>
  );
}
