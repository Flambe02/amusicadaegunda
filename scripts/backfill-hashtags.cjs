/**
 * backfill-hashtags.cjs
 *
 * Populates both `hashtags` and `category` columns in Supabase `songs`.
 *
 * Usage:
 *   node scripts/backfill-hashtags.cjs             — empty rows only
 *   node scripts/backfill-hashtags.cjs --dry-run   — preview, no writes
 *   node scripts/backfill-hashtags.cjs --all       — regenerate every row
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const DRY_RUN      = process.argv.includes('--dry-run');
const OVERWRITE_ALL = process.argv.includes('--all');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY
  || process.env.SUPABASE_SERVICE_KEY
  || process.env.VITE_SUPABASE_ANON_KEY
  || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌  Missing SUPABASE_URL / SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// ---------------------------------------------------------------------------
// Taxonomy — mirrors src/lib/hashtagGenerator.js (pure CJS)
// ---------------------------------------------------------------------------
const BASE_TAGS = ['parodia', 'satiria', 'musicadasegunda', 'noticias'];

const CATEGORIES = [
  { key: 'gastronomia', keywords: [
    'gastronomia', 'culinaria', 'croissant', 'masterchef', 'confeitaria',
    'patisserie', 'boulangerie', 'jacquin', 'paul cabannes', 'eric jacquin',
    'ratatouille', 'michelin', 'haute cuisine',
  ]},
  { key: 'energia', keywords: [
    'apagao', 'enel', 'aneel', 'energia eletrica', 'distribuidora de energia',
    'falta de luz', 'blecaute', 'hidreletrica', 'usina',
    'conta de luz', 'tarifa eletrica', 'renovavel', 'solar', 'eolica',
  ]},
  { key: 'esporte', keywords: [
    'futebol', 'copa do mundo', 'olimpiadas', 'selecao brasileira',
    'cbf', 'fifa', 'neymar', 'vini jr', 'vinicius', 'flamengo',
    'corinthians', 'palmeiras', 'ronaldo', 'sorteio da copa',
  ]},
  { key: 'cultura', keywords: [
    'carnaval', 'festa junina', 'festas juninas', 'sao joao', 'quadrilha',
    'nordeste', 'forro', 'arraial', 'cultura brasileira', 'sapucai',
  ]},
  { key: 'midia', keywords: [
    'jornal nacional', 'globo', 'rede globo', 'imprensa', 'jornalismo',
    'reporter', 'televisao', 'midia', 'ancora', 'apresentador',
    'cobertura', 'manchete', 'noticiario', 'liberdade de imprensa',
    'ameaca a jornalista', 'cnn brasil', 'bonner',
  ]},
  { key: 'saude', keywords: [
    'sus', 'hospital', 'vacina', 'vacinacao', 'pandemia',
    'medicamento', 'anvisa', 'dengue', 'epidemia',
    'plano de saude', 'emergencia sanitaria', 'uti',
  ]},
  { key: 'tecnologia', keywords: [
    'inteligencia artificial', 'chatgpt', 'redes sociais',
    'whatsapp', 'tiktok', 'instagram', 'meta', 'startup',
    'big tech', 'privacidade', 'dados pessoais', 'lgpd',
  ]},
  { key: 'seguranca', keywords: [
    'seguranca publica', 'violencia', 'crime organizado', 'trafico de drogas',
    'milicia', 'mst', 'desmatamento', 'garimpo', 'yanomami', 'pcc',
    'faccao criminosa', 'bando armado',
  ]},
  { key: 'policia', keywords: [
    'policia federal', 'operacao policial', 'mandado de prisao',
    'prisao preventiva', 'preso em flagrante', 'inquerito policial',
    'corrupcao', 'propina', 'lavagem de dinheiro', 'peculato',
    'improbidade', 'delegado', 'indiciado', 'reu preso',
  ]},
  { key: 'internacional', keywords: [
    'estados unidos', 'eua', 'trump', 'casa branca', 'washington',
    'europa', 'uniao europeia', 'china', 'argentina', 'venezuela',
    'russia', 'mercosul', 'acordo comercial', 'tarifas', 'sancao',
    'diplomacia', 'onu', 'fmi', 'banco mundial', 'otan', 'guerra',
  ]},
  { key: 'economia', keywords: [
    'banco central', 'banco master', 'inflacao', 'dolar', 'mercado financeiro',
    'investimento', 'fraude financeira', 'tributario',
    'pib', 'recessao', 'petrobras', 'privatizacao',
    'credito', 'deficit', 'orcamento', 'tesouro', 'selic',
    'receita federal', 'vale refeicao',
  ]},
  { key: 'politica', keywords: [
    'presidente', 'senado', 'senador', 'camara', 'deputado',
    'stf', 'supremo tribunal federal', 'congresso', 'ministerio',
    'governo', 'governador', 'eleicao', 'partido', 'democracia',
    'constituicao', 'mandato', 'reeleicao', 'impeachment', 'golpe',
    'pgr', 'procurador', 'legislativo',
  ]},
];

const KNOWN_ENTITIES = {
  'lula': 'lula', 'luiz inacio': 'lula',
  'bolsonaro': 'bolsonaro', 'jair bolsonaro': 'bolsonaro',
  'tarcisio': 'tarcisiofreitas',
  'flavio dino': 'flaviodino',
  'alexandre de moraes': 'alexandredemoraes', 'moraes': 'alexandredemoraes',
  'gilmar mendes': 'gilmarmendes',
  'renan calheiros': 'renancalheiros',
  'arthur lira': 'arthurlira',
  'rodrigo pacheco': 'rodrigopacheco',
  'vorcaro': 'danielvorcaro', 'daniel vorcaro': 'danielvorcaro',
  'campos neto': 'camposneto', 'paulo guedes': 'pauloguedes',
  'haddad': 'haddad', 'fernando haddad': 'haddad',
  'bonner': 'williamBonner', 'william bonner': 'williamBonner',
  'fatima bernardes': 'fatimaBernardes',
  'stf': 'stf',
  'pf': 'policiaFederal', 'policia federal': 'policiaFederal',
  'banco master': 'bancomaster', 'master': 'bancomaster',
  'petrobras': 'petrobras', 'enel': 'enel',
  'mercosul': 'mercosul', 'stj': 'stj',
  'trump': 'trump', 'donald trump': 'trump',
  'biden': 'biden', 'zelensky': 'zelensky', 'putin': 'putin',
  'milei': 'milei', 'javier milei': 'milei',
  'lava jato': 'lavajato', 'compliance zero': 'compliancezero',
  'ronaldo': 'ronaldo', 'sapucai': 'sapucai', 'carnaval': 'carnaval',
  'paul cabannes': 'paulcabannes', 'cabannes': 'paulcabannes',
  'jacquin': 'ericjacquin', 'eric jacquin': 'ericjacquin',
  'croissant': 'croissant', 'masterchef': 'masterchef',
  'franca': 'franca', 'france': 'franca',
  'festa junina': 'festajunina', 'festas juninas': 'festajunina',
  'sao joao': 'saojoa', 'nordeste': 'nordeste', 'forro': 'forro',
};

const THEMES = {
  fraude:       ['fraude', 'esquema', 'golpe financeiro', 'manipulacao'],
  corrupcao:    ['corrupcao', 'propina', 'desvio', 'improbidade', 'peculato'],
  operacao_pf:  ['operacao compliance', 'operacao lava', 'mandado de prisao'],
  escandalo:    ['escandalo', 'polemica', 'controversia', 'denuncia'],
  investigacao: ['investigacao', 'inquerito', 'apuracao', 'delacao', 'depoimento'],
  julgamento:   ['julgamento', 'condenado', 'absolvido', 'sentenca'],
  fake_news:    ['fake news', 'desinformacao', 'mentira'],
  reforma:      ['reforma', 'aprovacao', 'votacao', 'plenario'],
  greve:        ['greve', 'paralisacao', 'protesto', 'manifestacao'],
  acordo:       ['acordo', 'negociacao', 'tratado', 'protocolo'],
};

function normalize(str) {
  return String(str).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function has(text, phrase) { return text.includes(normalize(phrase)); }

function detectCategory(description = '', title = '') {
  const raw = normalize(`${title} ${description}`);
  for (const { key, keywords } of CATEGORIES) {
    if (keywords.some(kw => has(raw, kw))) return key;
  }
  return 'outros';
}

function generateHashtags(description = '', title = '') {
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
// Main
// ---------------------------------------------------------------------------
const CATEGORY_LABELS = {
  gastronomia: '🍽️', energia: '⚡', esporte: '⚽', cultura: '🎭',
  midia: '📺', saude: '🏥', tecnologia: '💻', seguranca: '🚔',
  policia: '👮', internacional: '🌍', economia: '💰', politica: '🏛️',
  outros: '❓',
};

async function main() {
  console.log(`\n🏷️  Backfill hashtags + category — ${DRY_RUN ? 'DRY RUN' : 'LIVE'} ${OVERWRITE_ALL ? '(all)' : '(empty only)'}\n`);

  let query = supabase
    .from('songs')
    .select('id, title, description, hashtags, category')
    .eq('status', 'published');

  if (!OVERWRITE_ALL) {
    query = query.or('hashtags.is.null,hashtags.eq.{},category.is.null');
  }

  const { data: songs, error } = await query.order('release_date', { ascending: false });
  if (error) { console.error('❌ Fetch error:', error.message); process.exit(1); }
  if (!songs?.length) { console.log('✅ Nothing to update.'); return; }

  console.log(`Found ${songs.length} songs to process.\n`);

  let updated = 0, skipped = 0;

  for (const song of songs) {
    const newCategory = detectCategory(song.description || '', song.title || '');
    const newHashtags = generateHashtags(song.description || '', song.title || '');

    const sameCategory = song.category === newCategory;
    const sameHashtags = JSON.stringify(song.hashtags || []) === JSON.stringify(newHashtags);

    if (sameCategory && sameHashtags) { skipped++; continue; }

    const emoji = CATEGORY_LABELS[newCategory] || '❓';
    console.log(`  ${emoji} [${newCategory}]  ${song.title}`);
    if (!sameCategory)  console.log(`    category : ${song.category ?? 'null'} → ${newCategory}`);
    if (!sameHashtags)  console.log(`    hashtags : ${JSON.stringify(newHashtags)}`);

    if (!DRY_RUN) {
      const { error: updateError } = await supabase
        .from('songs')
        .update({ category: newCategory, hashtags: newHashtags })
        .eq('id', song.id);

      if (updateError) {
        console.error(`    ❌ ${updateError.message}`);
      } else {
        console.log(`    ✅ saved`);
        updated++;
      }
    } else {
      updated++;
    }
    console.log('');
  }

  console.log(`\n📊 ${updated} updated, ${skipped} unchanged${DRY_RUN ? ' — dry run, nothing written' : ''}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
