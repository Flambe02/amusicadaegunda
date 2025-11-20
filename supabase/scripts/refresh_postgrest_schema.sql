-- ============================================
-- SCRIPT DE RAFRAÎCHISSEMENT DU SCHÉMA POSTGREST
-- ============================================
-- Parfois PostgREST ne reconnaît pas immédiatement
-- les contraintes UNIQUE. Ce script force un refresh.
-- ============================================

-- 1. Vérifier que la contrainte existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'push_subscriptions_endpoint_key' 
    AND conrelid = 'public.push_subscriptions'::regclass
  ) THEN
    RAISE EXCEPTION 'La contrainte push_subscriptions_endpoint_key n''existe pas. Exécutez d''abord fix_endpoint_unique_constraint.sql';
  END IF;
END $$;

-- 2. Recréer la contrainte pour forcer PostgREST à la reconnaître
-- (Parfois PostgREST a besoin que la contrainte soit recréée pour la détecter)
DO $$
BEGIN
  -- Supprimer temporairement
  ALTER TABLE public.push_subscriptions 
  DROP CONSTRAINT IF EXISTS push_subscriptions_endpoint_key;
  
  -- Recréer immédiatement
  ALTER TABLE public.push_subscriptions 
  ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);
  
  RAISE NOTICE '✅ Contrainte recréée - PostgREST devrait maintenant la reconnaître';
END $$;

-- 3. Vérifier que la contrainte est bien là
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.push_subscriptions'::regclass
  AND conname = 'push_subscriptions_endpoint_key';

-- 4. Note: PostgREST devrait automatiquement rafraîchir son schéma
-- Si le problème persiste, redémarrez le projet Supabase ou attendez quelques minutes

