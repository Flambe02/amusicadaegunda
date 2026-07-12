import { useFocusable, SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { Mic2, Users } from 'lucide-react';

/** Icône « 3 barres » de difficulté (jamais la couleur seule qui porte l'info). */
function DifficultyBars({ level }) {
  return (
    <span className="tvc-diff-bars" aria-hidden="true">
      <i className={level >= 1 ? 'is-on' : ''} style={{ height: '45%' }} />
      <i className={level >= 2 ? 'is-on' : ''} style={{ height: '72%' }} />
      <i className={level >= 3 ? 'is-on' : ''} style={{ height: '100%' }} />
    </span>
  );
}

// Une SEULE icône de compatibilité par carte, et seulement quand elle ajoute de
// l'info : Dueto (2 voix) ou Família. Le Solo (défaut de tout titre) n'affiche rien
// pour ne pas saturer la grille (cf. cahier des charges).
function compatIcon(vm) {
  if (vm.recommendedModes.includes('duet')) return { Icon: Mic2, label: 'Dueto' };
  if (vm.recommendedModes.includes('family')) return { Icon: Users, label: 'Família' };
  return null;
}

/**
 * Carte de chanson du catálogo — communique une OPPORTUNITÉ de performance, pas
 * juste une pochette. Titre + thème + difficulté (2 métadonnées texte max sous le
 * titre) + éventuellement UNE icône de compatibilité. Au focus : bordure/halo
 * jaune, léger zoom de l'image seule (jamais les voisines), et mise à jour du
 * panneau contextuel via `onFocusSong`. OK ouvre la fiche (jamais le karaokê
 * directement, jamais l'autoplay).
 */
export default function TvSongGridCard({ vm, focusKey, artSrc, onSelect, onFocusSong }) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: () => onSelect(vm),
    onFocus: () => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      onFocusSong?.(vm);
    },
    // Droite depuis la DERNIÈRE colonne (aucune carte à droite sur la même
    // rangée) → entre dans le panneau contextuel (CTA principal), de façon
    // déterministe. Détecté via la géométrie réelle (offsetTop du voisin) → marche
    // quel que soit le nombre de colonnes (4 à 1080p, 3 à 720p). Ailleurs, on
    // laisse Norigin déplacer vers la carte de droite (retour true).
    onArrowPress: (direction) => {
      if (direction !== 'right') return true;
      const card = ref.current;
      const next = card?.nextElementSibling;
      const isLastColumn = !next || next.offsetTop > card.offsetTop;
      if (isLastColumn) {
        try { SpatialNavigation.setFocus('CAT_PANEL_CONHECER'); } catch { /* ignore */ }
        return false;
      }
      return true;
    },
  });
  const compat = compatIcon(vm);

  // Élément racine = <div role="button"> et NON <button> : le « button layout »
  // interne de Chromium n'agrandit pas la carte à la hauteur d'une vignette à
  // ratio (padding-bottom) dans une piste de grille → la carte s'effondrait à la
  // hauteur du texte et la vignette débordait. Un div se dimensionne normalement.
  // Focus/OK gérés par Norigin (onEnterPress) + onClick pour le fallback tactile.
  return (
    <div
      ref={ref}
      role="button"
      tabIndex={-1}
      data-song-id={vm.id}
      onClick={() => onSelect(vm)}
      aria-label={`Abrir a ficha de ${vm.title}`}
      className={`tvc-card ${focused ? 'is-focused' : ''}`}
    >
      <div className="tvc-card-media">
        {artSrc
          ? <img src={artSrc} alt="" loading="lazy" decoding="async" className="tvc-card-img" />
          : <div className="tvc-card-img tvc-card-img-fallback" aria-hidden="true" />}
        {compat && (
          <span className="tvc-card-compat" title={compat.label}>
            <compat.Icon size={15} />
          </span>
        )}
      </div>
      <div className="tvc-card-body">
        <span className="tvc-card-title">{vm.title}</span>
        <span className="tvc-card-meta">
          {vm.theme && <span className="tvc-card-theme">{vm.theme}</span>}
          <span className={`tvc-card-diff tvc-diff-${vm.difficulty}`}>
            <DifficultyBars level={vm.difficultyLevel} /> {vm.difficultyLabel}
          </span>
        </span>
      </div>
    </div>
  );
}
