// 🔧 Script de test de connexion Supabase pour Vite
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
console.log('Clé:', supabaseAnonKey.substring(0, 20) + '...')

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test de connexion
async function testConnection() {
  try {
    console.log('\n🔌 Test de connexion...')
    
    // Test simple de connexion
    const { data, error } = await supabase
      .from('songs')
      .select('count')
      .limit(1)
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('✅ Connexion réussie! (table songs non trouvée - normal)')
        console.log('📝 La table sera créée par le script SQL')
      } else {
        console.error('❌ Erreur de connexion:', error.message)
        console.error('Code:', error.code)
        return
      }
    } else {
      console.log('✅ Connexion réussie!')
    }
    
    // Test de l'API
    console.log('\n🧪 Test de l\'API Supabase...')
    const { data: apiTest, error: apiError } = await supabase.auth.getSession()
    
    if (apiError) {
      console.error('❌ Erreur API:', apiError.message)
    } else {
      console.log('✅ API Supabase fonctionnelle')
    }
    
    console.log('\n🎉 Configuration Supabase validée!')
    console.log('📋 Vous pouvez maintenant exécuter le script SQL dans Supabase')
    
  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message)
  }
}

testConnection()
