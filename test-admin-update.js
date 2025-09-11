// Script de test pour vérifier la mise à jour via Admin
// Exécuter dans la console du navigateur sur http://localhost:3000/admin

console.log('🧪 TEST DE MISE À JOUR ADMIN - DÉBUT');

// Test 1: Vérifier que Supabase est accessible
async function testSupabaseConnection() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = 'https://efnzmpzkzeuktqkghwfa.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmbnptcHpremV1a3Rxa2dod2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzE4MzcsImV4cCI6MjA3MTgwNzgzN30.iQiDuurPIkSNjHWP6TID0dATrOCJQ71-kblcsRsHiAk';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test de connexion
    const { data, error } = await supabase
      .from('songs')
      .select('id, title')
      .limit(1);
    
    if (error) {
      console.error('❌ Erreur de connexion Supabase:', error);
      return false;
    }
    
    console.log('✅ Connexion Supabase OK:', data);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du test de connexion:', error);
    return false;
  }
}

// Test 2: Tester la mise à jour d'une chanson
async function testSongUpdate() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = 'https://efnzmpzkzeuktqkghwfa.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmbnptcHpremV1a3Rxa2dod2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzE4MzcsImV4cCI6MjA3MTgwNzgzN30.iQiDuurPIkSNjHWP6TID0dATrOCJQ71-kblcsRsHiAk';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Mise à jour de test
    const testUpdate = {
      spotify_url: 'https://open.spotify.com/intl-fr/track/3yCXU6m1XBNAqBtS5znNmX?si=514f0b8b465f4add',
      updated_at: new Date().toISOString()
    };
    
    console.log('🔄 Test de mise à jour de la chanson ID 18...');
    
    const { data, error } = await supabase
      .from('songs')
      .update(testUpdate)
      .eq('id', 18)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      return false;
    }
    
    console.log('✅ Mise à jour réussie:', data);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du test de mise à jour:', error);
    return false;
  }
}

// Test 3: Tester la création d'une chanson
async function testSongCreation() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = 'https://efnzmpzkzeuktqkghwfa.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmbnptcHpremV1a3Rxa2dod2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzE4MzcsImV4cCI6MjA3MTgwNzgzN30.iQiDuurPIkSNjHWP6TID0dATrOCJQ71-kblcsRsHiAk';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Chanson de test
    const testSong = {
      title: 'Test Admin Update',
      artist: 'A Música da Segunda',
      description: 'Chanson de test pour vérifier le module admin',
      lyrics: 'Test lyrics',
      release_date: '2025-09-09',
      status: 'draft',
      tiktok_video_id: 'test_' + Date.now(),
      tiktok_url: 'https://www.tiktok.com/@test/video/test',
      hashtags: ['test', 'admin']
    };
    
    console.log('🔄 Test de création d\'une nouvelle chanson...');
    
    const { data, error } = await supabase
      .from('songs')
      .insert(testSong)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erreur lors de la création:', error);
      return false;
    }
    
    console.log('✅ Création réussie:', data);
    
    // Supprimer la chanson de test
    await supabase
      .from('songs')
      .delete()
      .eq('id', data.id);
    
    console.log('✅ Chanson de test supprimée');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du test de création:', error);
    return false;
  }
}

// Exécuter tous les tests
async function runAllTests() {
  console.log('🧪 === DÉBUT DES TESTS ===');
  
  const test1 = await testSupabaseConnection();
  const test2 = await testSongUpdate();
  const test3 = await testSongCreation();
  
  console.log('🧪 === RÉSULTATS DES TESTS ===');
  console.log('✅ Connexion Supabase:', test1 ? 'OK' : 'ÉCHEC');
  console.log('✅ Mise à jour chanson:', test2 ? 'OK' : 'ÉCHEC');
  console.log('✅ Création chanson:', test3 ? 'OK' : 'ÉCHEC');
  
  const allPassed = test1 && test2 && test3;
  console.log('🎯 RÉSULTAT GLOBAL:', allPassed ? 'TOUS LES TESTS RÉUSSIS' : 'CERTAINS TESTS ONT ÉCHOUÉ');
  
  return allPassed;
}

// Exécuter les tests
runAllTests();
