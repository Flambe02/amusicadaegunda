// Script de test pour vérifier la configuration Supabase
// Exécuter dans la console du navigateur sur https://www.amusicadasegunda.com

console.log('🧪 Test de configuration Supabase...');

// Test 1: Vérifier les variables d'environnement
console.log('📋 Variables d\'environnement:');
console.log('VITE_SUPABASE_URL:', import.meta.env?.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env?.VITE_SUPABASE_ANON_KEY ? 'Défini' : 'Non défini');

// Test 2: Tester la connexion Supabase
async function testSupabaseConnection() {
  try {
    console.log('🔌 Test de connexion Supabase...');
    
    // Import dynamique pour éviter les erreurs de module
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variables d\'environnement manquantes');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test de lecture des chansons published
    console.log('📖 Test de lecture des chansons published...');
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('*')
      .eq('status', 'published')
      .limit(5);
    
    if (songsError) {
      console.error('❌ Erreur lecture chansons:', songsError);
      return false;
    }
    
    console.log('✅ Chansons published trouvées:', songs?.length || 0);
    console.log('📊 Données:', songs);
    
    // Test de la chanson actuelle
    console.log('🎯 Test de la chanson actuelle...');
    const { data: currentSong, error: currentError } = await supabase
      .from('songs')
      .select('*')
      .eq('status', 'published')
      .order('tiktok_publication_date', { ascending: false, nullsFirst: false })
      .order('release_date', { ascending: false, nullsFirst: false })
      .limit(1)
      .single();
    
    if (currentError) {
      console.error('❌ Erreur chanson actuelle:', currentError);
    } else {
      console.log('✅ Chanson actuelle:', currentSong);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Erreur test Supabase:', error);
    return false;
  }
}

// Test 3: Vérifier le Service Worker
function testServiceWorker() {
  console.log('🔧 Test du Service Worker...');
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      console.log('📱 Service Workers enregistrés:', registrations.length);
      registrations.forEach((registration, index) => {
        console.log(`SW ${index + 1}:`, registration.scope);
      });
    });
  } else {
    console.log('⚠️ Service Worker non supporté');
  }
}

// Exécuter les tests
testSupabaseConnection().then(success => {
  if (success) {
    console.log('✅ Configuration Supabase OK');
  } else {
    console.log('❌ Configuration Supabase KO');
  }
});

testServiceWorker();

console.log('🧪 Tests terminés - Vérifiez les résultats ci-dessus');
