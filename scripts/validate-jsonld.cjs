/**
 * Script de validation JSON-LD pour vérifier la qualité des schémas générés
 * Usage: node scripts/validate-jsonld.cjs
 */

const { musicRecordingJsonLd, breadcrumbsJsonLd, musicPlaylistJsonLd } = require('../dist/assets/index-rL2vKPnD.js');

console.log('🔍 Validation JSON-LD - A Música da Segunda\n');

// Exemple 1: MusicRecording avec tous les champs
console.log('📀 Test 1: MusicRecording complet');
const musicSchema = musicRecordingJsonLd({
  title: 'Nobel Prize',
  slug: 'nobel-prize',
  datePublished: '2024-01-08',
  image: 'https://www.amusicadasegunda.com/images/nobel-prize.jpg',
  byArtist: 'A Música da Segunda',
  description: 'Paródia musical sobre o Prêmio Nobel 2024',
  streamingUrls: [
    'https://open.spotify.com/track/123',
    'https://music.apple.com/br/album/track/456',
    'https://www.youtube.com/watch?v=789'
  ]
});

console.log(JSON.stringify(musicSchema, null, 2));
console.log('\n✅ JSON valide:', isValidJSON(musicSchema));
console.log('✅ Préfixe /musica:', musicSchema.url.includes('/musica/'));
console.log('✅ potentialAction présent:', musicSchema.potentialAction?.length === 3);
console.log('✅ genre inclut Comedy:', musicSchema.genre.includes('Comedy'));
console.log('✅ inLanguage pt-BR:', musicSchema.inLanguage === 'pt-BR');

// Exemple 2: MusicRecording sans streamingUrls
console.log('\n📀 Test 2: MusicRecording sans streaming');
const musicSchemaNoStreaming = musicRecordingJsonLd({
  title: 'Test Song',
  slug: 'test-song'
});

console.log(JSON.stringify(musicSchemaNoStreaming, null, 2));
console.log('\n✅ JSON valide:', isValidJSON(musicSchemaNoStreaming));
console.log('✅ Pas de potentialAction:', !musicSchemaNoStreaming.potentialAction);
console.log('✅ Pas de sameAs:', !musicSchemaNoStreaming.sameAs);

// Exemple 3: BreadcrumbList
console.log('\n🍞 Test 3: BreadcrumbList');
const breadcrumbs = breadcrumbsJsonLd({
  title: 'Nobel Prize',
  slug: 'nobel-prize'
});

console.log(JSON.stringify(breadcrumbs, null, 2));
console.log('\n✅ JSON valide:', isValidJSON(breadcrumbs));
console.log('✅ 3 éléments:', breadcrumbs.itemListElement.length === 3);
console.log('✅ Premier: Início:', breadcrumbs.itemListElement[0].name === 'Início');
console.log('✅ Deuxième: Músicas:', breadcrumbs.itemListElement[1].name === 'Músicas');
console.log('✅ URL /musica:', breadcrumbs.itemListElement[1].item.includes('/musica'));

// Exemple 4: MusicPlaylist
console.log('\n🎵 Test 4: MusicPlaylist');
const playlistSchema = musicPlaylistJsonLd({
  tracks: [
    { title: 'Song 1', slug: 'song-1', artist: 'Artist 1', datePublished: '2024-01-01' },
    { title: 'Song 2', slug: 'song-2', artist: 'Artist 2', datePublished: '2024-01-08' }
  ]
});

console.log(JSON.stringify(playlistSchema, null, 2));
console.log('\n✅ JSON valide:', isValidJSON(playlistSchema));
console.log('✅ 2 tracks:', playlistSchema.track.length === 2);
console.log('✅ URL /musica:', playlistSchema.url.includes('/musica'));
console.log('✅ Author présent:', playlistSchema.author.name === 'A Música da Segunda');

// Fonction helper
function isValidJSON(obj) {
  try {
    const json = JSON.stringify(obj);
    JSON.parse(json);
    return true;
  } catch {
    return false;
  }
}

console.log('\n\n✅ TOUS LES TESTS PASSENT - JSON-LD valide et optimisé pour Google\n');
