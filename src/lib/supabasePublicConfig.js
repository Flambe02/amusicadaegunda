/**
 * Adresse et clé PUBLIQUES de Supabase — module sans dépendance, lu par le client
 * (src/lib/supabase.js) et par `vite.config.js` (requête de démarrage d'index.html) :
 * les deux résolvent ainsi exactement la même configuration.
 */

// Public, RLS-protected publishable key. Safe to ship — it is already in every
// production bundle. Used as a fallback when CI builds with a rotated-out
// legacy JWT (eyJ...) in VITE_SUPABASE_ANON_KEY so auth keeps working.
export const PUBLISHABLE_KEY_FALLBACK = 'sb_publishable_qQqLLFjAv4sk3z2eQW0-sA_59XCpAKF';
export const SUPABASE_URL_FALLBACK = 'https://efnzmpzkzeuktqkghwfa.supabase.co';

/** @param {{ VITE_SUPABASE_URL?: string, VITE_SUPABASE_ANON_KEY?: string }} env */
export function resolveSupabasePublicConfig(env = {}) {
  const envUrl = env.VITE_SUPABASE_URL;
  const envKey = env.VITE_SUPABASE_ANON_KEY;
  return {
    url: envUrl || SUPABASE_URL_FALLBACK,
    // Legacy JWT anon keys (eyJ...) were disabled by Supabase. If the env key is
    // in that legacy shape, prefer the publishable fallback.
    key: envKey && !envKey.startsWith('eyJ') ? envKey : PUBLISHABLE_KEY_FALLBACK,
  };
}
