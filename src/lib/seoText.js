/**
 * Titres et descriptions des pages (balise <title>, meta description, og:, JSON-LD).
 *
 * UNE seule règle pour le HTML statique (scripts/generate-stubs.cjs, qui importe ce
 * module) et pour les pages React (useSongSEO, Categoria) : les deux couches écrivent
 * exactement le même texte. Module sans dépendance, lisible par Node comme par Vite.
 *
 * Limites : titre ≤ 60 caractères, description ≤ 160. Le contrôle du build
 * (scripts/check-seo-text.cjs) avertit de tout dépassement.
 */
export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 160;
export const SITE_NAME = 'A Música da Segunda';
const SITE_SUFFIX = ` | ${SITE_NAME}`;

/** Thème d'une catégorie, tel qu'il se lit après « paródia sobre ». Sans entrée : pas de thème. */
export const SEO_THEMES = {
  politica: 'política',
  economia: 'economia',
  esporte: 'esporte',
  cultura: 'cultura',
  midia: 'mídia',
  policia: 'casos de polícia',
  seguranca: 'segurança pública',
  internacional: 'notícias do mundo',
  energia: 'energia',
  gastronomia: 'comida',
  tecnologia: 'tecnologia',
  saude: 'saúde',
};

const clean = (text) => String(text || '').replace(/\s+/g, ' ').trim();

/** Coupe entre deux mots — dernier recours pour un titre de chanson hors norme. */
function cutAtWord(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:—–-]+$/, '');
}

/** Ajoute « | A Música da Segunda » seulement si le tout tient dans la limite. */
export function withSiteName(title) {
  return title.length + SITE_SUFFIX.length <= TITLE_MAX ? title + SITE_SUFFIX : title;
}

/**
 * Titre d'une page chanson : « <Título> — paródia sobre <tema> », puis des formes de
 * plus en plus courtes tant que ça dépasse 60 caractères.
 * @param {{ title?: string, category?: string|null }} song
 */
export function songSeoTitle(song) {
  const name = clean(song?.title);
  if (!name) return SITE_NAME;
  const theme = SEO_THEMES[song?.category];
  const forms = [
    theme ? `${name} — paródia sobre ${theme}` : null,
    `${name} — paródia musical`,
    `${name} — paródia`,
    `${clean(name.replace(/\s*\([^)]*\)/g, ''))} — paródia`,
  ].filter(Boolean);
  const base = forms.find((form) => form.length <= TITLE_MAX) || `${cutAtWord(name, TITLE_MAX - 10)} — paródia`;
  return withSiteName(base);
}

/** Titre d'une page de catégorie. */
export function categorySeoTitle(slug, label) {
  const theme = SEO_THEMES[slug];
  return withSiteName(theme ? `Paródias sobre ${theme}` : `${clean(label)} — paródias musicais`);
}

/** Description d'une page de catégorie. */
export const CATEGORY_DESCRIPTIONS = {
  internacional: 'Paródias sobre geopolítica, diplomacia e eventos fora do Brasil.',
  midia: 'Sátiras sobre jornalismo, redes sociais e comunicação.',
  energia: 'Músicas sobre crises energéticas, apagões e infraestrutura elétrica.',
  esporte: 'Paródias do universo do esporte brasileiro e internacional.',
  cultura: 'Sátiras sobre carnaval, entretenimento e vida cultural brasileira.',
  outros: 'Músicas sobre temas variados do cotidiano.',
  saude: 'Paródias sobre saúde pública, medicina e bem-estar.',
  policia: 'Sátiras sobre segurança pública e casos policiais.',
  politica: 'Músicas sobre política brasileira, eleições e mandatos.',
  seguranca: 'Paródias sobre violência urbana e segurança pública.',
  tecnologia: 'Sátiras sobre startups, inteligência artificial e inovação.',
  gastronomia: 'Músicas sobre gastronomia, culinária e cultura alimentar.',
  economia: 'Paródias sobre economia, inflação, preços, mercado e finanças do Brasil.',
};

/** Archive d'une année (/arquivo/:year). */
export function archiveSeoTitle(year) {
  return `Paródias de ${year} — ${SITE_NAME}`;
}
export function archiveSeoDescription(year, count) {
  return `Arquivo completo: ${count} paródias musicais publicadas por ${SITE_NAME} em ${year}, sobre política, economia, cultura e muito mais.`;
}

/** Phrases d'un texte. Une abréviation ou un nombre (« Jr. foi », « 75,94% ») ne coupe pas. */
export function splitSentences(text) {
  return clean(text)
    .split(/(?<=[.!?]["”»)]?)\s+(?=["“«(]?[A-ZÀ-Ý0-9])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** Une phrase entière, terminée proprement, sans points de suspension (ils se liraient comme une coupure). */
const isWholeSentence = (sentence) => /[.!?]["”»)]?$/.test(sentence) && !/\.\.\.|…/.test(sentence);

/**
 * Description d'une page chanson : la phrase de `context_short` si elle est remplie,
 * sinon les premières phrases ENTIÈRES de la description, puis « Letra, contexto e
 * karaokê. ». Jamais de phrase coupée : si la première ne tient pas, la première
 * phrase plus courte du texte qui nomme la chanson (elle se comprend seule) ; sinon
 * une description plus courte.
 * @param {{ title?: string, description?: string|null, context_short?: string|null, karaoke?: boolean }} song
 */
export function songSeoDescription(song) {
  const tail = song?.karaoke ? 'Letra, contexto e karaokê.' : 'Letra e contexto.';
  const budget = DESCRIPTION_MAX - tail.length - 1;
  const fits = (text) => text.length <= budget;

  const short = clean(song?.context_short);
  if (short && fits(short)) return `${/[.!?]["”»)]?$/.test(short) ? short : `${short}.`} ${tail}`;

  const name = clean(song?.title);
  const sentences = splitSentences(String(song?.description || '').replace(/\*+/g, ''));
  let lead = '';
  for (const sentence of sentences) {
    const next = lead ? `${lead} ${sentence}` : sentence;
    if (!isWholeSentence(sentence) || !fits(next)) break;
    lead = next;
  }
  if (!lead && name) lead = sentences.find((sentence) => isWholeSentence(sentence) && fits(sentence) && sentence.includes(name)) || '';
  if (!lead) {
    lead = name ? `“${name}”, paródia musical de ${SITE_NAME}.` : `Paródia musical de ${SITE_NAME}.`;
  }
  return `${lead} ${tail}`;
}
