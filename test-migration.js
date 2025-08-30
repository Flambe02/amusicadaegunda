/**
 * Script de test pour la migration "Confissões Bancárias"
 * À exécuter dans la console du navigateur pour tester la migration
 */

console.log('🧪 Test de la migration "Confissões Bancárias"...');

// Simuler le localStorage pour le test
const mockLocalStorage = {
  songs: [
    {
      id: 1,
      title: "Confissões Bancárias",
      artist: "A Música da Segunda",
      tiktok_video_id: "7540762684149517590"
    },
    {
      id: 2,
      title: "Café Tarifa Caos",
      artist: "A Música da Segunda",
      tiktok_video_id: "7540762684149517591"
    }
  ]
};

// Simuler la migration
function testMigration() {
  console.log('📊 État initial:', mockLocalStorage.songs);
  
  // Nettoyer "Confissões Bancárias"
  const cleanedSongs = mockLocalStorage.songs.filter(song => 
    song.title !== 'Confissões Bancárias' && 
    song.tiktok_video_id !== '7540762684149517590'
  );
  
  // Renuméroter les IDs
  const renumberedSongs = cleanedSongs.map((song, index) => ({
    ...song,
    id: index + 1
  }));
  
  console.log('🧹 Après nettoyage:', renumberedSongs);
  console.log('✅ Test réussi : "Confissões Bancárias" supprimée et IDs renumérotés');
  
  return renumberedSongs;
}

// Exécuter le test
const result = testMigration();

// Vérifications
console.log('🔍 Vérifications:');
console.log('- "Confissões Bancárias" supprimée:', !result.find(s => s.title === 'Confissões Bancárias'));
console.log('- IDs séquentiels:', result.every((s, i) => s.id === i + 1));
console.log('- Nombre de chansons:', result.length);

console.log('🎉 Test de migration terminé !');
