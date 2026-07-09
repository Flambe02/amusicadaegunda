import { Home, Search, LayoutGrid, Settings } from 'lucide-react';
import FocusRow from './FocusRow';
import FocusableButton from './FocusableButton';

/**
 * Sidebar d'icônes commune (accueil + fiche) — navigable au D-pad, sans libellés.
 */
export default function TvSidebar({ focusKey = 'SIDEBAR', onHome, onSearch, onCatalog, onSettings }) {
  return (
    <FocusRow className="tv-sidebar" focusKey={focusKey}>
      <FocusableButton className="tv-side-btn" ariaLabel="Início" onPress={onHome}><Home size={24} /></FocusableButton>
      <FocusableButton className="tv-side-btn" ariaLabel="Pesquisar" onPress={onSearch}><Search size={24} /></FocusableButton>
      <FocusableButton className="tv-side-btn" ariaLabel="Catálogo" onPress={onCatalog}><LayoutGrid size={24} /></FocusableButton>
      <FocusableButton className="tv-side-btn" ariaLabel="Sair do modo TV" onPress={onSettings}><Settings size={24} /></FocusableButton>
    </FocusRow>
  );
}
