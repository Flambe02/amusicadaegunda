-- ============================================
-- SCRIPT SQL COMPLET POUR LES NOTIFICATIONS PUSH
-- ============================================
-- Ce script configure complètement la base de données
-- pour les notifications push Web Push
-- ============================================

-- 1. Activer l'extension pgcrypto pour générer des UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Créer la table push_subscriptions si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT ARRAY['new-song']::TEXT[],
  locale TEXT,
  vapid_key_version TEXT DEFAULT 'v1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Créer les index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_push_topics ON public.push_subscriptions USING GIN (topics);
CREATE INDEX IF NOT EXISTS idx_push_endpoint ON public.push_subscriptions (endpoint);
CREATE INDEX IF NOT EXISTS idx_push_locale ON public.push_subscriptions (locale);
CREATE INDEX IF NOT EXISTS idx_push_created_at ON public.push_subscriptions (created_at DESC);

-- 4. Activer Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. Supprimer les politiques existantes (si elles existent)
DROP POLICY IF EXISTS "Allow public insert access" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow public update access" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow public delete access" ON public.push_subscriptions;

-- 6. Créer la politique pour INSERT (permettre à tous d'insérer leur propre subscription)
CREATE POLICY "Allow public insert access"
ON public.push_subscriptions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 7. Créer la politique pour UPDATE (permettre à tous de mettre à jour leur subscription)
CREATE POLICY "Allow public update access"
ON public.push_subscriptions
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 8. Créer la politique pour DELETE (permettre à tous de supprimer leur subscription)
CREATE POLICY "Allow public delete access"
ON public.push_subscriptions
FOR DELETE
TO anon, authenticated
USING (true);

-- 9. Ajouter des commentaires pour la documentation
COMMENT ON TABLE public.push_subscriptions IS 'Web Push notification subscriptions for Música da Segunda PWA';
COMMENT ON COLUMN public.push_subscriptions.endpoint IS 'Unique push service endpoint URL';
COMMENT ON COLUMN public.push_subscriptions.p256dh IS 'ECDH public key for encryption';
COMMENT ON COLUMN public.push_subscriptions.auth IS 'Authentication secret for push service';
COMMENT ON COLUMN public.push_subscriptions.topics IS 'Array of topics this subscription is interested in (e.g., ["new-song"])';
COMMENT ON COLUMN public.push_subscriptions.locale IS 'User locale preference (pt-BR, fr, en)';
COMMENT ON COLUMN public.push_subscriptions.vapid_key_version IS 'VAPID key version for rotation support';

-- 10. Créer une fonction pour nettoyer les subscriptions expirées (optionnel)
CREATE OR REPLACE FUNCTION public.cleanup_expired_push_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 11. Créer une vue pour les statistiques (optionnel, utile pour le monitoring)
CREATE OR REPLACE VIEW public.push_subscriptions_stats AS
SELECT 
  COUNT(*) as total_subscriptions,
  COUNT(DISTINCT locale) as locales_count,
  COUNT(*) FILTER (WHERE 'new-song' = ANY(topics)) as new_song_subscriptions,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as subscriptions_last_7_days,
  COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '30 days') as active_subscriptions
FROM public.push_subscriptions;

COMMENT ON VIEW public.push_subscriptions_stats IS 'Statistiques sur les subscriptions push';

-- 12. Créer une fonction pour obtenir les subscriptions par topic (pour la fonction Edge)
CREATE OR REPLACE FUNCTION public.get_push_subscriptions_by_topic(topic_name TEXT)
RETURNS TABLE (
  endpoint TEXT,
  p256dh TEXT,
  auth TEXT,
  locale TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
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
-- FIN DU SCRIPT
-- ============================================
-- Vérifications à faire après l'exécution :
-- 1. Vérifier que la table existe : SELECT * FROM public.push_subscriptions LIMIT 1;
-- 2. Vérifier les politiques RLS : SELECT * FROM pg_policies WHERE tablename = 'push_subscriptions';
-- 3. Vérifier les index : SELECT * FROM pg_indexes WHERE tablename = 'push_subscriptions';
-- ============================================

