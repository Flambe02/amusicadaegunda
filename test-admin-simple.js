// Script de test simple pour le module admin (sans import.meta)
// Exécuter dans la console du navigateur sur http://localhost:3000/admin

console.log('🔍 TEST SIMPLE DU MODULE ADMIN - DÉBUT');

// Test 1: Vérifier la connexion Supabase
async function testSupabaseConnection() {
  console.log('🧪 Test 1: Vérification de la connexion Supabase');
  
  try {
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

// Test 2: Tester la mise à jour d'une chanson
async function testSongUpdate() {
  console.log('🧪 Test 2: Test de mise à jour de chanson');
  
  try {
    const updateData = {
      spotify_url: 'https://open.spotify.com/track/3yCXU6m1XBNAqBtS5znNmX'
    };
    
    const response = await fetch('https://efnzmpzkzeuktqkghwfa.supabase.co/rest/v1/songs?id=eq.18', {
      method: 'PATCH',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmbnptcHpremV1a3Rxa2dod2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzE4MzcsImV4cCI6MjA3MTgwNzgzN30.iQiDuurPIkSNjHWP6TID0dATrOCJQ71-kblcsRsHiAk',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmbnptcHpremV1a3Rxa2dod2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzE4MzcsImV4cCI6MjA3MTgwNzgzN30.iQiDuurPIkSNjHWP6TID0dATrOCJQ71-kblcsRsHiAk',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updateData)
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

// Test 3: Vérifier les erreurs JavaScript
function testJavaScriptErrors() {
  console.log('🧪 Test 3: Vérification des erreurs JavaScript');
  
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

// Exécuter tous les tests
async function runAllTests() {
  console.log('🧪 === DÉBUT DES TESTS SIMPLES ===');
  
  const test1 = await testSupabaseConnection();
  const test2 = await testSongUpdate();
  const test3 = testJavaScriptErrors();
  
  console.log('🧪 === RÉSULTATS DES TESTS ===');
  console.log('✅ Connexion Supabase:', test1 ? 'OK' : 'ÉCHEC');
  console.log('✅ Mise à jour chanson:', test2 ? 'OK' : 'ÉCHEC');
  console.log('✅ Erreurs JavaScript:', test3 ? 'OK' : 'ÉCHEC');
  
  const allPassed = test1 && test2 && test3;
  console.log('🎯 RÉSULTAT GLOBAL:', allPassed ? 'TOUS LES TESTS RÉUSSIS' : 'CERTAINS TESTS ONT ÉCHOUÉ');
  
  if (!allPassed) {
    console.log('🔍 DIAGNOSTIC: Le module admin ne peut pas fonctionner correctement');
  } else {
    console.log('🔍 DIAGNOSTIC: Le module admin devrait fonctionner correctement');
  }
  
  return allPassed;
}

// Exécuter les tests
runAllTests();
