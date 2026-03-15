/**
 * hashtagGenerator.js
 *
 * Generates structured data from a song title + description:
 *
 *   category  {string}   — single primary category (for Supabase column + navigation)
 *   hashtags  {string[]} — SEO/social tags: base + entities + themes (no category duplicate)
 *
 * No external dependencies — pure rule-based, deterministic.
 */

// ---------------------------------------------------------------------------
// 1. BASE TAGS — always present in hashtags
// ---------------------------------------------------------------------------
const BASE_TAGS = ['parodia', 'satiria', 'musicadasegunda', 'noticias'];

// ---------------------------------------------------------------------------
// 2. CATEGORY TAXONOMY
// Ordered from MOST SPECIFIC to LEAST SPECIFIC.
// detectCategory() iterates in this order → first match wins.
// This prevents generic categories (politica, economia) from overriding
// specific ones (gastronomia, energia, esporte…).
// ---------------------------------------------------------------------------
const CATEGORIES = [
  {
    // Only unambiguous culinary/gastronomy terms — excludes generic PT words
    key: 'gastronomia',
    keywords: [
      'gastronomia', 'culinaria', 'croissant', 'masterchef', 'confeitaria',
      'patisserie', 'boulangerie', 'jacquin', 'paul cabannes', 'eric jacquin',
      'ratatouille', 'michelin', 'haute cuisine',
    ],
  },
  {
    key: 'energia',
    keywords: [
      'apagao', 'enel', 'aneel', 'energia eletrica', 'distribuidora de energia',
      'falta de luz', 'blecaute', 'hidreletrica', 'usina',
      'conta de luz', 'tarifa eletrica', 'renovavel', 'solar', 'eolica',
    ],
  },
  {
    // Named teams/players/events only — removed "sao paulo" (city/club ambiguity)
    key: 'esporte',
    keywords: [
      'futebol', 'copa do mundo', 'olimpiadas', 'selecao brasileira',
      'cbf', 'fifa', 'neymar', 'vini jr', 'vinicius', 'flamengo',
      'corinthians', 'palmeiras', 'ronaldo', 'sorteio da copa',
    ],
  },
  {
    // Specific cultural events — removed generic "show", "artista", "cantor", "ator"
    key: 'cultura',
    keywords: [
      'carnaval', 'festa junina', 'festas juninas', 'sao joao', 'quadrilha',
      'nordeste', 'forro', 'arraial', 'cultura brasileira', 'sapucai',
    ],
  },
  {
    key: 'midia',
    keywords: [
      'jornal nacional', 'globo', 'rede globo', 'imprensa', 'jornalismo',
      'reporter', 'televisao', 'midia', 'ancora', 'apresentador',
      'cobertura', 'manchete', 'noticiario', 'liberdade de imprensa',
      'ameaca a jornalista', 'cnn brasil', 'bonner',
    ],
  },
  {
    // Removed standalone "saude" (too generic) — kept specific medical terms
    key: 'saude',
    keywords: [
      'sus', 'hospital', 'vacina', 'vacinacao', 'pandemia',
      'medicamento', 'anvisa', 'dengue', 'epidemia',
      'plano de saude', 'emergencia sanitaria', 'uti',
    ],
  },
  {
    key: 'tecnologia',
    keywords: [
      'inteligencia artificial', 'chatgpt', 'redes sociais',
      'whatsapp', 'tiktok', 'instagram', 'meta', 'startup',
      'big tech', 'privacidade', 'dados pessoais', 'lgpd',
    ],
  },
  {
    key: 'seguranca',
    keywords: [
      'seguranca publica', 'violencia', 'crime organizado', 'trafico de drogas',
      'milicia', 'mst', 'desmatamento', 'garimpo', 'yanomami', 'pcc',
      'faccao criminosa', 'bando armado',
    ],
  },
  {
    // Replaced bare "operacao"/"investigacao"/"denuncia" with compound phrases
    key: 'policia',
    keywords: [
      'policia federal', 'operacao policial', 'mandado de prisao',
      'prisao preventiva', 'preso em flagrante', 'inquerito policial',
      'corrupcao', 'propina', 'lavagem de dinheiro', 'peculato',
      'improbidade', 'delegado', 'indiciado', 'reu preso',
    ],
  },
  {
    key: 'internacional',
    keywords: [
      'estados unidos', 'eua', 'trump', 'casa branca', 'washington',
      'europa', 'uniao europeia', 'china', 'argentina', 'venezuela',
      'russia', 'mercosul', 'acordo comercial', 'tarifas', 'sancao',
      'diplomacia', 'onu', 'fmi', 'banco mundial', 'otan', 'guerra',
    ],
  },
  {
    // Replaced bare "banco" and removed "compliance" (conflicts with "Operação Compliance")
    key: 'economia',
    keywords: [
      'banco central', 'banco master', 'inflacao', 'dolar', 'mercado financeiro',
      'investimento', 'fraude financeira', 'tributario',
      'pib', 'recessao', 'petrobras', 'privatizacao',
      'credito', 'deficit', 'orcamento', 'tesouro', 'selic',
      'receita federal', 'vale refeicao',
    ],
  },
  {
    key: 'politica',
    keywords: [
      'presidente', 'senado', 'senador', 'camara', 'deputado',
      'stf', 'supremo tribunal federal', 'congresso', 'ministerio',
      'governo', 'governador', 'eleicao', 'partido', 'democracia',
      'constituicao', 'mandato', 'reeleicao', 'impeachment',
      'golpe', 'pgr', 'procurador', 'legislativo',
    ],
  },
];

