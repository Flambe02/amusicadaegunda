import { Mic } from 'lucide-react';

/**
 * Hero compact du catalogue Karaokê — redesign 2026-07-30 : plus de titre néon géant,
 * plus d'eyebrow décorative, plus de compteur ici (il vit désormais juste au-dessus
 * de la grille, dans Karaoke.jsx, comme SEUL compteur affiché sur la page).
 *
 * Un seul composant partagé mobile + desktop : la variation vient du CSS
 * (`.karaoke-hero-subtitle--mobile` / `--desktop`), pas d'une implémentation séparée.
 */
export default function KaraokeHero() {
  return (
    <header className="karaoke-hero">
      <h1 className="karaoke-hero-title">
        <Mic className="karaoke-hero-title-icon" aria-hidden="true" /> Escolha sua música
      </h1>
      <p className="karaoke-hero-subtitle karaoke-hero-subtitle--desktop">
        Encontre uma música e comece a cantar.
      </p>
      <p className="karaoke-hero-subtitle karaoke-hero-subtitle--mobile">
        Qual você vai cantar hoje?
      </p>
    </header>
  );
}
