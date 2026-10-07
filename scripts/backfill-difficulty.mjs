/**
 * backfill-difficulty.mjs — remplit `songs.difficulty` avec la difficulté que les cartes
 * affichent déjà (estimation sur le nombre de mots de la letra, src/lib/songDifficulty.js).
 *
 * Usage :
 *   node scripts/backfill-difficulty.mjs            tableau seulement, AUCUNE écriture
 *   node scripts/backfill-difficulty.mjs --json     le même tableau, en JSON
 *   node scripts/backfill-difficulty.mjs --sql      le SQL à coller dans le tableau de
 *                                                    bord Supabase (une transaction,
 *                                                    un UPDATE par chanson), AUCUNE écriture
 *   node scripts/backfill-difficulty.mjs --write    écrit les lignes « à écrire »
 *
 * Ne touche jamais une chanson qui a déjà une valeur, ni une chanson sans letra (rien
 * à compter : la colonne reste NULL), ni une chanson dont l'étiquette de /karaoke
 * diffère de celle de la TV (à trancher à la main, voir la colonne « écart »).
 *
 * La lecture utilise la clé publique. L'écriture demande SUPABASE_SERVICE_KEY dans
 * `.env` (jamais commité, jamais sous un préfixe VITE_).
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { resolveSupabasePublicConfig } from '../src/lib/supabasePublicConfig.js';
import { countLyricsWords, estimateDifficultyKey } from '../src/lib/songDifficulty.js';

const WRITE = process.argv.includes('--write');
const JSON_OUT = process.argv.includes('--json');
const SQL_OUT = process.argv.includes('--sql');
const LABEL = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' };

const { url, key: publicKey } = resolveSupabasePublicConfig(process.env);
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
if (WRITE && !serviceKey) {
  console.error('--write demande SUPABASE_SERVICE_KEY dans .env (clé de service, jamais commitée).');
  process.exit(1);
}
const supabase = createClient(url, WRITE ? serviceKey : publicKey, { auth: { persistSession: false } });

const { data, error } = await supabase
  .from('songs')
  .select('id,title,status,release_date,difficulty,lyrics,lyrics_karaoke,karaoke_synced_at')
  .order('release_date', { ascending: false });
if (error) {
  console.error('Lecture impossible :', error.message);
  process.exit(1);
}

const rows = data.map((song) => {
  const estimated = estimateDifficultyKey(song.lyrics);
  // Ce que la TV affiche aujourd'hui : la colonne, sinon l'estimation, « Médio » sans letra.
  const tvToday = song.difficulty || estimated || 'medium';
  // Ce que /karaoke (mobile) affiche aujourd'hui : même seuils, mais sur la letra revue
  // (`lyrics_karaoke`) quand elle existe — seulement pour les chansons avec karaokê.
  const karaokeText = (song.lyrics_karaoke || '').trim() ? song.lyrics_karaoke : song.lyrics;
  const mobileToday = song.karaoke_synced_at ? (song.difficulty || estimateDifficultyKey(karaokeText)) : null;
  let action = 'write';
  if (song.difficulty) action = 'keep';
  else if (!estimated) action = 'skip-no-lyrics';
  else if (mobileToday && mobileToday !== estimated) action = 'review';
  return {
    id: song.id, title: song.title, status: song.status,
    words: countLyricsWords(song.lyrics), wordsKaraoke: countLyricsWords(karaokeText),
    current: song.difficulty || null, tvToday, mobileToday, computed: estimated, action,
  };
});

if (SQL_OUT) {
  // `AND difficulty IS NULL` : jamais d'écrasement d'une valeur déjà présente.
  const toWrite = rows.filter((row) => row.action === 'write').sort((a, b) => a.id - b.id);
  console.log('BEGIN;');
  for (const row of toWrite) {
    console.log(`UPDATE public.songs SET difficulty = '${row.computed}' WHERE id = ${Number(row.id)} AND difficulty IS NULL; -- ${String(row.title).replace(/\s+/g, ' ').trim()} (${row.words} palavras)`);
  }
  console.log('COMMIT;');
  const expected = { easy: 0, medium: 0, hard: 0 };
  for (const row of rows.filter((item) => item.status === 'published')) {
    const value = row.action === 'write' ? row.computed : row.current;
    if (value) expected[value] += 1;
  }
  console.log(`-- ${toWrite.length} UPDATE. Attendu ensuite, chansons publiées : easy ${expected.easy}, medium ${expected.medium}, hard ${expected.hard}.`);
} else if (JSON_OUT) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  const pad = (value, width) => String(value ?? '—').padEnd(width).slice(0, width);
  console.log(`${pad('id', 4)} ${pad('chanson', 38)} ${pad('mots', 5)} ${pad('colonne', 8)} ${pad('TV auj.', 8)} ${pad('/karaoke', 9)} ${pad('calculée', 9)} action`);
  for (const row of rows) {
    console.log(`${pad(row.id, 4)} ${pad(row.title, 38)} ${pad(row.words, 5)} ${pad(row.current, 8)} ${pad(LABEL[row.tvToday], 8)} ${pad(row.mobileToday ? LABEL[row.mobileToday] : null, 9)} ${pad(row.computed ? LABEL[row.computed] : null, 9)} ${row.action}`);
  }
  const count = (action) => rows.filter((row) => row.action === action).length;
  console.log(`\n${rows.length} chansons — à écrire ${count('write')}, déjà renseignées ${count('keep')}, sans letra ${count('skip-no-lyrics')}, écart TV / karaoke ${count('review')}`);
  const changed = rows.filter((row) => row.action === 'write' && row.computed !== row.tvToday);
  console.log(`Étiquettes TV qui changeraient : ${changed.length}`);
}

if (WRITE) {
  let written = 0;
  for (const row of rows.filter((item) => item.action === 'write')) {
    // `.is('difficulty', null)` : jamais d'écrasement, même si la valeur a changé entre-temps.
    const { error: writeError } = await supabase.from('songs').update({ difficulty: row.computed }).eq('id', row.id).is('difficulty', null);
    if (writeError) { console.error(`✗ ${row.id} ${row.title} : ${writeError.message}`); continue; }
    written += 1;
  }
  console.log(`\nÉcrit : ${written} chansons.`);
}
