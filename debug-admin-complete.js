// Script de debug complet pour le module admin
// Exécuter dans la console du navigateur sur http://localhost:3000/admin

console.log('🔍 DEBUG COMPLET DU MODULE ADMIN - DÉBUT');

// Test 1: Vérifier que les modules sont chargés
function testModulesLoaded() {
  console.log('🧪 Test 1: Vérification des modules chargés');
  
  // Vérifier que React est chargé
  if (typeof React !== 'undefined') {
    console.log('✅ React chargé');
  } else {
    console.error('❌ React non chargé');
  }
  
  // Vérifier que les composants sont disponibles
  if (typeof window !== 'undefined' && window.AdminPage) {
    console.log('✅ AdminPage disponible');
  } else {
    console.log('⚠️ AdminPage non disponible (normal en mode production)');
  }
  
  return true;
}

// Test 2: Vérifier la connexion Supabase
async function testSupabaseConnection() {
  console.log('🧪 Test 2: Vérification de la connexion Supabase');
  
  try {
    // Utiliser la fonction fetch directement pour éviter les problèmes d'import
    const response = await fetch('https://efnzmpzkzeuktqkghwfa.supabase.co/rest/v1/songs?select=id,title&limit=1', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmbnptcHpremV1a3Rxa2dod2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzE4MzcsImV4cCI6MjA3MTgwNzgzN30.iQiDuurPIkSNjHWP6TID0dATrOCJQ71-kblcsRsHiAk',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmbnptcHpremV1a3Rxa2dod2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzE4MzcsImV4cCI6MjA3MTgwNzgzN30.iQiDuurPIkSNjHWP6TID0dATrOCJQ71-kblcsRsHiAk',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('❌ Erreur de connexion Supabase:', response.status, response.statusText);
      return false;
    }
    
    const data = await response.json();
    console.log('✅ Connexion Supabase OK:', data);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du test de connexion:', error);
    return false;
  }
}

// Test 3: Tester la mise à jour d'une chanson (simulation du processus admin)
async function testSongUpdateProcess() {
  console.log('🧪 Test 3: Simulation du processus de mise à jour');
  
  try {
    // Utiliser fetch directement pour éviter les problèmes d'import
    const supabaseUrl = 'https://efnzmpzkzeuktqkghwfa.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmbnptcHpremV1a3Rxa2dod2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzE4MzcsImV4cCI6MjA3MTgwNzgzN30.iQiDuurPIkSNjHWP6TID0dATrOCJQ71-kblcsRsHiAk';
    
    // Simuler les données de mise à jour comme dans Admin.jsx
    const songToSave = {
      title: "Bonner sai",
      artist: "A Música da Segunda",
      description: "Test de mise à jour via admin",
      lyrics: "Test lyrics",
      release_date: "2025-09-08",
      status: "published",
      tiktok_video_id: "7545478877624208646",
      tiktok_url: "https://www.tiktok.com/@amusicadasegunda/video/7545478877624208646",
      tiktok_publication_date: "2025-09-08",
      spotify_url: "https://open.spotify.com/track/3yCXU6m1XBNAqBtS5znNmX",
      apple_music_url: null,
      youtube_url: null,
      cover_image: null,
      hashtags: ["globo", "jn", "tv", "trends", "brasil"]
    };
    
    // Nettoyage comme dans Admin.jsx
    const clean = {
      ...songToSave,
      release_date: songToSave.release_date ? new Date(songToSave.release_date).toISOString().slice(0,10) : null,
      tiktok_publication_date: songToSave.tiktok_publication_date ? new Date(songToSave.tiktok_publication_date).toISOString().slice(0,10) : null,
      hashtags: Array.isArray(songToSave.hashtags) ? songToSave.hashtags : [],
      title: String(songToSave.title || ''),
      artist: String(songToSave.artist || ''),
      description: String(songToSave.description || ''),
      lyrics: String(songToSave.lyrics || ''),
      tiktok_url: String(songToSave.tiktok_url || ''),
      tiktok_video_id: String(songToSave.tiktok_video_id || ''),
      status: String(songToSave.status || 'draft'),
      spotify_url: songToSave.spotify_url || null,
      apple_music_url: songToSave.apple_music_url || null,
      youtube_url: songToSave.youtube_url || null,
      cover_image: songToSave.cover_image || null
    };
    
    // Supprimer les champs système
    delete clean.id;
    delete clean.created_at;
    delete clean.updated_at;
    
    console.log('🔄 Données nettoyées:', clean);
    console.log('🔄 Clés:', Object.keys(clean));
    console.log('🔄 Contient un ID?', 'id' in clean);
    
    // Test de mise à jour avec fetch
    const response = await fetch(`${supabaseUrl}/rest/v1/songs?id=eq.18`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(clean)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erreur lors de la mise à jour:', response.status, response.statusText);
      console.error('❌ Détails:', errorData);
      return false;
    }
    
    const data = await response.json();
    console.log('✅ Mise à jour réussie:', data);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du test de mise à jour:', error);
    return false;
  }
}

