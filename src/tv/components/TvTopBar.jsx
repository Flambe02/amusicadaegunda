import { Search } from 'lucide-react';
import { BRAND_SQUARE_SMALL } from '@/lib/imageAssets';
import FocusRow from './FocusRow';
import FocusableButton from './FocusableButton';

/**
 * Barre du haut commune : pill de recherche (à gauche) + avatar mascotte (à droite).
 */
export default function TvTopBar({ focusKey = 'SEARCH', onSearch }) {
  return (
    <header className="tv-content-top">
      <FocusRow className="tv-searchwrap" focusKey={focusKey}>
        <FocusableButton className="tv-search" ariaLabel="Pesquisar" onPress={onSearch}>
          <Search size={18} /> <span className="tv-search-ph">Pesquisar…</span>
        </FocusableButton>
      </FocusRow>
      <img src={BRAND_SQUARE_SMALL} alt="" className="tv-avatar" />
    </header>
  );
}
