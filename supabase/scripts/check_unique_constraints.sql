-- ===== VÉRIFICATION DES CONTRAINTES UNIQUE =====
-- Ce script vérifie toutes les contraintes UNIQUE sur la table songs

-- 1. Lister toutes les contraintes UNIQUE
SELECT '=== CONTRAINTES UNIQUE SUR SONGS ===' as info;

SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.songs'::regclass 
  AND contype = 'u'
ORDER BY conname;

-- 2. Lister tous les index UNIQUE
SELECT '=== INDEX UNIQUE SUR SONGS ===' as info;

SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'songs'
  AND indexdef LIKE '%UNIQUE%'
ORDER BY indexname;

-- 3. Vérifier les doublons existants pour youtube_url
SELECT '=== DOUBLONS YOUTUBE_URL ===' as info;

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

-- 4. Vérifier les doublons existants pour tiktok_video_id
SELECT '=== DOUBLONS TIKTOK_VIDEO_ID ===' as info;

SELECT 
  tiktok_video_id, 
  COUNT(*) as count,
  array_agg(id ORDER BY id) as song_ids,
  array_agg(title ORDER BY id) as titles
FROM public.songs
WHERE tiktok_video_id IS NOT NULL 
  AND tiktok_video_id != ''
GROUP BY tiktok_video_id
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 5. Vérifier les champs qui pourraient avoir des contraintes UNIQUE implicites
SELECT '=== STRUCTURE DE LA TABLE SONGS ===' as info;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'songs'
ORDER BY ordinal_position;

-- 6. Instructions pour supprimer une contrainte UNIQUE si nécessaire
SELECT '=== INSTRUCTIONS ===' as info;
SELECT 'Si une contrainte UNIQUE bloque l''insertion, vous pouvez la supprimer avec:' as instruction;
SELECT 'ALTER TABLE public.songs DROP CONSTRAINT IF EXISTS nom_de_la_contrainte;' as sql_example;
SELECT 'OU pour un index unique:' as instruction2;
SELECT 'DROP INDEX IF EXISTS nom_de_l_index;' as sql_example2;

