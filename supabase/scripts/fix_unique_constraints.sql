-- ===== CORRECTION DES CONTRAINTES UNIQUE PROBLÉMATIQUES =====
-- Ce script identifie et supprime les contraintes/index UNIQUE qui bloquent l'insertion

-- 1. Lister toutes les contraintes UNIQUE
SELECT '=== CONTRAINTES UNIQUE À SUPPRIMER ===' as info;

SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.songs'::regclass 
  AND contype = 'u'
ORDER BY conname;

-- 2. Lister tous les index UNIQUE
SELECT '=== INDEX UNIQUE À SUPPRIMER ===' as info;

SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'songs'
  AND indexdef LIKE '%UNIQUE%'
ORDER BY indexname;

-- 3. SUPPRIMER les contraintes UNIQUE problématiques sur youtube_url
-- (Garder seulement tiktok_video_id qui est dans le schéma original)

-- Supprimer la contrainte UNIQUE sur youtube_url si elle existe
ALTER TABLE public.songs DROP CONSTRAINT IF EXISTS songs_youtube_url_key;
ALTER TABLE public.songs DROP CONSTRAINT IF EXISTS songs_youtube_url_unique;

-- Supprimer les index UNIQUE sur youtube_url
DROP INDEX IF EXISTS songs_youtube_url_unique;
DROP INDEX IF EXISTS idx_songs_youtube_url_unique;

-- 4. Vérifier les doublons existants AVANT de supprimer les contraintes
SELECT '=== DOUBLONS EXISTANTS (à nettoyer si nécessaire) ===' as info;

SELECT 
  youtube_url, 
  COUNT(*) as count,
  array_agg(id ORDER BY id) as song_ids,
  array_agg(title ORDER BY id) as titles
FROM public.songs
WHERE youtube_url IS NOT NULL 
  AND youtube_url != ''
GROUP BY youtube_url
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 5. Vérifier l'état après suppression
SELECT '=== ÉTAT APRÈS SUPPRESSION ===' as info;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'public.songs'::regclass 
        AND contype = 'u'
        AND conname LIKE '%youtube%'
    ) THEN '⚠️ Contrainte UNIQUE youtube_url existe encore'
    ELSE '✅ Aucune contrainte UNIQUE sur youtube_url'
  END as youtube_constraint_status;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'songs'
        AND indexdef LIKE '%UNIQUE%'
        AND indexname LIKE '%youtube%'
    ) THEN '⚠️ Index UNIQUE youtube_url existe encore'
    ELSE '✅ Aucun index UNIQUE sur youtube_url'
  END as youtube_index_status;

-- 6. Vérifier que tiktok_video_id garde sa contrainte UNIQUE (c'est normal)
SELECT '=== VÉRIFICATION TIKTOK_VIDEO_ID (doit rester UNIQUE) ===' as info;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'public.songs'::regclass 
        AND contype = 'u'
        AND conname LIKE '%tiktok%'
    ) THEN '✅ Contrainte UNIQUE tiktok_video_id existe (normal)'
    ELSE '⚠️ Contrainte UNIQUE tiktok_video_id manquante'
  END as tiktok_constraint_status;

-- 7. Instructions finales
SELECT '=== INSTRUCTIONS ===' as info;
SELECT '1. Les contraintes/index UNIQUE sur youtube_url ont été supprimés' as step1;
SELECT '2. La contrainte UNIQUE sur tiktok_video_id est conservée (normal)' as step2;
SELECT '3. Vous pouvez maintenant créer des chansons avec la même URL YouTube' as step3;
SELECT '4. Si vous avez des doublons existants, nettoyez-les manuellement si nécessaire' as step4;

