/**
 * Tirages de la scène Catálogo (addendum catálogo §B) — fonctions pures, testables.
 */

import { extractYouTubeId } from '@/lib/utils';

const CLIP_BASE = '/videos/caipivara';

/**
 * Bords des clips fondus dans le fond de la scène (#050505, app-black) : un voile
 * radial POSÉ SUR les vidéos, et non un `mask-image` autour d'elles. Sur iPhone, une
 * <video> dans un calque masqué perdait parfois sa mise à l'échelle après un fondu
 * (animation, danse) et s'affichait à sa taille native (432×768), en gros plan.
 */
export const EDGE_VIGNETTE = 'radial-gradient(ellipse closest-side at 50% 50%, transparent 62%, #050505 100%)';

/** Boucle de repos, jouée en continu. */
export const IDLE_CLIP = {
  key: 'idle',
  webm: `${CLIP_BASE}/caipivara-idle.webm`,
  mp4: `${CLIP_BASE}/caipivara-idle.mp4`,
  poster: `${CLIP_BASE}/caipivara-idle-poster.webp`,
};

/** Boucle de danse, tant que la musique joue avec le son. */
export const DANCE_CLIP = {
  key: 'dance',
  webm: `${CLIP_BASE}/caipivara-dance.webm`,
  mp4: `${CLIP_BASE}/caipivara-dance.mp4`,
  poster: `${CLIP_BASE}/caipivara-dance-poster.webp`,
};

/** Les trois animations tirées au tap, avec la ligne affichée pendant qu'elles jouent. */
export const ANIMATIONS = [
  {
    key: 'hat',
    line: 'Deixa eu procurar no chapéu…',
    webm: `${CLIP_BASE}/caipivara-hat.webm`,
    mp4: `${CLIP_BASE}/caipivara-hat.mp4`,
    poster: `${CLIP_BASE}/caipivara-hat-poster.webp`,
  },
  {
    key: 'flip',
    line: 'Segura essa!',
    longFade: true, // ne finit pas dans la pose de repos
    webm: `${CLIP_BASE}/caipivara-flip.webm`,
    mp4: `${CLIP_BASE}/caipivara-flip.mp4`,
    poster: `${CLIP_BASE}/caipivara-flip-poster.webp`,
  },
  {
    key: 'samba',
    line: 'Rodando a roda…',
    longFade: true,
    webm: `${CLIP_BASE}/caipivara-samba.webm`,
    mp4: `${CLIP_BASE}/caipivara-samba.mp4`,
    poster: `${CLIP_BASE}/caipivara-samba-poster.webp`,
  },
];

const pick = (items, random) => items[Math.floor(random() * items.length) % items.length];

/** Une animation au hasard, jamais la même que la précédente. */
export function pickAnimation(lastKey, random = Math.random) {
  const choices = ANIMATIONS.filter((animation) => animation.key !== lastKey);
  return pick(choices.length ? choices : ANIMATIONS, random);
}

const songKey = (song) => song?.id ?? song?.slug ?? song?.title;

/**
 * La musique vient de la même source que la Roda : `youtube_url` (la chanson entière,
 * pas le Short). null si la chanson n'a pas de lien lisible.
 */
export function getSongAudioId(song) {
  return extractYouTubeId(song?.youtube_url) || null;
}

/**
 * Une chanson publiée ET jouable au hasard (jamais une chanson muette), jamais celle
 * qui vient d'être jouée (sauf s'il n'y en a qu'une). Aucun nombre en dur : le tirage
 * porte sur la liste reçue.
 */
export function pickSong(songs, lastSong, random = Math.random) {
  const published = (songs || []).filter(
    (song) => song && (!song.status || song.status === 'published') && getSongAudioId(song)
  );
  if (!published.length) return null;
  const lastKey = songKey(lastSong);
  const choices = published.filter((song) => songKey(song) !== lastKey);
  return pick(choices.length ? choices : published, random);
}
