// ==========================================================================
// Repository / couche data TV — transforme une chanson Supabase brute en un
// « view model » explicite consommé par les composants du catálogo. C'est ici,
// et NULLE PART dans les composants visuels, qu'on résout les noms de colonnes
// historiquement trompeurs :
//   youtube_music_url = la VIDÉO (Short)     → videoTeaserUrl
//   youtube_url       = la MUSIQUE (karaokê) → karaokeMediaUrl
// (cf. mémoire projet — colonnes `songs`). Les composants ne voient plus que des
// propriétés métier claires.
//
// difficulté / énergie / modes recommandés / português fácil sont DÉRIVÉS
// (cf. songMeta.js) mais DB-READY : une vraie colonne les remplace dès qu'elle
// existe, sans toucher aux composants.
// ==========================================================================

import {
  getTheme, getDifficultyMeta, getEnergyMeta, getMode, isSingable, isDuetReady,
  getPitch, getSongType, getConceptContext, getLyricPreviewLines, hasFullLyrics,
  getIdiomaLabel, getPortugueseLevel, DIFFICULTY, MODE,
} from './songMeta';

const DEFAULT_TEASER_SECONDS = 30;

/** 1re ligne « chantée » des paroles, pour la prévia (jamais toute la strophe). */
function getLyricPreview(song) {
  const raw = (song?.lyrics || '').replace(/\r/g, '');
  const firstLine = raw.split('\n').map((l) => l.trim()).find(Boolean);
  if (!firstLine) return '';
  return firstLine.length > 60 ? `${firstLine.slice(0, 59).trimEnd()}…` : firstLine;
}

/**
 * Modes de performance recommandés — dérivés (DB-ready via `song.recommended_modes`).
 * Solo toujours possible ; Dueto si LRC 2 voix ; Família si pas trop difficile
 * (refrão accessible en groupe) ; Festa si haute énergie.
 */
function deriveModes(song) {
  if (Array.isArray(song?.recommended_modes) && song.recommended_modes.length) {
    return song.recommended_modes;
  }
  // Solo toujours ; Dueto si LRC 2 voix ; Família = chanson entraînante à chanter
  // en groupe (énergie ≥ moyenne, la difficulté ne dépend PAS de l'adéquation
  // familiale) ; Festa = haute énergie. Ordre : family AVANT festa (« Ideal para »
  // affiche les 2 premiers → « Solo / Família » plutôt que « Solo / Festa »).
  const modes = ['solo'];
  if (isDuetReady(song)) modes.push('duet');
  const energy = getEnergyMeta(song).key;
  if (energy !== 'low') modes.push('family');
  if (energy === 'high') modes.push('festa');
  return modes;
}

/** Type éditorial court affiché en sous-titre (« Paródia esportiva »). */
function deriveType(song) {
  const theme = getTheme(song);
  return theme ? `Paródia · ${theme}` : 'Paródia musical';
}

/**
 * Construit le view model TV d'une chanson. `raw` reste attaché pour les besoins
 * qui exigent l'objet Supabase d'origine (résolution de l'affiche via le manifeste,
 * navigation vers la fiche/karaokê qui réutilisent le pipeline existant de TvApp).
 */
export function toTvSong(song) {
  const diff = getDifficultyMeta(song);   // { label, level, key }
  const energy = getEnergyMeta(song);      // { label, short, key }
  const { concept, context } = getConceptContext(song);
  return {
    id: song.id,
    slug: song.slug,
    title: (song.title || '').trim(),
    theme: getTheme(song),
    type: deriveType(song),           // « Paródia · Esporte » (métadonnée compacte catálogo)
    songType: getSongType(song),      // « Paródia esportiva » (label de type de la fiche)
    shortPitch: getPitch(song, 150),
    concept,                          // idée humoristique (ce que fait la chanson)
    context,                          // actualité / référence culturelle
    difficulty: diff.key,             // 'easy' | 'medium' | 'hard'
    difficultyLabel: diff.label,      // 'Fácil' | 'Médio' | 'Difícil'
    difficultyLevel: diff.level,      // 1 | 2 | 3
    energy: energy.key,               // 'low' | 'medium' | 'high'
    energyLabel: energy.short,        // 'Calma' | 'Média' | 'Alta'
    recommendedModes: deriveModes(song),
    recommendedMode: getMode(song),   // 'Solo' | 'Dueto' (mode principal, badge carte)
    language: getIdiomaLabel(song),   // « Português BR »
    lyricPreview: getLyricPreview(song),        // 1 ligne (panneau catálogo)
    lyricPreviewLines: getLyricPreviewLines(song, 4), // jusqu'à 4 lignes (fiche)
    hasFullLyrics: hasFullLyrics(song, 4),
    portugueseLevel: getPortugueseLevel(song),  // 'easy' | 'intermediate' | 'native'
    // Colonnes trompeuses résolues ICI (jamais dans les composants) :
    videoTeaserUrl: song.youtube_music_url || song.youtube_url || null,
    videoTeaserDuration: song.video_teaser_duration ?? DEFAULT_TEASER_SECONDS,
    karaokeMediaUrl: song.youtube_url || song.youtube_music_url || null,
    isSingable: isSingable(song),
    isPortugueseEasy: song.is_portuguese_easy ?? (diff.key === 'easy'), // DB-ready
    hasTranslation: song.has_translation ?? false,                      // DB-ready
    releaseDate: song.release_date || song.datePublished || null,
    category: song.category || null,
    raw: song,
  };
}

export function toTvSongs(songs) {
  return (songs || []).map(toTvSong);
}

// Ré-exports pratiques pour que les prédicats de filtre restent alignés sur les
// mêmes constantes que le VM.
export { DIFFICULTY, MODE };
