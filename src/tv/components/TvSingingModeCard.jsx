import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { BRAND_SQUARE_LARGE } from '@/lib/imageAssets';

/**
 * Bannière large d'un mode de chant (Solo/Dueto/Festa) — icône + titre + phrase
 * courte à gauche, mascote de marque en filigrane à droite (aucun asset illustré
 * dédié par mode dans le projet : on RÉUTILISE le logo mascote existant en
 * décoration plutôt que d'inventer un nouveau personnage, cf. cahier des charges).
 */
export default function TvSingingModeCard({ mode, onSelect }) {
  const Icon = mode.icon;
  const { ref, focused } = useFocusable({
    focusKey: mode.focusKey,
    onEnterPress: () => onSelect(mode.key),
    onFocus: () => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
  });
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(mode.key)}
      aria-label={`${mode.title} — ${mode.desc}`}
      className={`tvh-mode-card tvh-mode-${mode.key} ${focused ? 'is-focused' : ''}`}
    >
      <img src={BRAND_SQUARE_LARGE} alt="" aria-hidden="true" className="tvh-mode-mascot" />
      <span className="tvh-mode-icon"><Icon size={26} /></span>
      <span className="tvh-mode-text">
        <span className="tvh-mode-title">{mode.title}</span>
        <span className="tvh-mode-desc">{mode.desc}</span>
      </span>
    </button>
  );
}
