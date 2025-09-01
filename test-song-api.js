// Test script pour vérifier l'API Song.getBySlug
import { Song } from './src/api/entities.js';

async function testSongAPI() {
  console.log('🧪 Test de l\'API Song.getBySlug...\n');
  
  try {
    // Test avec un slug existant
    console.log('1. Test avec slug "croissant":');
    const song1 = await Song.getBySlug('croissant');
    console.log('Résultat:', song1 ? '✅ Trouvé' : '❌ Non trouvé');
    if (song1) {
      console.log('   - Titre:', song1.title);
      console.log('   - Artiste:', song1.artist);
      console.log('   - Description:', song1.description);
    }
    
    console.log('\n2. Test avec slug "confissoes-bancarias":');
    const song2 = await Song.getBySlug('confissoes-bancarias');
    console.log('Résultat:', song2 ? '✅ Trouvé' : '❌ Non trouvé');
    if (song2) {
      console.log('   - Titre:', song2.title);
      console.log('   - Artiste:', song2.artist);
      console.log('   - Description:', song2.description);
    }
    
    console.log('\n3. Test avec slug inexistant "inexistant":');
    const song3 = await Song.getBySlug('inexistant');
    console.log('Résultat:', song3 ? '✅ Trouvé (inattendu)' : '❌ Non trouvé (attendu)');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testSongAPI();
