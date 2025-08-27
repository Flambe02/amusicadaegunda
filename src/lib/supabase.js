import { createClient } from '@supabase/supabase-js'

// Configuration Supabase avec fallback pour GitHub Pages
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://efnzmpzkzeuktqkghwfa.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmbnptcHpremV1a3Rxa2dod2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzE4MzcsImV4cCI6MjA3MTgwNzgzN30.iQiDuurPIkSNjHWP6TID0dATrOCJQ71-kblcsRsHiAk'

// Vérification des variables d'environnement
const hasEnvVars = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
if (!hasEnvVars) {
  console.log('🔄 Variables d\'environnement non trouvées, utilisation des valeurs par défaut Supabase')
}

// Client Supabase (utilise les valeurs par défaut si pas d'env)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
