#!/usr/bin/env node
/**
 * Contrôle des titres et descriptions du site généré (dist/), après le build.
 *
 * AVERTIT sans faire échouer le build : tout <title> de plus de 60 caractères, toute
 * meta description absente ou de plus de 160, et toute page où og:title ou
 * og:description ne reprennent pas le titre et la description. Les pages `noindex`
 * (redirections, admin, recherche…) ne sont pas contrôlées.
 *
 *   node scripts/check-seo-text.cjs [dossier]     (défaut : dist)
 */
const fs = require('node:fs');
const path = require('node:path');

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 160;

const decode = (text) => String(text || '')
  .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const meta = (html, pattern) => decode((html.match(pattern) || [])[1]);

/** Les problèmes d'une page (liste vide : rien à signaler). `null` : page hors contrôle. */
function checkSeoText(html) {
  if (/<meta name="robots" content="[^"]*noindex/i.test(html) || /http-equiv="refresh"/i.test(html)) return null;
  const title = meta(html, /<title>([^<]*)<\/title>/);
  const description = meta(html, /<meta name="description" content="([^"]*)"/);
  const ogTitle = meta(html, /<meta property="og:title" content="([^"]*)"/);
  const ogDescription = meta(html, /<meta property="og:description" content="([^"]*)"/);
  const problems = [];
  if (!title) problems.push('titre absent');
  else if (title.length > TITLE_MAX) problems.push(`titre de ${title.length} caractères (max ${TITLE_MAX}) : ${title}`);
  if (!description) problems.push('description absente');
  else if (description.length > DESCRIPTION_MAX) problems.push(`description de ${description.length} caractères (max ${DESCRIPTION_MAX})`);
  if (ogTitle && title && ogTitle !== title) problems.push(`og:title différent du titre : ${ogTitle}`);
  if (ogDescription && description && ogDescription !== description) problems.push('og:description différente de la description');
  return problems;
}

function listPages(dir) {
  const pages = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) pages.push(...listPages(full));
    else if (entry.name === 'index.html') pages.push(full);
  }
  return pages;
}

function main() {
  const root = path.resolve(process.argv[2] || 'dist');
  if (!fs.existsSync(root)) { console.log(`⚠️  check-seo-text : ${root} introuvable, contrôle ignoré.`); return; }
  let checked = 0;
  let warnings = 0;
  for (const file of listPages(root)) {
    const problems = checkSeoText(fs.readFileSync(file, 'utf8'));
    if (problems === null) continue;
    checked += 1;
    const page = `/${path.relative(root, path.dirname(file)).split(path.sep).join('/')}`.replace(/\/$/, '') + '/';
    for (const problem of problems) {
      warnings += 1;
      // `::warning::` : visible dans le résumé du workflow GitHub, sans le faire échouer.
      console.log(`${process.env.GITHUB_ACTIONS ? '::warning::' : '⚠️  '}SEO ${page} — ${problem}`);
    }
  }
  console.log(warnings ? `⚠️  Titres et descriptions : ${warnings} avertissement(s) sur ${checked} pages.` : `✅ Titres et descriptions : ${checked} pages contrôlées, rien à signaler.`);
}

if (require.main === module) main();
module.exports = { checkSeoText, TITLE_MAX, DESCRIPTION_MAX };