// ---------------------------------------------------------------------------
// 3. KNOWN ENTITIES — named people / organizations → tag slug
// ---------------------------------------------------------------------------
const KNOWN_ENTITIES = {
  // Politics
  'lula': 'lula', 'luiz inacio': 'lula',
  'bolsonaro': 'bolsonaro', 'jair bolsonaro': 'bolsonaro',
  'tarcisio': 'tarcisiofreitas',
  'flavio dino': 'flaviodino',
  'alexandre de moraes': 'alexandredemoraes', 'moraes': 'alexandredemoraes',
  'gilmar mendes': 'gilmarmendes',
  'renan calheiros': 'renancalheiros',
  'arthur lira': 'arthurlira',
  'rodrigo pacheco': 'rodrigopacheco',
  'ciro gomes': 'cirogomes',
  // Economy / Business
  'vorcaro': 'danielvorcaro', 'daniel vorcaro': 'danielvorcaro',
  'campos neto': 'camposneto', 'roberto campos': 'camposneto',
  'paulo guedes': 'pauloguedes',
  'haddad': 'haddad', 'fernando haddad': 'haddad',
  'eike batista': 'eikebatista',
  // Media
  'bonner': 'williamBonner', 'william bonner': 'williamBonner',
  'fatima bernardes': 'fatimaBernardes',
  'renata vasconcellos': 'renatavasco',
  // Institutions
  'stf': 'stf',
  'pf': 'policiaFederal', 'policia federal': 'policiaFederal',
  'banco master': 'bancomaster', 'master': 'bancomaster',
  'petrobras': 'petrobras', 'eletrobras': 'eletrobras', 'enel': 'enel',
  'mercosul': 'mercosul', 'stj': 'stj', 'tcu': 'tcu',
  // International
  'trump': 'trump', 'donald trump': 'trump',
  'biden': 'biden', 'zelensky': 'zelensky', 'putin': 'putin',
  'xi jinping': 'xijinping',
  'milei': 'milei', 'javier milei': 'milei',
  // Investigations
  'lava jato': 'lavajato',
  'compliance zero': 'compliancezero',
  // Sports
  'ronaldo': 'ronaldo', 'ronaldo fenomeno': 'ronaldo',
  'sapucai': 'sapucai', 'carnaval': 'carnaval',
  // Gastronomy / France
  'paul cabannes': 'paulcabannes', 'cabannes': 'paulcabannes',
  'jacquin': 'ericjacquin', 'eric jacquin': 'ericjacquin',
  'croissant': 'croissant', 'masterchef': 'masterchef',
  'franca': 'franca', 'france': 'franca',
  // Cultura / Nordeste
  'festa junina': 'festajunina', 'festas juninas': 'festajunina',
  'sao joao': 'saojoa', 'nordeste': 'nordeste', 'forro': 'forro',
};

// ---------------------------------------------------------------------------
// 4. THEMES — standalone topic tags added to hashtags
// ---------------------------------------------------------------------------
const THEMES = {
  fraude:       ['fraude', 'esquema', 'golpe financeiro', 'manipulacao'],
  corrupcao:    ['corrupcao', 'propina', 'desvio', 'improbidade', 'peculato'],
  operacao_pf:  ['operacao compliance', 'operacao lava', 'mandado de prisao', 'prisao preventiva'],
  escandalo:    ['escandalo', 'polemica', 'controversia', 'denuncia'],
  investigacao: ['investigacao', 'inquerito', 'apuracao', 'delacao', 'depoimento'],
  julgamento:   ['julgamento', 'julgado', 'condenado', 'absolvido', 'sentenca'],
  fake_news:    ['fake news', 'desinformacao', 'mentira'],
  reforma:      ['reforma', 'aprovacao', 'votacao', 'plenario'],
  greve:        ['greve', 'paralisacao', 'protesto', 'manifestacao'],
  acordo:       ['acordo', 'negociacao', 'tratado', 'protocolo'],
};

// ---------------------------------------------------------------------------
// 5. NORMALISATION
// ---------------------------------------------------------------------------
function normalize(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function has(normalizedText, phrase) {
  return normalizedText.includes(normalize(phrase));
}

// ---------------------------------------------------------------------------
// 6. CATEGORY DETECTION
// Returns the first matching category key in priority order, or 'outros'.
// ---------------------------------------------------------------------------
export function detectCategory(description = '', title = '') {
  const raw = normalize(`${title} ${description}`);
  for (const { key, keywords } of CATEGORIES) {
    if (keywords.some(kw => has(raw, kw))) return key;
  }
  return 'outros';
}

// ---------------------------------------------------------------------------
// 7. HASHTAG GENERATION (entities + themes + base — no category duplication)
// ---------------------------------------------------------------------------
export function generateHashtags(description = '', title = '') {
  const raw = normalize(`${title} ${description}`);
  const tags = new Set(BASE_TAGS);

  for (const [trigger, tag] of Object.entries(KNOWN_ENTITIES)) {
    if (has(raw, trigger)) tags.add(tag);
  }
  for (const [theme, keywords] of Object.entries(THEMES)) {
    if (keywords.some(kw => has(raw, kw))) tags.add(theme);
  }

  return [...tags].slice(0, 15);
}

// ---------------------------------------------------------------------------
// 8. CONVENIENCE WRAPPERS
// ---------------------------------------------------------------------------

/**
 * generateSongData(song)
 * Returns { category, hashtags } ready to save in Supabase.
 *
 * @param {{ title?: string, description?: string }} song
 * @returns {{ category: string, hashtags: string[] }}
 */
export function generateSongData(song) {
  const title = song?.title || '';
  const description = song?.description || '';
  return {
    category: detectCategory(description, title),
    hashtags: generateHashtags(description, title),
  };
}

/** Legacy alias — returns hashtags array only */
export function generateHashtagsForSong(song) {
  return generateHashtags(song?.description || '', song?.title || '');
}
