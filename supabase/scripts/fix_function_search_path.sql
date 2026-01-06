-- ============================================
-- CORRECTION DES FONCTIONS AVEC SEARCH_PATH MUTABLE
-- ============================================
-- Ce script corrige les fonctions pour éviter l'alerte
-- "Function Search Path Mutable" dans Security Advisor
-- ============================================

-- 1. Corriger la fonction cleanup_expired_push_subscriptions
CREATE OR REPLACE FUNCTION public.cleanup_expired_push_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Supprimer les subscriptions qui n'ont pas été mises à jour depuis 90 jours
  DELETE FROM public.push_subscriptions
  WHERE last_seen_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_push_subscriptions IS 'Supprime les subscriptions push expirées (non mises à jour depuis 90 jours)';

-- 2. Corriger la fonction get_push_subscriptions_by_topic
CREATE OR REPLACE FUNCTION public.get_push_subscriptions_by_topic(topic_name TEXT)
RETURNS TABLE (
  endpoint TEXT,
  p256dh TEXT,
  auth TEXT,
  locale TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.endpoint,
    ps.p256dh,
    ps.auth,
    ps.locale
  FROM public.push_subscriptions ps
  WHERE topic_name = ANY(ps.topics)
  ORDER BY ps.last_seen_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_push_subscriptions_by_topic IS 'Récupère les subscriptions pour un topic donné (utilisé par la fonction Edge)';

-- ============================================
-- EXPLICATION
-- ============================================
-- SET search_path = '' force l'utilisation de noms qualifiés complets
-- (schema.table) dans les fonctions, ce qui évite les problèmes de sécurité
-- liés au search_path mutable.
--
-- Avec search_path = '', toutes les références aux tables doivent être
-- qualifiées avec le schéma (ex: public.push_subscriptions au lieu de
-- juste push_subscriptions).
-- ============================================



