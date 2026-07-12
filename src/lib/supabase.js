const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV;
import { createClient } from '@supabase/supabase-js'

// Public, RLS-protected publishable key. Safe to ship — it is already in every
// production bundle. Used as a fallback when CI builds with a rotated-out
// legacy JWT (eyJ...) in VITE_SUPABASE_ANON_KEY so auth keeps working.
const PUBLISHABLE_KEY_FALLBACK = 'sb_publishable_qQqLLFjAv4sk3z2eQW0-sA_59XCpAKF'
const SUPABASE_URL_FALLBACK = 'https://efnzmpzkzeuktqkghwfa.supabase.co'

const envUrl = import.meta.env?.VITE_SUPABASE_URL
const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY

const supabaseUrl = envUrl || SUPABASE_URL_FALLBACK
// Legacy JWT anon keys (eyJ...) were disabled by Supabase. If the env key is
// in that legacy shape, prefer the publishable fallback.
const supabaseAnonKey = (envKey && !envKey.startsWith('eyJ'))
  ? envKey
  : PUBLISHABLE_KEY_FALLBACK

// ⏱️ Timeout réseau pour TOUTES les requêtes Supabase. Sans ça, quand l'hôte
// Supabase est injoignable (réseau bloqué/VPN/DNS, extension de blocage, projet en
// pause, IPv6 mort…), le fetch reste pendu ~30-120 s (ERR_CONNECTION_TIMED_OUT) →
// l'app reste bloquée sur ses skeletons avant de basculer sur le catalogue statique
// (content/songs.json). Avec un abort à 7 s, l'échec est rapide et le fallback
// statique s'affiche vite. Chaîne un éventuel signal appelant (auth) pour ne pas
// casser ses propres annulations.
const SUPABASE_FETCH_TIMEOUT_MS = 7000
function fetchWithTimeout(input, init = {}) {
  if (typeof AbortController === 'undefined') return fetch(input, init)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new DOMException('Supabase request timeout', 'TimeoutError')), SUPABASE_FETCH_TIMEOUT_MS)
  const callerSignal = init.signal
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort(callerSignal.reason)
    else callerSignal.addEventListener('abort', () => controller.abort(callerSignal.reason), { once: true })
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
}

// Client Supabase avec persistance de session.
// Cache headers globaux retirés pour laisser le CDN/PostgREST gérer la cache policy.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  global: {
    fetch: fetchWithTimeout,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // Détecter la session dans l'URL (pour les redirections)
    storage: typeof window !== 'undefined' ? window.localStorage : undefined, // Utiliser localStorage en production
    storageKey: 'supabase.auth.token', // Clé de stockage pour la session
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
        isDev && console.log('✅ Connexion Supabase réussie (table songs non créée)')
        return true
      }
      throw error
    }

    isDev && console.log('✅ Connexion Supabase réussie')
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
    isDev && console.log(`📊 Supabase contient des données: ${hasData ? 'Oui' : 'Non'}`)
    return hasData
  } catch (error) {
    console.error('❌ Erreur vérification données Supabase:', error)
    return false
  }
}
