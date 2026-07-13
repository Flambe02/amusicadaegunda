import { Star, Mic, Play } from 'lucide-react';
import FocusableButton from './FocusableButton';
import { getReleaseBadge, getHeroMeta, getPitch } from '../lib/songMeta';

// Titres longs : réduit le corps pour éviter les césures disgracieuses (un titre
// « normal » comme INDEPENDÊNCIA OU GOL garde la taille maximale, jamais plus de
// 2 lignes — cf. -webkit-line-clamp en CSS).
function titleSizeClass(title) {
  const len = (title || '').length;
  if (len > 40) return 'is-xlong';
  if (len > 24) return 'is-long';
  return '';
}

/**
 * Hero « song-first » de l'accueil TV. Objectif produit : présenter UNE chanson et
 * pousser à la DÉCOUVRIR, pas à regarder un clip. Donc :
 *  - CTA dominant « ABRIR FICHA » (icône play plein, jaune) → ouvre la fiche
 *    (l'écran de décision) ;
 *  - CTA secondaire « CANTAR AGORA » → lance le karaokê directement (si dispo).
 * Typographie des boutons calquée sur la référence : capitales + interlettrage
 * (cf. .tvh-btn text-transform en CSS). AUCUN lecteur vidéo embarqué, 3 métadonnées
 * max. Le focus par défaut est posé par TvHomePage sur « Abrir ficha ».
 *
 * `dots` (optionnel) = pastilles de pagination PUREMENT décoratives représentant
 * les chansons candidates de la « une » (jamais de rotation automatique, jamais
 * focusables — le changement de hero se fait uniquement via le focus des cartes
 * de la rangée juste en dessous).
 */
export default function TvFeaturedHero({ song, heroSrc, hasKaraoke, dots, onConhecer, onCantar }) {
  if (!song) return null;

  const badge = getReleaseBadge(song);
  const meta = getHeroMeta(song);
  const pitch = getPitch(song, 150);

  return (
    <section className="tvh-hero">
      <div className="tvh-hero-bg" style={{ backgroundImage: `url("${heroSrc}")` }} aria-hidden="true" />
      <div className="tvh-hero-scrim" aria-hidden="true" />

      <div className="tvh-hero-content">
        {/* Zone d'info cliquable (souris/tactile) → ouvre la fiche, comme un clic sur
            une carte. Non focusable au D-pad (pas de useFocusable) : la télécommande
            passe par le bouton « Abrir ficha » ci-dessous, jamais interrompue. */}
        <div
          className="tvh-hero-lead"
          role="button"
          tabIndex={-1}
          onClick={onConhecer}
          aria-label={`Abrir a ficha de ${song.title}`}
        >
          <span className="tvh-hero-badge"><Star size={13} /> {badge}</span>
          <h1 className={`tvh-hero-title ${titleSizeClass(song.title)}`}>{song.title}</h1>
          {pitch && <p className="tvh-hero-pitch">{pitch}</p>}
          {meta && <p className="tvh-hero-meta">{meta}</p>}
        </div>

        <div className="tvh-hero-actions">
          <FocusableButton
            focusKey="HOME_HERO_PRIMARY"
            className="tvh-btn tvh-btn-primary"
            ariaLabel={`Abrir a ficha de ${song.title}`}
            onPress={onConhecer}
          >
            <Play size={20} className="tvh-btn-icon-fill" /> Abrir ficha
          </FocusableButton>

          {hasKaraoke && (
            <FocusableButton
              focusKey="HOME_HERO_SECONDARY"
              className="tvh-btn tvh-btn-secondary"
              ariaLabel={`Cantar ${song.title} agora`}
              onPress={onCantar}
            >
              <Mic size={22} /> Cantar agora
            </FocusableButton>
          )}
        </div>
      </div>

      {dots?.length > 1 && (
        <div className="tvh-hero-dots" aria-hidden="true">
          {dots.map((dot) => (
            <span key={dot.id} className={`tvh-hero-dot ${dot.active ? 'is-active' : ''}`} />
          ))}
        </div>
      )}
    </section>
  );
}
