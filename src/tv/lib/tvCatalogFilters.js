// ==========================================================================
// Logique de filtrage + recherche du catálogo TV. Opère sur les VIEW MODELS
// (cf. tvSongRepository.toTvSong) — jamais sur les colonnes brutes. Séparé des
// composants (le cahier des charges impose « données / filtres / focus / file /
// présentation » découplés).
//
// Modèle : un filtre RAPIDE unique (barre, radio, TODAS = aucun) ∧ un filtre
// AVANCÉ multi-dimensions (overlay) ∧ une recherche texte. Les trois se
// combinent en ET ; TODAS + avancé vide + recherche vide = tout le catálogo.
// ==========================================================================

const DAYS = 24 * 60 * 60 * 1000;
function isRecent(vm, days = 120) {
  if (!vm.releaseDate) return false;
  const d = new Date(vm.releaseDate).getTime();
  return Number.isFinite(d) && Date.now() - d <= days * DAYS;
}

// ── Filtres rapides de la barre (max 6 + TODAS + Mais filtros + Buscar) ──────
export const QUICK_FILTERS = [
  { id: 'todas', label: 'Todas', predicate: () => true },
  { id: 'facil', label: 'Fácil', predicate: (vm) => vm.difficulty === 'easy' },
  { id: 'familia', label: 'Família', predicate: (vm) => vm.recommendedModes.includes('family') },
  { id: 'dueto', label: 'Dueto', predicate: (vm) => vm.recommendedModes.includes('duet') },
  { id: 'alta', label: 'Alta energia', predicate: (vm) => vm.energy === 'high' },
  { id: 'atualidade', label: 'Atualidade', predicate: (vm) => isRecent(vm) },
  { id: 'aprender', label: 'Aprenda português', predicate: (vm) => vm.isPortugueseEasy },
];

export function quickPredicate(quickId) {
  const f = QUICK_FILTERS.find((q) => q.id === quickId);
  return f ? f.predicate : () => true;
}

// ── Dimensions du filtre avancé (overlay) ───────────────────────────────────
// Chaque option porte son propre prédicat ; dans une dimension les options sont
// en OU, entre dimensions en ET. Les options de « Tema » sont générées
// dynamiquement à partir des catégories réellement présentes (plus honnête que
// la liste idéale figée, qui contiendrait des thèmes absents du catalogue).
export const ADVANCED_DIMENSIONS = [
  {
    id: 'difficulty', label: 'Dificuldade', options: [
      { id: 'easy', label: 'Fácil', predicate: (vm) => vm.difficulty === 'easy' },
      { id: 'medium', label: 'Médio', predicate: (vm) => vm.difficulty === 'medium' },
      { id: 'hard', label: 'Difícil', predicate: (vm) => vm.difficulty === 'hard' },
    ],
  },
  {
    id: 'mode', label: 'Modo', options: [
      { id: 'solo', label: 'Solo', predicate: (vm) => vm.recommendedModes.includes('solo') },
      { id: 'duet', label: 'Dueto', predicate: (vm) => vm.recommendedModes.includes('duet') },
      { id: 'family', label: 'Família', predicate: (vm) => vm.recommendedModes.includes('family') },
      { id: 'festa', label: 'Festa', predicate: (vm) => vm.recommendedModes.includes('festa') },
    ],
  },
  {
    id: 'energy', label: 'Energia', options: [
      { id: 'low', label: 'Calma', predicate: (vm) => vm.energy === 'low' },
      { id: 'medium', label: 'Média', predicate: (vm) => vm.energy === 'medium' },
      { id: 'high', label: 'Alta', predicate: (vm) => vm.energy === 'high' },
    ],
  },
  {
    id: 'discovery', label: 'Descoberta', options: [
      { id: 'novidades', label: 'Novidades', predicate: (vm) => isRecent(vm, 45) },
      { id: 'atualidade', label: 'Atualidade', predicate: (vm) => isRecent(vm, 120) },
    ],
  },
  {
    id: 'learning', label: 'Aprendizado', options: [
      { id: 'facil', label: 'Português fácil', predicate: (vm) => vm.isPortugueseEasy },
      { id: 'traducao', label: 'Com tradução', predicate: (vm) => vm.hasTranslation },
    ],
  },
];

/** Dimension « Tema » construite à partir des catégories présentes dans le VM. */
export function buildThemeDimension(vms) {
  const seen = new Map();
  vms.forEach((vm) => { if (vm.category && vm.theme && !seen.has(vm.category)) seen.set(vm.category, vm.theme); });
  const options = [...seen.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([cat, label]) => ({ id: cat, label, predicate: (vm) => vm.category === cat }));
  return { id: 'theme', label: 'Tema', options };
}

/** État avancé vide (aucune sélection). */
export function emptyAdvanced() {
  return { difficulty: [], mode: [], energy: [], theme: [], discovery: [], learning: [] };
}

export function advancedIsEmpty(state) {
  return Object.values(state).every((arr) => !arr.length);
}

export function countAdvancedSelections(state) {
  return Object.values(state).reduce((n, arr) => n + arr.length, 0);
}

// Prédicat composite de l'état avancé (OU dans une dimension, ET entre dimensions).
export function advancedPredicate(state, themeDimension) {
  const dims = [...ADVANCED_DIMENSIONS, themeDimension].filter(Boolean);
  const active = dims
    .map((dim) => {
      const selected = state[dim.id] || [];
      if (!selected.length) return null;
      const preds = dim.options.filter((o) => selected.includes(o.id)).map((o) => o.predicate);
      return (vm) => preds.some((p) => p(vm));
    })
    .filter(Boolean);
  return (vm) => active.every((fn) => fn(vm));
}

// ── Recherche texte ─────────────────────────────────────────────────────────
const MONTHS_SEARCH = [
  'janeiro', 'fevereiro', 'março', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// Marques diacritiques combinantes U+0300–U+036F. Construite par code points pour
// ne dépendre d'AUCUN caractère combinant littéral dans le fichier source (fragile
// à l'édition/l'encodage).
const COMBINING_MARKS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g');
function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(COMBINING_MARKS, '')
    .trim();
}

/** Texte indexable d'une chanson (titre, thème, contexte, paroles, mês/ano…). */
function searchHaystack(vm) {
  const raw = vm.raw || {};
  const d = vm.releaseDate ? new Date(vm.releaseDate) : null;
  const monthYear = d && Number.isFinite(d.getTime())
    ? `${MONTHS_SEARCH[d.getMonth()]} ${d.getFullYear()}`
    : '';
  return normalize([
    vm.title, vm.theme, vm.category, vm.concept, vm.shortPitch,
    raw.lyrics, raw.hashtags, raw.description, monthYear,
  ].filter(Boolean).join(' • '));
}

export function matchesSearch(vm, query) {
  const q = normalize(query);
  if (!q) return true;
  const hay = searchHaystack(vm);
  // Tous les mots de la requête doivent être présents (recherche ET, tolérante).
  return q.split(/\s+/).every((word) => hay.includes(word));
}

// ── Application combinée ─────────────────────────────────────────────────────
export function filterCatalog(vms, { quickId = 'todas', advanced, themeDimension, query = '' } = {}) {
  const qp = quickPredicate(quickId);
  const ap = advanced && !advancedIsEmpty(advanced) ? advancedPredicate(advanced, themeDimension) : () => true;
  return vms.filter((vm) => qp(vm) && ap(vm) && matchesSearch(vm, query));
}
