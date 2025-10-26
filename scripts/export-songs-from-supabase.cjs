/**
 * Exporte les chansons depuis Supabase vers content/songs.json
 * - Lit .env (SUPABASE_URL + SUPABASE_ANON_KEY ou SUPABASE_SERVICE_KEY)
 * - Mappe les colonnes de la table "songs" (adapte les noms en bas)
 * - Normalise la durée en ISO8601 (PT#M#S)
 * - Valide slug/title et dédoublonne
 * - Sortie: content/songs.json (utilisé par generate-stubs/sitemap)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ========== CONFIG À ADAPTER SI BESOIN ==========
const TABLE = process.env.SONGS_TABLE || 'songs';
// colonnes réelles dans la base actuelle (voir 02-create-tables.sql)
const COLS = {
  id: 'id',
  title: 'title',
  release_date: 'release_date',
  cover_image: 'cover_image',
  youtube_url: 'youtube_url',
  spotify_url: 'spotify_url',
  status: 'status'
};
const DEFAULT_IMAGE = '/images/og-default.jpg';
const SITE_URL = process.env.SITE_URL || 'https://www.amusicadasegunda.com';
const ARTIST_NAME = process.env.ARTIST_NAME || 'A Música da Segunda';
const ARTIST_URL  = process.env.ARTIST_URL  || SITE_URL;
// ================================================

function isoDuration(sec) {
  const n = Number(sec || 0);
  if (!n || n <= 0) return undefined;
  const m = Math.floor(n / 60), s = n % 60;
  return `PT${m}M${s}S`;
}
function yyyy_mm_dd(d) {
  if (!d) return undefined;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return undefined;
  return dt.toISOString().slice(0, 10);
}

function slugify(input) {
  return String(input || '')
    .normalize('NFD').replace(/\p{Diacritic}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// Support Vite-style env var names as fallbacks
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('❌ Manque SUPABASE_URL ou SUPABASE_*KEY dans .env');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

(async () => {
  // Sélection des colonnes
  const sel = [
    COLS.id, COLS.title, COLS.release_date,
    COLS.cover_image, COLS.youtube_url, COLS.spotify_url,
    COLS.status
  ].join(', ');

  const { data, error } = await supabase
    .from(TABLE)
    .select(sel)
    .eq(COLS.status, 'published')
    .order(COLS.release_date, { ascending: false });

  if (error) {
    console.error('❌ Supabase error:', error);
    process.exit(1);
  }

  const rows = Array.isArray(data) ? data : [];
  // Validation + mapping
  const seen = new Set();
  const mapped = [];
  for (const r of rows) {
    const title = (r[COLS.title] || '').trim();
    if (!title) continue;
    let slug = slugify(title);
    if (!slug) continue;
    if (seen.has(slug)) slug = `${slug}-${r[COLS.id]}`; // assure unicité
    seen.add(slug);

    const datePublished = yyyy_mm_dd(r[COLS.release_date]);
    const audioUrl = r[COLS.youtube_url] || r[COLS.spotify_url] || undefined;
    const image = r[COLS.cover_image] ? r[COLS.cover_image] : DEFAULT_IMAGE;
    const duration = undefined; // non présent dans le schéma actuel

    mapped.push({
      slug,
      name: title,
      datePublished,
      audioUrl,
      image,
      duration,
      inLanguage: 'pt-BR',
      byArtist: { name: ARTIST_NAME, url: ARTIST_URL }
    });
  }

  // Sortie
  const outDir = path.resolve('content');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'songs.json');
  fs.writeFileSync(outFile, JSON.stringify(mapped, null, 2), 'utf8');

  console.log(`✅ Export OK: ${mapped.length} chansons → ${outFile}`);
  console.log('   Exemple première entrée:', mapped[0] || '(vide)');
})();


