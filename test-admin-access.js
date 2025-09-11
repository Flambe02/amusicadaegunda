// Script de test pour vérifier l'accès Admin
// Exécuter dans la console du navigateur sur https://www.amusicadasegunda.com

console.log('🧪 Test d\'accès Admin...');

// Test 1: Vérifier l'accès à /admin
async function testAdminAccess() {
  try {
    console.log('🔍 Test d\'accès à /admin...');
    
    const response = await fetch('/admin');
    console.log('📊 Status:', response.status);
    console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 200) {
      const text = await response.text();
      if (text.includes('Connexion Admin') || text.includes('Login')) {
        console.log('✅ Page de login affichée correctement');
        return true;
      } else if (text.includes('Admin') && text.includes('Música')) {
        console.log('✅ Page Admin accessible (utilisateur connecté)');
        return true;
      } else {
        console.log('⚠️ Page inattendue:', text.substring(0, 200));
        return false;
      }
    } else {
      console.log('❌ Erreur d\'accès:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur test admin:', error);
    return false;
  }
}

// Test 2: Vérifier l'authentification Supabase
async function testSupabaseAuth() {
  try {
    console.log('🔍 Test d\'authentification Supabase...');
    
    // Import dynamique pour éviter les erreurs de module
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Variables d\'environnement manquantes');
      return false;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Vérifier la session actuelle
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Erreur session:', error);
      return false;
    }
    
    if (session) {
      console.log('✅ Utilisateur connecté:', session.user.email);
      
      // Vérifier le statut admin
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', session.user.id)
        .single();
      
      if (adminError) {
        console.log('⚠️ Erreur vérification admin:', adminError.message);
        return false;
      }
      
      if (adminData) {
        console.log('✅ Utilisateur est admin');
        return true;
      } else {
        console.log('❌ Utilisateur n\'est pas admin');
        return false;
      }
    } else {
      console.log('ℹ️ Aucun utilisateur connecté');
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur test auth:', error);
    return false;
  }
}

// Test 3: Vérifier les policies RLS
async function testRLSPolicies() {
  try {
    console.log('🔍 Test des policies RLS...');
    
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test de lecture des chansons published (devrait fonctionner)
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('*')
      .eq('status', 'published')
      .limit(3);
    
    if (songsError) {
      console.error('❌ Erreur lecture chansons:', songsError);
      return false;
    }
    
    console.log('✅ Chansons published accessibles:', songs?.length || 0);
    return true;
  } catch (error) {
    console.error('❌ Erreur test RLS:', error);
    return false;
  }
}

// Exécuter tous les tests
async function runAllTests() {
  console.log('🚀 Démarrage des tests...');
  
  const adminAccess = await testAdminAccess();
  const authStatus = await testSupabaseAuth();
  const rlsPolicies = await testRLSPolicies();
  
  console.log('\n📊 Résultats des tests:');
  console.log('🔐 Accès Admin:', adminAccess ? '✅ OK' : '❌ KO');
  console.log('👤 Authentification:', authStatus ? '✅ OK' : '❌ KO');
  console.log('🔒 Policies RLS:', rlsPolicies ? '✅ OK' : '❌ KO');
  
  if (adminAccess && rlsPolicies) {
    console.log('\n🎉 Système Admin fonctionnel!');
    console.log('🌐 Admin: https://www.amusicadasegunda.com/admin');
  } else {
    console.log('\n⚠️ Configuration requise:');
    if (!adminAccess) console.log('- Vérifier le routage /admin');
    if (!authStatus) console.log('- Configurer l\'authentification Supabase');
    if (!rlsPolicies) console.log('- Exécuter supabase-policies.sql');
  }
}

// Démarrer les tests
runAllTests();
