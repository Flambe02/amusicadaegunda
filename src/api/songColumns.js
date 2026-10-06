/**
 * Colonnes du RÉSUMÉ d'une chanson (accueil) — module sans dépendance, lu aussi par
 * `vite.config.js` pour la requête de démarrage écrite dans `index.html`.
 *
 * Pourquoi : `select('*')` ramène `timing_data`, `pitch_map`, `lrc_content`, `lyrics`…
 * soit ≈ 235 Ko compressés pour la liste de l'accueil (mesuré le 2026-10-06, 69
 * chansons), dont rien ne sert au premier écran. Le résumé de TOUT le catalogue pèse
 * ≈ 6 Ko ; les descriptions (≈ 43 Ko) arrivent ensuite, à part.
 *
 * `karaoke_synced_at` remplace `lrc_content` pour savoir si un karaokê existe : voir
 * `isKaraokePublished` (src/lib/lrc.js). La chanson complète se charge à la demande
 * par `Song.getFull` (letra, karaokê).
 *
 * ⚠️ Seulement des colonnes qui EXISTENT dans `songs` : une colonne inconnue fait
 * échouer toute la requête (400).
 */
export const SONG_INDEX_COLUMNS = [
  'id',
  'slug',
  'title',
  'artist',
  'subtitle',
  'release_date',
  'created_at',
  'status',
  'category',
  'cover_image',
  'youtube_music_url',
  'youtube_url',
  'spotify_url',
  'apple_music_url',
  'karaoke_published',
  'karaoke_synced_at',
];

/** Résumé d'UNE chanson (celle de la semaine) : l'index + sa description (« História »). */
export const SONG_SUMMARY_COLUMNS = [...SONG_INDEX_COLUMNS, 'description'];

export const SONG_DESCRIPTION_COLUMNS = ['id', 'description'];

/**
 * Catalogue /karaoke : seulement les chansons synchronisées, avec ce que la liste lit
 * (premier vers, difficulté estimée sur la letra, recherche) — sans `timing_data`,
 * `pitch_map` ni la transcription brute, que seul le lecteur utilise (Song.getFull).
 */
export const SONG_KARAOKE_COLUMNS = [
  ...SONG_SUMMARY_COLUMNS,
  'difficulty',
  'hashtags',
  'lyrics',
  'lyrics_karaoke',
  'lrc_content',
];

/** Texte des paroles, pour la recherche : demandé quand l'utilisateur commence à taper. */
export const SONG_LYRICS_COLUMNS = ['id', 'lyrics', 'lyrics_karaoke'];

/**
 * Catalogue en résumé enrichi de ses descriptions (lignes `{ id, description }`).
 * Une chanson qui porte déjà la sienne (repli statique, lecture complète) est gardée
 * telle quelle, objet compris.
 */
export function mergeSongDescriptions(songs, rows) {
  const byId = rows instanceof Map ? rows : new Map((rows || []).map((row) => [row.id, row.description ?? null]));
  if (byId.size === 0) return songs;
  return songs.map((song) =>
    song.description === undefined && byId.has(song.id)
      ? { ...song, description: byId.get(song.id) }
      : song
  );
}

/** Nombre de chansons de l'accueil (feed mobile, catalogue mensuel desktop). */
export const HOME_SONGS_LIMIT = 120;

/**
 * Requête REST de la chanson de la semaine, lancée par `index.html` AVANT le
 * JavaScript de l'app. La clé publique passe dans l'URL et aucun en-tête n'est
 * ajouté : requête « simple », donc sans pré-vérification CORS (un aller-retour de
 * moins). Même filtre et même tri que `supabaseSongService.getCurrentLite`.
 */
export function buildCurrentSongBootUrl(supabaseUrl, publishableKey) {
  const params = new URLSearchParams({
    apikey: publishableKey,
    select: SONG_SUMMARY_COLUMNS.join(','),
    status: 'eq.published',
    order: 'release_date.desc',
    limit: '1',
  });
  return `${String(supabaseUrl).replace(/\/+$/, '')}/rest/v1/songs?${params.toString()}`;
}
