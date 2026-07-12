import { Music, Zap, Users, Smile, Star } from 'lucide-react';
import { getWhySingReasons } from '../lib/songMeta';

// 4 icônes fixes (une par position, pas par contenu) — calquées sur la référence :
// ⚡ actualité / 👥 groupe / 🙂 refrão contagiante / ⭐ thème connu de tous.
const REASON_ICONS = [Zap, Users, Smile, Star];

/**
 * Panneau éditorial « POR QUE CANTAR? » — à droite du hero (~20-22% de la largeur).
 * Explique pourquoi CETTE chanson vaut le coup d'être chantée maintenant ; ne
 * ressemble jamais à un panneau technique de métadonnées (pas de labels, pas de
 * grille — juste 4 phrases courtes avec une icône).
 *
 * JAMAIS focusable : aucun `useFocusable` ici. La nav D-pad ne doit jamais pouvoir
 * « atterrir » dans ce panneau (cf. cahier des charges), ce qui est garanti
 * automatiquement puisqu'il ne contient aucun élément candidat au focus spatial.
 */
export default function TvWhySingPanel({ song }) {
  if (!song) return null;
  const reasons = getWhySingReasons(song);

  return (
    <aside className="tvh-why" aria-label={`Por que cantar ${song.title}`}>
      <h2 className="tvh-why-heading">
        <Music size={18} /> Por que cantar?
      </h2>
      <ul className="tvh-why-list">
        {reasons.map((reason, i) => {
          const Icon = REASON_ICONS[i % REASON_ICONS.length];
          return (
            <li key={reason} className="tvh-why-item">
              <Icon size={18} className="tvh-why-icon" />
              <span>{reason}</span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
