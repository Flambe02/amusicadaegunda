import { statusMeta } from './pitchStatusMeta';

/**
 * Pílula de estado do pitch por baixo da letra (§26).
 *
 * Mostrada só em ecrãs mais altos (o cabeçalho do guia já mostra o mesmo estado
 * — evita duplicação em ecrãs pequenos, decidido a montante por media query).
 * Comunica por texto + ícone, nunca só por cor (§38).
 */
export default function PitchStatusPill({ status }) {
  const meta = statusMeta(status);
  const Icon = meta.Icon;
  const toneClass = meta.tone === 'good' ? 'is-good' : meta.tone === 'off' ? 'is-off' : 'is-neutral';
  return (
    <div className={`km-pitch-pill ${toneClass}`} role="status" aria-live="polite">
      <Icon className={`h-4 w-4 ${meta.spin ? 'animate-spin' : ''}`} />
      <span>{meta.label}</span>
    </div>
  );
}
