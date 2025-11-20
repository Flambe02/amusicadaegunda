-- Fix unique constraint on push_subscriptions.endpoint for ON CONFLICT to work
-- Migration: 20250110000000_fix_push_subscriptions_unique_constraint

-- Check if the table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'push_subscriptions'
  ) THEN
    RAISE EXCEPTION 'La table push_subscriptions n''existe pas. Exécutez d''abord la migration 20241230000000_create_push_subscriptions.sql';
  END IF;
END $$;

-- Drop existing unique constraint/index if it exists (to avoid conflicts)
DO $$
BEGIN
  -- Drop unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'push_subscriptions_endpoint_key' 
    AND conrelid = 'public.push_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.push_subscriptions DROP CONSTRAINT push_subscriptions_endpoint_key;
  END IF;
  
  -- Drop unique index if it exists (sometimes created instead of constraint)
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'push_subscriptions_endpoint_key' 
    AND tablename = 'push_subscriptions'
  ) THEN
    DROP INDEX IF EXISTS public.push_subscriptions_endpoint_key;
  END IF;
END $$;

-- Create a proper unique constraint on endpoint
-- This is required for ON CONFLICT to work in Supabase
ALTER TABLE public.push_subscriptions 
ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);

-- Verify the constraint was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'push_subscriptions_endpoint_key' 
    AND conrelid = 'public.push_subscriptions'::regclass
  ) THEN
    RAISE EXCEPTION 'Échec de création de la contrainte UNIQUE sur endpoint';
  END IF;
END $$;

COMMENT ON CONSTRAINT push_subscriptions_endpoint_key ON public.push_subscriptions 
IS 'Unique constraint on endpoint for ON CONFLICT support in upsert operations';

