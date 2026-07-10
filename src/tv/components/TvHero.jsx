import { Play, Mic } from 'lucide-react';
import FocusableButton from './FocusableButton';
import { MONTHS_PT } from '../tvMonths';

function buildBadge(releaseDate) {
  const d = releaseDate ? new Date(releaseDate) : null;
  if (!d || Number.isNaN(d.getTime())) return 'NOVA';
  return `NOVA • ${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
}

function firstSentence(text) {
  const m = text.match(/^.*?[.!?](?:\s|$)/);
  return m ? m[0].trim() : text;
}

function buildSummary(song) {
  const clean = (s) => (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const subtitle = clean(song?.subtitle);
  const text = subtitle || firstSentence(clean(song?.description));
  if (!text) return '';
  return text.length > 118 ? `${text.slice(0, 117).trimEnd()}…` : text;
}

// Titres longs : réduit progressivement le corps pour éviter les césures disgracieuses
// (ex. une ligne très longue suivie d'un mot seul) — seuils calibrés pour qu'un titre
// « normal » comme INDEPENDÊNCIA OU GOL (20 car.) garde le corps maximal.
function titleSizeClass(title) {
  const len = (title || '').length;
  if (len > 40) return 'is-xlong';
  if (len > 24) return 'is-long';
  return '';
}

/**
 * Hero immersif de l'accueil TV v2 — domine l'écran (~42-48% de la hauteur).
 * Le contenu (badge/titre/résumé/actions) est TOUJOURS rendu par React ; l'image
 * de fond (déjà préchargée/décodée par TvHome avant le swap de `song`) ne contient
 * ni texte ni bouton. Aucun hook ici : le remount (key=song.slug côté parent) sert
 * de transition de fondu — cf. .tv2-hero-content en CSS.
 */
export default function TvHero({ song, heroSrc, hasVideo, hasKaraoke, onWatch, onKaraoke }) {
  if (!song) return null;

  const badge = buildBadge(song.release_date);
  const summary = buildSummary(song);

  return (
    <section className="tv2-hero">
      <div className="tv2-hero-bg" style={{ backgroundImage: `url("${heroSrc}")` }} aria-hidden="true" />
      <div className="tv2-hero-scrim" aria-hidden="true" />
      <div className="tv2-hero-content">
        <span className="tv2-hero-badge">{badge}</span>
        <h1 className={`tv2-hero-title ${titleSizeClass(song.title)}`}>{song.title}</h1>
        {summary && <p className="tv2-hero-summary">{summary}</p>}
        <div className="tv2-hero-actions">
          {hasVideo && (
            <FocusableButton
              focusKey="HOME_HERO_WATCH"
              className="tv2-btn tv2-btn-watch"
              ariaLabel={`Assistir ao clipe ${song.title}`}
              onPress={onWatch}
            >
              <Play size={24} className="tv2-btn-icon-fill" /> Assistir ao clipe
            </FocusableButton>
          )}
          {hasKaraoke && (
            <FocusableButton
              focusKey="HOME_HERO_KARAOKE"
              className="tv2-btn tv2-btn-karaoke"
              ariaLabel={`Cantar ${song.title} no karaokê`}
              onPress={onKaraoke}
            >
              <Mic size={24} /> Cantar agora
            </FocusableButton>
          )}
        </div>
      </div>
    </section>
  );
}