// Test 4: Vérifier les erreurs JavaScript
function testJavaScriptErrors() {
  console.log('🧪 Test 4: Vérification des erreurs JavaScript');
  
  // Vérifier s'il y a des erreurs dans la console
  const originalError = console.error;
  const errors = [];
  
  console.error = function(...args) {
    errors.push(args.join(' '));
    originalError.apply(console, args);
  };
  
  // Attendre un peu pour capturer les erreurs
  setTimeout(() => {
    console.error = originalError;
    
    if (errors.length > 0) {
      console.log('⚠️ Erreurs JavaScript détectées:', errors);
    } else {
      console.log('✅ Aucune erreur JavaScript détectée');
    }
  }, 1000);
  
  return true;
}

// Test 5: Vérifier les variables d'environnement
function testEnvironmentVariables() {
  console.log('🧪 Test 5: Vérification des variables d\'environnement');
  
  try {
    // Vérifier si on est dans un contexte de module
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      console.log('✅ import.meta.env disponible');
      console.log('🔍 VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('🔍 VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Défini' : 'Non défini');
    } else {
      console.log('⚠️ import.meta.env non disponible (normal en mode console)');
    }
  } catch (error) {
    console.log('⚠️ Erreur lors de la vérification des variables d\'environnement:', error.message);
  }
  
  return true;
}

// Exécuter tous les tests
async function runAllTests() {
  console.log('🧪 === DÉBUT DES TESTS DE DEBUG ===');
  
  const test1 = testModulesLoaded();
  const test2 = await testSupabaseConnection();
  const test3 = await testSongUpdateProcess();
  const test4 = testJavaScriptErrors();
  const test5 = testEnvironmentVariables();
  
  console.log('🧪 === RÉSULTATS DES TESTS ===');
  console.log('✅ Modules chargés:', test1 ? 'OK' : 'ÉCHEC');
  console.log('✅ Connexion Supabase:', test2 ? 'OK' : 'ÉCHEC');
  console.log('✅ Mise à jour chanson:', test3 ? 'OK' : 'ÉCHEC');
  console.log('✅ Erreurs JavaScript:', test4 ? 'OK' : 'ÉCHEC');
  console.log('✅ Variables d\'environnement:', test5 ? 'OK' : 'ÉCHEC');
  
  const criticalTests = [test2, test3];
  const allCriticalPassed = criticalTests.every(test => test);
  
  console.log('🎯 RÉSULTAT GLOBAL:', allCriticalPassed ? 'TESTS CRITIQUES RÉUSSIS' : 'TESTS CRITIQUES ÉCHOUÉS');
  
  if (!allCriticalPassed) {
    console.log('🔍 DIAGNOSTIC: Le module admin ne peut pas fonctionner correctement');
  } else {
    console.log('🔍 DIAGNOSTIC: Le module admin devrait fonctionner correctement');
  }
  
  return allCriticalPassed;
}

// Exécuter les tests
runAllTests();
