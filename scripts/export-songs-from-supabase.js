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
// colonnes attendues : ajuste ici si tes noms diffèrent
const COLS = {
  slug: 'slug',
  title: 'title',                // ou 'name'
  published_at: 'published_at',  // DATETIME
  audio_url: 'audio_url',
  cover_url: 'cover_url',        // image OG/cover
  duration_seconds: 'duration_seconds' // entier (secondes)
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
    COLS.slug, COLS.title, COLS.published_at,
    COLS.audio_url, COLS.cover_url, COLS.duration_seconds
  ].join(', ');

  const { data, error } = await supabase
    .from(TABLE)
    .select(sel)
    .order(COLS.published_at, { ascending: false });

  if (error) {
    console.error('❌ Supabase error:', error);
    process.exit(1);
  }

  const rows = Array.isArray(data) ? data : [];
  // Validation + mapping
  const seen = new Set();
  const mapped = [];
  for (const r of rows) {
    const slug = (r[COLS.slug] || '').trim();
    const title = (r[COLS.title] || '').trim();
    if (!slug || !title) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);

    const datePublished = yyyy_mm_dd(r[COLS.published_at]);
    const audioUrl = r[COLS.audio_url] || undefined;
    const image = r[COLS.cover_url] ? r[COLS.cover_url] : DEFAULT_IMAGE;
    const duration = isoDuration(r[COLS.duration_seconds]);

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


