import { useEffect } from 'react';
import { FocusContext, useFocusable, SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { Users, Flame, Globe } from 'lucide-react';

const FONT_SCALES = [
  { label: 'P', value: 0.85 }, { label: 'M', value: 1 }, { label: 'G', value: 1.2 }, { label: 'XG', value: 1.45 },
];
const RATES = [{ label: '1×', value: 1 }, { label: '0.75×', value: 0.75 }, { label: '0.5×', value: 0.5 }];
const TRANSLATE = [{ label: 'Off', value: 'off' }, { label: 'FR', value: 'fr' }, { label: 'EN', value: 'en' }];

// Ligne à choix multiple = UN focusable. ←/→ cycle la valeur (clamp ou wrap),
// Haut/Bas laisse passer pour changer de ligne. Pastille jaune sur la valeur active.
function OptChoiceLine({ focusKey, label, icon: Icon, options, value, onChange, wrap }) {
  const idx = options.findIndex((o) => o.value === value);
  const { ref, focused } = useFocusable({
    focusKey,
    onArrowPress: (dir) => {
      if (dir === 'left' || dir === 'right') {
        const delta = dir === 'right' ? 1 : -1;
        let next = idx + delta;
        next = wrap
          ? (next + options.length) % options.length
          : Math.max(0, Math.min(options.length - 1, next));
        if (next !== idx && next >= 0) onChange(options[next].value);
        return false; // ne pas déplacer le focus
      }
      return true; // haut/bas → ligne suivante/précédente
    },
  });
  return (
    <div ref={ref} className={`tv-opt-line ${focused ? 'is-focused' : ''}`}>
      <span className="tv-opt-label">{Icon && <Icon size={17} />}{label}</span>
      <span className="tv-opt-choices">
        {options.map((o) => (
          <span key={o.label} className={`tv-opt-chip ${o.value === value ? 'is-sel' : ''}`}>{o.label}</span>
        ))}
      </span>
    </div>
  );
}

// Toggle = UN focusable. OK bascule on/off.
function OptToggleLine({ focusKey, label, icon: Icon, on, onToggle }) {
  const { ref, focused } = useFocusable({ focusKey, onEnterPress: onToggle });
  return (
    <div ref={ref} onClick={onToggle} className={`tv-opt-line ${focused ? 'is-focused' : ''}`}>
      <span className="tv-opt-label">{Icon && <Icon size={17} />}{label}</span>
      <span className={`tv-opt-switch ${on ? 'is-on' : ''}`}><span /></span>
    </div>
  );
}

/**
 * Panneau d'options du karaoké TV — navigable au D-pad. Rendu (lazy) uniquement en
 * tvMode par KaraokePlayer → reste hors du bundle mobile.
 *
 * Ce panneau est un FOCUS BOUNDARY : Haut/Bas/←/→ ne peuvent pas en sortir (la barre
 * de transport / gear restent inatteignables tant qu'il est ouvert). Il RÉACTIVE la
 * nav spatiale à l'ouverture et la remet en PAUSE à la fermeture (retour aux touches
 * de lecture). Ordre : Tamanho → Bolinha → Dueto → Energia → Tradução → Velocidade.
 */
export default function KaraokeTvOptions({ opts, setOpts }) {
  const { ref, focusKey } = useFocusable({
    focusKey: 'KTV_OPTS', isFocusBoundary: true, trackChildren: true, saveLastFocusedChild: true,
  });

  useEffect(() => {
    SpatialNavigation.resume();
    const t = setTimeout(() => { try { SpatialNavigation.setFocus('KTV_OPT_0'); } catch { /* ignore */ } }, 0);
    return () => { clearTimeout(t); SpatialNavigation.pause(); };
  }, []);

  const set = (patch) => setOpts((o) => ({ ...o, ...patch }));

  return (
    <FocusContext.Provider value={focusKey}>
      <div className="tv-opts-overlay">
        <div ref={ref} className="tv-opts-panel">
          <h2 className="tv-opts-title">Opções</h2>
          <OptChoiceLine focusKey="KTV_OPT_0" label="Tamanho da letra" options={FONT_SCALES} value={opts.fontScale} onChange={(v) => set({ fontScale: v })} wrap={false} />
          <OptToggleLine label="Bolinha" on={opts.showBall} onToggle={() => set({ showBall: !opts.showBall })} />
          <OptToggleLine label="Modo dueto (P1 / P2)" icon={Users} on={opts.dueto} onToggle={() => set({ dueto: !opts.dueto })} />
          <OptToggleLine label="Medidor de energia" icon={Flame} on={opts.energy} onToggle={() => set({ energy: !opts.energy })} />
          <OptChoiceLine label="Tradução" icon={Globe} options={TRANSLATE} value={opts.translate} onChange={(v) => set({ translate: v })} wrap />
          <OptChoiceLine label="Velocidade" options={RATES} value={opts.rate} onChange={(v) => set({ rate: v })} wrap={false} />
          <p className="tv-opts-hint">Voltar para fechar</p>
        </div>
      </div>
    </FocusContext.Provider>
  );
}
