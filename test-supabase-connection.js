// 🔧 Script de test de connexion Supabase
// Exécutez ce script pour vérifier que votre configuration fonctionne

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Charger les variables d'environnement
dotenv.config()

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('🔧 Test de connexion Supabase')
console.log('==============================')

// Vérifier les variables d'environnement
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes!')
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌')
  console.error('\n📝 Créez un fichier .env avec vos clés Supabase')
  process.exit(1)
}

console.log('✅ Variables d\'environnement trouvées')
console.log('URL:', supabaseUrl)

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test de connexion
async function testConnection() {
  try {
    console.log('\n🔄 Test de connexion...')
    
    // Test 1: Connexion de base
    const { data, error } = await supabase.from('songs').select('count').limit(1)
    
    if (error) {
      console.error('❌ Erreur de connexion:', error.message)
      
      if (error.message.includes('relation "songs" does not exist')) {
        console.log('⚠️ La table "songs" n\'existe pas encore')
        console.log('📋 Exécutez le script database-check-and-fix.sql dans Supabase')
      }
      
      return false
    }
    
    console.log('✅ Connexion réussie!')
    console.log('📊 Données récupérées:', data)
    
    // Test 2: Vérifier les tables
    console.log('\n🔍 Vérification des tables...')
    const tables = await supabase.rpc('get_tables')
    console.log('Tables disponibles:', tables)
    
    return true
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error)
    return false
  }
}

// Test 3: Vérifier les permissions
async function testPermissions() {
  try {
    console.log('\n🔐 Test des permissions...')
    
    // Test d'insertion
    const testSong = {
      title: 'Test Connection',
      artist: 'Test',
      description: 'Test de connexion',
      release_date: new Date().toISOString().split('T')[0],
      status: 'draft'
    }
    
    const { data, error } = await supabase
      .from('songs')
      .insert([testSong])
      .select()
    
    if (error) {
      console.error('❌ Erreur d\'insertion:', error.message)
      return false
    }
    
    console.log('✅ Insertion réussie:', data)
    
    // Nettoyer le test
    await supabase
      .from('songs')
      .delete()
      .eq('title', 'Test Connection')
    
    console.log('🧹 Données de test nettoyées')
    return true
    
  } catch (error) {
    console.error('❌ Erreur test permissions:', error)
    return false
  }
}

// Exécuter les tests
async function runTests() {
  console.log('🚀 Démarrage des tests...\n')
  
  const connectionOk = await testConnection()
  if (!connectionOk) {
    console.log('\n❌ Tests de connexion échoués')
    process.exit(1)
  }
  
  const permissionsOk = await testPermissions()
  if (!permissionsOk) {
    console.log('\n⚠️ Tests de permissions échoués')
    console.log('📋 Vérifiez la configuration RLS dans Supabase')
  }
  
  console.log('\n🎉 Tous les tests sont terminés!')
  console.log('✅ Votre configuration Supabase fonctionne correctement')
  console.log('🔄 Vous pouvez maintenant migrer vos données localStorage')
}

// Lancer les tests
runTests().catch(console.error)
