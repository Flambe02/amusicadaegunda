// ==========================================================================
// Métadonnées de DOMAINE pour l'UI TV « song-first » (difficulté, énergie, mode
// recommandé, thème, pitch). Le schéma Supabase actuel ne porte PAS ces champs :
// ils sont estimés à partir des données réelles (paroles, catégorie, LRC).
//
// DB-READY : si une colonne réelle apparaît un jour (`song.difficulty`,
// `song.energy`, `song.recommended_mode`), elle gagne AUTOMATIQUEMENT sur
// l'estimation — aucune autre modification nécessaire côté UI. C'est la seule
// couche autorisée à « inventer » ces valeurs ; les composants ne devinent jamais.
// ==========================================================================

import { hasLrcContent, hasDuetTags } from '@/lib/lrc';
import { MONTHS_PT } from '../tvMonths';

export const DIFFICULTY = { EASY: 'Fácil', MEDIUM: 'Médio', HARD: 'Difícil' };
export const ENERGY = { LOW: 'Baixa energia', MEDIUM: 'Média energia', HIGH: 'Alta energia' };
export const MODE = { SOLO: 'Solo', DUET: 'Dueto' };

// Labels courts d'énergie pour les métadonnées compactes (panneau/carte du
// catálogo) — « Calma / Média / Alta » plutôt que « … energia ».
const ENERGY_SHORT = {
  [ENERGY.LOW]: 'Calma', [ENERGY.MEDIUM]: 'Média', [ENERGY.HIGH]: 'Alta',
};
const ENERGY_KEY = {
  [ENERGY.LOW]: 'low', [ENERGY.MEDIUM]: 'medium', [ENERGY.HIGH]: 'high',
};

const CATEGORY_LABELS = {
  internacional: 'Internacional', midia: 'Mídia', energia: 'Energia', esporte: 'Esporte',
  cultura: 'Cultura', outros: 'Outros', saude: 'Saúde', policia: 'Polícia',
  politica: 'Política', seguranca: 'Segurança', tecnologia: 'Tecnologia',
  gastronomia: 'Gastronomia', economia: 'Economia',
};

// Catégories « à haute énergie » = celles où la parodie est typiquement rythmée/
// festive (esporte, cultura populaire…). Fallback = énergie moyenne (jamais nulle,
// pour ne pas afficher une TV « molle »).
const ENERGY_BY_CATEGORY = {
  esporte: ENERGY.HIGH, cultura: ENERGY.HIGH, gastronomia: ENERGY.HIGH, midia: ENERGY.HIGH,
  internacional: ENERGY.MEDIUM, tecnologia: ENERGY.MEDIUM, economia: ENERGY.MEDIUM,
  energia: ENERGY.MEDIUM, policia: ENERGY.MEDIUM, politica: ENERGY.MEDIUM,
  seguranca: ENERGY.MEDIUM, outros: ENERGY.MEDIUM, saude: ENERGY.LOW,
};

