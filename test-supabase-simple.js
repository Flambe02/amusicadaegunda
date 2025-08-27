// 🔧 Script de test simple de connexion Supabase
// Exécutez ce script pour vérifier que votre configuration fonctionne

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

console.log('🔧 Test de connexion Supabase')
console.log('==============================')

// Lire le fichier .env directement
try {
  const envContent = fs.readFileSync('.env', 'utf8')
  console.log('✅ Fichier .env trouvé')
  
  // Parser les variables
  const envVars = {}
  envContent.split('\n').forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, value] = line.split('=', 2)
      envVars[key.trim()] = value.trim()
    }
  })
  
  const supabaseUrl = envVars.VITE_SUPABASE_URL
  const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Variables manquantes dans .env')
    console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
    console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌')
    process.exit(1)
  }
  
  console.log('✅ Variables d\'environnement trouvées')
  console.log('URL:', supabaseUrl)
  console.log('Clé:', supabaseAnonKey.substring(0, 20) + '...')
  
  // Créer le client Supabase
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  // Test de connexion
  console.log('\n🔌 Test de connexion...')
  
  // Test simple de connexion
  supabase
    .from('songs')
    .select('count')
    .limit(1)
    .then(({ data, error }) => {
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
      
      console.log('\n🎉 Configuration Supabase validée!')
      console.log('📋 Vous pouvez maintenant exécuter le script SQL dans Supabase')
    })
    .catch(error => {
      console.error('❌ Erreur de connexion:', error.message)
    })
  
} catch (error) {
  console.error('❌ Erreur:', error.message)
  if (error.code === 'ENOENT') {
    console.error('📝 Le fichier .env n\'existe pas')
  }
}
