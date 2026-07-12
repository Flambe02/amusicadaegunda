import { useEffect } from 'react';
import { FocusContext, useFocusable, SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { Mic, Mic2, PartyPopper } from 'lucide-react';

const MODE_DEFS = {
  solo: { icon: Mic, title: 'Solo', desc: 'Cante sozinho' },
  duet: { icon: Mic2, title: 'Dueto', desc: 'Cante com alguém' },
  festa: { icon: PartyPopper, title: 'Festa', desc: 'Adicione à sessão' },
};

function ModeOption({ mode, onSelect }) {
  const def = MODE_DEFS[mode];
  const { ref, focused } = useFocusable({
    focusKey: `DETAIL_MODE_${mode.toUpperCase()}`,
    onEnterPress: () => onSelect(mode),
  });
  const Icon = def.icon;
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(mode)}
      aria-label={`${def.title} — ${def.desc}`}
      className={`tvd-mode-option tvd-mode-${mode} ${focused ? 'is-focused' : ''}`}
    >
      <span className="tvd-mode-icon"><Icon size={30} /></span>
      <span className="tvd-mode-title">{def.title}</span>
      <span className="tvd-mode-desc">{def.desc}</span>
    </button>
  );
}

/**
 * Overlay compact « COMO VOCÊ QUER CANTAR? » — n'est affiché QUE si plusieurs modes
 * sont pertinents (cf. spec). Chaque mode mène à un parcours différent (le parent
 * décide). Back ferme l'overlay et restitue le focus à la rangée d'actions (géré
 * par le backInterceptor du parent).
 */
export default function TvModeSelectionOverlay({ modes, onSelect, onClose, backInterceptorRef }) {
  const { ref, focusKey } = useFocusable({
    focusKey: 'DETAIL_MODE', trackChildren: true, saveLastFocusedChild: true,
  });

  useEffect(() => {
    const first = modes[0];
    const t = setTimeout(() => { try { SpatialNavigation.setFocus(`DETAIL_MODE_${first.toUpperCase()}`); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
  }, [modes]);

  useEffect(() => {
    if (!backInterceptorRef) return undefined;
    backInterceptorRef.current = () => { onClose(); return true; };
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [backInterceptorRef, onClose]);

  return (
    <div className="tvd-overlay tvd-mode-overlay">
      <FocusContext.Provider value={focusKey}>
        <div ref={ref} className="tvd-mode-box">
          <h2 className="tvd-mode-heading">Como você quer cantar?</h2>
          <div className="tvd-mode-grid">
            {modes.map((m) => <ModeOption key={m} mode={m} onSelect={onSelect} />)}
          </div>
        </div>
      </FocusContext.Provider>
    </div>
  );
}
