-- ============================================
-- CORRECTION DE L'ALERTE SECURITY DEFINER
-- ============================================
-- Ce script corrige la vue push_subscriptions_stats
-- en la recréant SANS SECURITY DEFINER
-- ============================================

-- 1. Supprimer complètement l'ancienne vue (définie avec SECURITY DEFINER)
-- IMPORTANT: Utiliser DROP VIEW (pas CREATE OR REPLACE) pour supprimer complètement la propriété SECURITY DEFINER
DROP VIEW IF EXISTS public.push_subscriptions_stats CASCADE;

-- 2. Recréer la vue avec SECURITY INVOKER explicite (PostgreSQL 15+)
-- IMPORTANT: Utiliser CREATE VIEW (pas CREATE OR REPLACE) pour garantir qu'il n'y a pas de SECURITY DEFINER
-- IMPORTANT: Utiliser WITH (security_invoker = true) pour forcer explicitement SECURITY INVOKER
CREATE VIEW public.push_subscriptions_stats
WITH (security_invoker = true) AS
SELECT 
  COUNT(*) as total_subscriptions,
  COUNT(DISTINCT locale) as locales_count,
  COUNT(*) FILTER (WHERE 'new-song' = ANY(topics)) as new_song_subscriptions,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as subscriptions_last_7_days,
  COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '30 days') as active_subscriptions
FROM public.push_subscriptions;

-- 3. Ajouter le commentaire
COMMENT ON VIEW public.push_subscriptions_stats IS 'Statistiques sur les subscriptions push';

-- 4. Définir les permissions (optionnel - selon tes besoins)
-- Si tu veux que seuls les admins puissent voir les stats :
-- REVOKE ALL ON public.push_subscriptions_stats FROM public, anon, authenticated;
-- GRANT SELECT ON public.push_subscriptions_stats TO service_role;

-- Si tu veux que tout le monde puisse voir les stats (recommandé pour une vue de monitoring) :
GRANT SELECT ON public.push_subscriptions_stats TO authenticated, anon;

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Après l'exécution, vérifier que la vue n'a plus SECURITY DEFINER :
-- SELECT 
--   schemaname, 
--   viewname, 
--   viewowner,
--   definition
-- FROM pg_views 
-- WHERE viewname = 'push_subscriptions_stats';

-- Ou vérifier directement dans Supabase Dashboard > Security Advisor
-- L'alerte devrait disparaître après rafraîchissement
-- ============================================

