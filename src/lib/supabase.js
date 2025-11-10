import { createClient } from '@supabase/supabase-js'

// Configuration Supabase - variables d'environnement obligatoires
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY

// Vérification des variables d'environnement
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables d\'environnement Supabase manquantes: VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont obligatoires')
}

// Client Supabase avec options pour désactiver le cache
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }
})

// Configuration des tables
export const TABLES = {
  SONGS: 'songs',
  ALBUMS: 'albums',
  SETTINGS: 'settings'
}

// Fonctions utilitaires
export const handleSupabaseError = (error, context = 'Supabase operation') => {
  console.error(`❌ ${context}:`, error)
  throw new Error(`${context}: ${error.message}`)
}

// Vérifier la connexion et l'état de la base
export const checkConnection = async () => {
  try {
    // Vérifier la connexion en testant une requête simple
    const { data, error } = await supabase.from(TABLES.SONGS).select('count').limit(1)
    
    if (error) {
      // Si la table n'existe pas, c'est normal au début
      if (error.code === 'PGRST116') {
        console.log('✅ Connexion Supabase réussie (table songs non créée)')
        return true
      }
      throw error
    }

    console.log('✅ Connexion Supabase réussie')
    return true
  } catch (error) {
    console.error('❌ Erreur de connexion Supabase:', error)
    return false
  }
}

// Vérifier si Supabase contient des données
export const checkSupabaseData = async () => {
  try {
    const { data, error } = await supabase.from(TABLES.SONGS).select('id').limit(1)
    if (error) throw error
    
    const hasData = data && data.length > 0
    console.log(`📊 Supabase contient des données: ${hasData ? 'Oui' : 'Non'}`)
    return hasData
  } catch (error) {
    console.error('❌ Erreur vérification données Supabase:', error)
    return false
  }
}
