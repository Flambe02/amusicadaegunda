-- ============================================
-- CRÉER UN INDEX UNIQUE SUR ENDPOINT
-- ============================================
-- PostgREST reconnaît parfois mieux les index UNIQUE
-- que les contraintes UNIQUE pour onConflict
-- ============================================

-- 1. Vérifier que la table existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'push_subscriptions'
  ) THEN
    RAISE EXCEPTION 'La table push_subscriptions n''existe pas.';
  END IF;
END $$;

-- 2. Supprimer l'index UNIQUE s'il existe déjà (pour éviter les doublons)
DROP INDEX IF EXISTS public.push_subscriptions_endpoint_idx;

-- 3. Créer un index UNIQUE explicite sur endpoint
-- PostgREST reconnaît mieux les index UNIQUE que les contraintes UNIQUE
CREATE UNIQUE INDEX push_subscriptions_endpoint_idx 
ON public.push_subscriptions (endpoint);

-- 4. Vérifier que l'index a été créé
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'push_subscriptions_endpoint_idx' 
    AND tablename = 'push_subscriptions'
  ) THEN
    RAISE NOTICE '✅ Index UNIQUE créé avec succès sur push_subscriptions.endpoint';
  ELSE
    RAISE EXCEPTION '❌ Échec de création de l''index UNIQUE';
  END IF;
END $$;

-- 5. Afficher les informations de l'index
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'push_subscriptions'
  AND indexname = 'push_subscriptions_endpoint_idx';

-- Note: La contrainte UNIQUE existante peut coexister avec l'index UNIQUE
-- L'index UNIQUE devrait être reconnu par PostgREST pour onConflict

