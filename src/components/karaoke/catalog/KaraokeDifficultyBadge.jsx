import { getDifficultyBadge } from '@/lib/karaokeDifficulty';

/**
 * Badge de dificuldade partilhado (cartão da grade + resultado « Me surpreenda »).
 * A cor NUNCA é a única portadora de sentido — o texto acompanha sempre (secção 4E).
 * Sem valor conhecida (nem manual, nem estimável): não renderiza nada — uma carta
 * sem badge continua perfeitamente acessível/clicável (secção 6).
 */
export default function KaraokeDifficultyBadge({ song, className = '' }) {
  const badge = getDifficultyBadge(song);
  if (!badge) return null;
  return (
    <span className={`karaoke-difficulty-badge is-${badge.key} ${className}`.trim()}>
      {badge.label}
    </span>
  );
}
