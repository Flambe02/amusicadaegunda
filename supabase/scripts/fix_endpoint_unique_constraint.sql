-- ============================================
-- SCRIPT DE CORRECTION RAPIDE
-- Contrainte UNIQUE manquante sur endpoint
-- ============================================
-- Ce script corrige l'erreur :
-- "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- ============================================
-- À exécuter dans l'éditeur SQL de Supabase
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

-- 2. Supprimer les contraintes/index uniques existants sur endpoint (nettoyage)
DO $$
BEGIN
  -- Supprimer la contrainte si elle existe
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'push_subscriptions_endpoint_key' 
    AND conrelid = 'public.push_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.push_subscriptions DROP CONSTRAINT push_subscriptions_endpoint_key;
    RAISE NOTICE 'Contrainte existante supprimée';
  END IF;
  
  -- Supprimer l'index unique si il existe (parfois créé à la place d'une contrainte)
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'push_subscriptions_endpoint_key' 
    AND tablename = 'push_subscriptions'
  ) THEN
    DROP INDEX IF EXISTS public.push_subscriptions_endpoint_key;
    RAISE NOTICE 'Index unique existant supprimé';
  END IF;
END $$;

-- 3. Créer la contrainte UNIQUE sur endpoint
-- Cette contrainte est REQUISE pour que ON CONFLICT fonctionne dans Supabase
ALTER TABLE public.push_subscriptions 
ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);

-- 4. Vérifier que la contrainte a été créée
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'push_subscriptions_endpoint_key' 
    AND conrelid = 'public.push_subscriptions'::regclass
  ) THEN
    RAISE NOTICE '✅ Contrainte UNIQUE créée avec succès sur push_subscriptions.endpoint';
  ELSE
    RAISE EXCEPTION '❌ Échec de création de la contrainte UNIQUE';
  END IF;
END $$;

-- 5. Afficher les informations de la contrainte
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.push_subscriptions'::regclass
  AND conname = 'push_subscriptions_endpoint_key';

