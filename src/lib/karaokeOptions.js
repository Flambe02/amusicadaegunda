/**
 * Source de vérité unique pour les options du karaoké — partagée entre
 * KaraokePlayer (mobile/desktop/TV) et le panneau de réglages de l'accueil TV
 * (TvSettingsPanel). Un changement fait depuis l'un est relu par l'autre au
 * prochain accès à localStorage (clé inchangée depuis la 1ère version : ne
 * JAMAIS la modifier sous peine de perdre les préférences déjà enregistrées).
 */

export const KARAOKE_OPTIONS_KEY = 'karaoke-opts-v1';

export const DEFAULT_KARAOKE_OPTIONS = {
  fontScale: 1,
  showBall: false,
  rate: 1,
  dueto: false,
  energy: false,
  translate: 'off',
  // Volume da música (0..100) — aplicado via YouTube IFrame `setVolume`. É o único
  // áudio disponível (mistura completa), por isso NÃO existe controlo de « Guia ».
  musicVolume: 100,
  // Compensação de exibição das letras, em ms. Apenas no render (nunca modifica a
  // sincronização oficial guardada). effT = tempoDaMídia + lyricsOffsetMs.
  lyricsOffsetMs: 0,
};

// Ajuste das letras (bottom-sheet mixer) — limites e passo.
export const LYRICS_OFFSET_MIN_MS = -1000;
export const LYRICS_OFFSET_MAX_MS = 1000;
export const LYRICS_OFFSET_STEP_MS = 50;

export const FONT_SCALES = [
  { label: 'P', value: 0.85 },
  { label: 'M', value: 1 },
  { label: 'G', value: 1.2 },
  { label: 'XG', value: 1.45 },
];

export const PLAYBACK_RATES = [
  { label: '1×', value: 1 },
  { label: '0.75×', value: 0.75 },
  { label: '0.5×', value: 0.5 },
];

export const TRANSLATION_LANGS = [
  { value: 'off', label: 'Off' },
  { value: 'fr', label: 'FR' },
  { value: 'en', label: 'EN' },
];

export function loadKaraokeOptions() {
  try {
    return { ...DEFAULT_KARAOKE_OPTIONS, ...JSON.parse(localStorage.getItem(KARAOKE_OPTIONS_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_KARAOKE_OPTIONS };
  }
}

export function saveKaraokeOptions(opts) {
  try { localStorage.setItem(KARAOKE_OPTIONS_KEY, JSON.stringify(opts)); } catch { /* ignore */ }
}