function plainText(html) {
  return (html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function wordCount(text) {
  const t = plainText(text);
  return t ? t.split(/\s+/).length : 0;
}

/** Thème lisible (= catégorie éditoriale). Une seule valeur, jamais combinée. */
export function getTheme(song) {
  if (!song?.category) return '';
  return CATEGORY_LABELS[song.category] || song.category;
}

/**
 * Difficulté de chant, estimée par la densité de paroles (plus il y a de mots à
 * mémoriser/enchaîner, plus c'est dur). Seuils calibrés sur la distribution réelle
 * du catalogue (quartiles : ~p25=165, p75=280 mots) → répartition crédible
 * Fácil/Médio/Difícil ≈ 25/50/25, pas « tout difícil ».
 */
export function getDifficulty(song) {
  if (song?.difficulty) return song.difficulty; // colonne réelle prioritaire (DB-ready)
  const n = wordCount(song?.lyrics);
  if (!n) return DIFFICULTY.MEDIUM;
  if (n < 165) return DIFFICULTY.EASY;
  if (n < 280) return DIFFICULTY.MEDIUM;
  return DIFFICULTY.HARD;
}

/** Énergie de la performance, déduite de la catégorie éditoriale. */
export function getEnergy(song) {
  if (song?.energy) return song.energy; // colonne réelle prioritaire (DB-ready)
  return ENERGY_BY_CATEGORY[song?.category] || ENERGY.MEDIUM;
}

/** Énergie sous forme exploitable : label long, label court (« Alta ») et clé. */
export function getEnergyMeta(song) {
  const label = getEnergy(song);
  return { label, short: ENERGY_SHORT[label] || 'Média', key: ENERGY_KEY[label] || 'medium' };
}

/**
 * Mode recommandé. Signal réel : un LRC portant des marqueurs de 2ᵉ voix (duo)
 * → « Dueto », sinon « Solo ». Une future colonne `recommended_mode` reste
 * prioritaire (DB-ready).
 */
export function getMode(song) {
  if (song?.recommended_mode) return song.recommended_mode; // DB-ready
  return hasDuetTags(song?.lrc_content) ? MODE.DUET : MODE.SOLO;
}

/** Chansons compatibles duo (LRC avec 2ᵉ voix, ou colonne explicite). */
export function isDuetReady(song) {
  return isSingable(song) && getMode(song) === MODE.DUET;
}

/** Une chanson est « chantable » (karaokê) si elle a un LRC + une source média. */
export function isSingable(song) {
  return hasLrcContent(song?.lrc_content) && Boolean(song?.youtube_url || song?.youtube_music_url);
}

/** Badge du hero : « NOVA · JULHO 2026 » (mois/année de sortie). */
export function getReleaseBadge(song) {
  const d = song?.release_date ? new Date(song.release_date) : null;
  if (!d || Number.isNaN(d.getTime())) return 'NOVA';
  return `NOVA · ${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Pitch en UNE phrase (affiché sous une carte au focus, ou en résumé du hero) :
 * `subtitle` si présent, sinon la 1ère phrase de la description, plafonné pour
 * rester lisible à distance. Jamais coupé au milieu d'un mot sans « … » final.
 */
export function getPitch(song, maxChars = 118) {
  const subtitle = plainText(song?.subtitle);
  let text = subtitle;
  if (!text) {
    const desc = plainText(song?.description);
    const m = desc.match(/^.*?[.!?](?:\s|$)/);
    text = m ? m[0].trim() : desc;
  }
  if (!text) return '';
  return text.length > maxChars ? `${text.slice(0, maxChars - 1).trimEnd()}…` : text;
}

/** Métadonnée COURTE d'une carte : « Esporte · Médio » (2 valeurs max). */
export function getCardMeta(song) {
  return [getTheme(song), getDifficulty(song)].filter(Boolean).join(' · ');
}

/** Métadonnée du HERO : « Esporte · Médio · Alta energia » (3 valeurs max). */
export function getHeroMeta(song) {
  return [getTheme(song), getDifficulty(song), getEnergy(song)].filter(Boolean).join(' · ');
}

/**
 * Difficulté sous forme exploitable par l'UI (label + niveau 1-3 + clé de couleur) —
 * évite de re-comparer `getDifficulty(song) === DIFFICULTY.X` dans chaque composant
 * qui a besoin du niveau (barres du badge carte) ET de la couleur (pastille).
 */
export function getDifficultyMeta(song) {
  const label = getDifficulty(song);
  if (label === DIFFICULTY.EASY) return { label, level: 1, key: 'easy' };
  if (label === DIFFICULTY.HARD) return { label, level: 3, key: 'hard' };
  return { label, level: 2, key: 'medium' };
}

/**
 * Raisons courtes « Por que cantar? » (panneau éditorial du hero, jamais focusable).
 * Le catalogue n'a pas de copy éditoriale dédiée par chanson : ces 4 raisons restent
 * VRAIES pour n'importe quelle parodie de la semaine (actualité, groupe, refrão,
 * thème compris de tous) ; seules 2 sont légèrement adaptées aux données réelles
 * (dificuldade, thème) pour éviter une affirmation fausse (ex. ne jamais dire
 * « fácil de lembrar » d'une chanson difícil).
 */
export function getWhySingReasons(song) {
  const { key } = getDifficultyMeta(song);
  const theme = getTheme(song);
  return [
    'É atual e divertida',
    'Perfeita para cantar em grupo',
    key === 'easy' ? 'Fácil de lembrar e contagiante' : 'Refrão marcante, fácil de cantar junto',
    theme ? `Todo mundo entende a piada sobre ${theme.toLowerCase()}` : 'Tema que todo mundo entende',
  ];
}

// ── Fiche chanson TV (détail) ────────────────────────────────────────────────

// Adjectif de type par catégorie → « PARÓDIA ESPORTIVA », etc. (cf. référence).
const TYPE_ADJECTIVE = {
  esporte: 'esportiva', politica: 'política', economia: 'econômica', cultura: 'cultural',
  internacional: 'internacional', tecnologia: 'tecnológica', midia: 'da mídia',
  gastronomia: 'gastronômica', saude: 'sobre saúde', seguranca: 'sobre segurança',
  policia: 'policial', energia: 'sobre energia', outros: 'musical',
};
// Sujet court par catégorie pour le sous-texte « Por que cantar? » (« Futebol, … »).
const THEME_SUBJECT = {
  esporte: 'Futebol', politica: 'Política', economia: 'Economia', cultura: 'Cultura',
  internacional: 'Mundo', tecnologia: 'Tecnologia', midia: 'Mídia', gastronomia: 'Comida',
  saude: 'Saúde', seguranca: 'Segurança', policia: 'Polícia', energia: 'Energia', outros: 'Humor',
};

/** Type éditorial affiché au-dessus du titre (« Paródia esportiva »). */
export function getSongType(song) {
  if (song?.song_type) return song.song_type; // DB-ready
  const adj = TYPE_ADJECTIVE[song?.category];
  return adj ? `Paródia ${adj}` : 'Paródia musical';
}

/** Langue lisible pour la fiche (« Português BR »). */
export function getIdiomaLabel(song) {
  return song?.language || 'Português BR';
}

/** Niveau de portugais (préparation mode apprentissage) — dérivé de la difficulté. */
export function getPortugueseLevel(song) {
  if (song?.portuguese_level) return song.portuguese_level; // DB-ready
  const { key } = getDifficultyMeta(song);
  return key === 'easy' ? 'easy' : key === 'hard' ? 'native' : 'intermediate';
}

function splitSentences(text) {
  return plainText(text).split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

function clampWords(text, maxWords) {
  const words = (text || '').split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(' ').replace(/[.,;:]$/, '')}…`;
}

// Mots-clés qui signalent la phrase « méta » décrivant ce que FAIT la chanson
// (le CONCEITO), par opposition au CONTEXTO (l'événement réel).
const CONCEPT_HINTS = /\b(m[úu]sica|par[óo]dia|marchinha|can[çc][ãa]o|refr[ãa]o|transforma|brinca|s[áa]tira|zoa|ironiza)\b/i;

/**
 * Sépare CONCEITO (l'idée humoristique — ce que fait la chanson) et CONTEXTO
 * (l'actualité / la référence culturelle). Le catalogue n'a pas de colonnes
 * dédiées : on dérive depuis `description` (le CONTEXTO = les 1res phrases de
 * mise en situation ; le CONCEITO = la 1re phrase « méta » sur la chanson). Le
 * pitch (subtitle) n'est jamais réutilisé tel quel ici (pas de doublon). DB-ready
 * via `song.concept` / `song.context`.
 */
export function getConceptContext(song) {
  const sentences = splitSentences(song?.description);
  const theme = getTheme(song);
  let concept = plainText(song?.concept);
  let context = plainText(song?.context);

  if (!context) {
    context = sentences.slice(0, 2).join(' ') || plainText(song?.subtitle);
  }
  if (!concept) {
    const metaIdx = sentences.findIndex((s) => CONCEPT_HINTS.test(s));
    if (metaIdx >= 0) concept = sentences[metaIdx];
    else concept = theme
      ? `Uma paródia que brinca com ${theme.toLowerCase()} no estilo A Música da Segunda.`
      : 'Uma paródia bem-humorada no estilo A Música da Segunda.';
  }
  return { concept: clampWords(concept, 45), context: clampWords(context, 45) };
}

/** Jusqu'à `n` lignes chantées des paroles (prévia). */
export function getLyricPreviewLines(song, n = 4) {
  return (song?.lyrics || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, n);
}

/** La chanson a-t-elle plus de paroles que la prévia (→ « Ver letra completa ») ? */
export function hasFullLyrics(song, previewCount = 4) {
  const total = (song?.lyrics || '').replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean).length;
  return total > previewCount;
}

/**
 * Cartes « Por que cantar? » de la FICHE (titre + sous-texte), calquées sur la
 * référence. Génériquement vraies pour une parodie de la semaine ; seul le
 * sous-texte de la 4ᵉ est adapté au thème (« Futebol, … »).
 */
export function getWhySingCards(song) {
  const subject = THEME_SUBJECT[song?.category] || getTheme(song) || 'Humor';
  return [
    { title: 'É atual e divertida', subtitle: 'Conectada com o que todo mundo está vivendo.' },
    { title: 'Perfeita para cantar em grupo', subtitle: 'Refrão fácil e cheia de energia.' },
    { title: 'Refrão marcante', subtitle: 'Todo mundo canta junto do começo ao fim.' },
    { title: 'Tema que todo mundo entende', subtitle: `${subject}, orgulho e humor brasileiro.` },
  ];
}
