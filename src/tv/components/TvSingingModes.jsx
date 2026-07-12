import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { Mic, Mic2, PartyPopper } from 'lucide-react';
import TvSingingModeCard from './TvSingingModeCard';

// Trois façons de chanter — chacune mène à un PARCOURS DIFFÉRENT (jamais la même
// page) : Solo prépare une session individuelle, Dueto filtre les chansons à deux
// voix, Festa crée/rejoint une session multi-téléphones avec QR + fila.
const MODES = [
  { key: 'solo', focusKey: 'HOME_MODE_SOLO', icon: Mic, title: 'Solo', desc: 'Cante sozinho' },
  { key: 'duet', focusKey: 'HOME_MODE_DUETO', icon: Mic2, title: 'Dueto', desc: 'Cante com alguém' },
  { key: 'festa', focusKey: 'HOME_MODE_FESTA', icon: PartyPopper, title: 'Festa', desc: 'Todos cantam juntos' },
];

/**
 * Section « ESCOLHA COMO VOCÊ VAI CANTAR » — DOIT rester visible sans défilement
 * sur un 1080p standard (juste sous la rangée de chansons). Les modes sont des
 * FILTRES/MODES de session, pas des catalogues vidéo.
 */
export default function TvSingingModes({ onChooseMode }) {
  const { ref, focusKey } = useFocusable({
    focusKey: 'HOME_MODES', trackChildren: true, saveLastFocusedChild: true,
  });
  return (
    <FocusContext.Provider value={focusKey}>
      <section className="tvh-modes">
        <h2 className="tvh-section-heading"><PartyPopper size={20} /> Escolha como você vai cantar</h2>
        <div ref={ref} className="tvh-mode-grid">
          {MODES.map((mode) => (
            <TvSingingModeCard key={mode.key} mode={mode} onSelect={onChooseMode} />
          ))}
        </div>
      </section>
    </FocusContext.Provider>
  );
}
