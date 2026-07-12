import { Music, Star, Users, Mic, Smile } from 'lucide-react';
import { getWhySingCards } from '../lib/songMeta';

// Icônes des 4 raisons, dans l'ordre de la référence : ⭐ 👥 🎤 🙂.
const REASON_ICONS = [Star, Users, Mic, Smile];

/**
 * Panneau « POR QUE CANTAR? » de la fiche (colonne droite) — titre + sous-texte par
 * raison, calqué sur la référence. JAMAIS focusable (aucun `useFocusable`) : aide à
 * la décision, pas une action ; la nav D-pad ne peut donc jamais y atterrir.
 */
export default function TvWhySingDetailPanel({ vm }) {
  if (!vm) return null;
  const cards = getWhySingCards(vm.raw);

  return (
    <aside className="tvd-why" aria-label={`Por que cantar ${vm.title}`}>
      <h2 className="tvd-why-heading"><Music size={20} /> Por que cantar?</h2>
      <ul className="tvd-why-list">
        {cards.map((card, i) => {
          const Icon = REASON_ICONS[i % REASON_ICONS.length];
          return (
            <li key={card.title} className="tvd-why-item">
              <Icon size={22} className="tvd-why-icon" />
              <span className="tvd-why-text">
                <span className="tvd-why-title">{card.title}</span>
                <span className="tvd-why-sub">{card.subtitle}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
