-- ============================================
-- DIAGNOSTIC DE LA VUE push_subscriptions_stats
-- ============================================
-- Ce script vérifie si la vue a vraiment SECURITY DEFINER
-- ============================================

-- 1. Vérifier les propriétés de la vue dans pg_class
SELECT 
  'Propriétés de la vue dans pg_class:' as info,
  c.relname as view_name,
  c.relkind as object_type,
  c.relowner::regrole as owner,
  CASE 
    WHEN c.relkind = 'v' THEN 'VIEW'
    ELSE 'OTHER'
  END as type_description
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'push_subscriptions_stats'
  AND n.nspname = 'public';

-- 2. Vérifier la définition complète de la vue
SELECT 
  'Définition de la vue:' as info,
  pg_get_viewdef('public.push_subscriptions_stats'::regclass, true) as view_definition;

-- 3. Vérifier les permissions sur la vue
SELECT 
  'Permissions sur la vue:' as info,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'push_subscriptions_stats'
ORDER BY grantee, privilege_type;

-- 4. Vérifier si la vue a des dépendances
SELECT 
  'Dépendances de la vue:' as info,
  dependent_ns.nspname as dependent_schema,
  dependent_view.relname as dependent_view,
  source_ns.nspname as source_schema,
  source_table.relname as source_table
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
JOIN pg_namespace dependent_ns ON dependent_view.relnamespace = dependent_ns.oid
JOIN pg_namespace source_ns ON source_table.relnamespace = source_ns.oid
WHERE source_ns.nspname = 'public'
  AND source_table.relname = 'push_subscriptions_stats';

-- 5. Vérifier les options de la vue (peut contenir security_definer)
SELECT 
  'Options de la vue:' as info,
  c.relname,
  c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'push_subscriptions_stats'
  AND n.nspname = 'public';

-- ============================================
-- NOTE: En PostgreSQL, SECURITY DEFINER pour les vues
-- n'est pas stocké dans pg_class.reloptions mais dans
-- la définition de la vue elle-même lors de la création.
-- Si CREATE VIEW est utilisé sans SECURITY DEFINER,
-- la vue ne devrait pas avoir cette propriété.
-- ============================================

