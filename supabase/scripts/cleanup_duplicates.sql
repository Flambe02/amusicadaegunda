-- ===== NETTOYAGE DES DOUBLONS EXISTANTS =====
-- Ce script identifie et nettoie les doublons dans la table songs

-- 1. Identifier les doublons sur youtube_url
SELECT '=== DOUBLONS YOUTUBE_URL ===' as info;

SELECT 
  youtube_url, 
  COUNT(*) as count,
  array_agg(id ORDER BY id) as song_ids,
  array_agg(title ORDER BY id) as titles,
  array_agg(created_at ORDER BY id) as created_dates
FROM public.songs
WHERE youtube_url IS NOT NULL 
  AND youtube_url != ''
GROUP BY youtube_url
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 2. Identifier les doublons sur tiktok_video_id
SELECT '=== DOUBLONS TIKTOK_VIDEO_ID ===' as info;

SELECT 
  tiktok_video_id, 
  COUNT(*) as count,
  array_agg(id ORDER BY id) as song_ids,
  array_agg(title ORDER BY id) as titles,
  array_agg(created_at ORDER BY id) as created_dates
FROM public.songs
WHERE tiktok_video_id IS NOT NULL 
  AND tiktok_video_id != ''
GROUP BY tiktok_video_id
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 3. Afficher les chansons en doublon avec plus de détails (youtube_url)
SELECT '=== DÉTAILS DES DOUBLONS YOUTUBE_URL ===' as info;

WITH duplicates AS (
  SELECT youtube_url
  FROM public.songs
  WHERE youtube_url IS NOT NULL AND youtube_url != ''
  GROUP BY youtube_url
  HAVING COUNT(*) > 1
)
SELECT 
  s.id,
  s.title,
  s.youtube_url,
  s.status,
  s.created_at,
  s.updated_at,
  CASE 
    WHEN s.status = 'published' THEN '✅ CONSERVER (publiée)'
    WHEN s.created_at = (SELECT MIN(created_at) FROM public.songs WHERE youtube_url = s.youtube_url) THEN '✅ CONSERVER (plus ancienne)'
    ELSE '⚠️ CANDIDAT POUR SUPPRESSION'
  END as action
FROM public.songs s
INNER JOIN duplicates d ON s.youtube_url = d.youtube_url
ORDER BY s.youtube_url, s.created_at;

-- 4. Afficher les chansons en doublon avec plus de détails (tiktok_video_id)
SELECT '=== DÉTAILS DES DOUBLONS TIKTOK_VIDEO_ID ===' as info;

WITH duplicates AS (
  SELECT tiktok_video_id
  FROM public.songs
  WHERE tiktok_video_id IS NOT NULL AND tiktok_video_id != ''
  GROUP BY tiktok_video_id
  HAVING COUNT(*) > 1
)
SELECT 
  s.id,
  s.title,
  s.tiktok_video_id,
  s.status,
  s.created_at,
  s.updated_at,
  CASE 
    WHEN s.status = 'published' THEN '✅ CONSERVER (publiée)'
    WHEN s.created_at = (SELECT MIN(created_at) FROM public.songs WHERE tiktok_video_id = s.tiktok_video_id) THEN '✅ CONSERVER (plus ancienne)'
    ELSE '⚠️ CANDIDAT POUR SUPPRESSION'
  END as action
FROM public.songs s
INNER JOIN duplicates d ON s.tiktok_video_id = d.tiktok_video_id
ORDER BY s.tiktok_video_id, s.created_at;

-- 5. Script pour supprimer automatiquement les doublons (GARDE LA PLUS ANCIENNE)
-- ATTENTION: Exécutez d'abord les requêtes ci-dessus pour vérifier les doublons
-- Décommentez les lignes suivantes UNIQUEMENT si vous voulez supprimer automatiquement

/*
-- Supprimer les doublons youtube_url (garder la plus ancienne)
DELETE FROM public.songs
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY youtube_url ORDER BY created_at ASC, id ASC) as rn
    FROM public.songs
    WHERE youtube_url IS NOT NULL 
      AND youtube_url != ''
      AND youtube_url IN (
        SELECT youtube_url
        FROM public.songs
        WHERE youtube_url IS NOT NULL AND youtube_url != ''
        GROUP BY youtube_url
        HAVING COUNT(*) > 1
      )
  ) t
  WHERE rn > 1
  AND status != 'published'  -- Ne pas supprimer les chansons publiées
);

-- Supprimer les doublons tiktok_video_id (garder la plus ancienne)
DELETE FROM public.songs
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY tiktok_video_id ORDER BY created_at ASC, id ASC) as rn
    FROM public.songs
    WHERE tiktok_video_id IS NOT NULL 
      AND tiktok_video_id != ''
      AND tiktok_video_id IN (
        SELECT tiktok_video_id
        FROM public.songs
        WHERE tiktok_video_id IS NOT NULL AND tiktok_video_id != ''
        GROUP BY tiktok_video_id
        HAVING COUNT(*) > 1
      )
  ) t
  WHERE rn > 1
  AND status != 'published'  -- Ne pas supprimer les chansons publiées
);
*/

-- 6. Vérifier qu'il n'y a plus de doublons après nettoyage
SELECT '=== VÉRIFICATION APRÈS NETTOYAGE ===' as info;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.songs
      WHERE youtube_url IS NOT NULL AND youtube_url != ''
      GROUP BY youtube_url
      HAVING COUNT(*) > 1
    ) THEN '⚠️ Il reste des doublons youtube_url'
    ELSE '✅ Aucun doublon youtube_url'
  END as youtube_duplicates_status;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.songs
      WHERE tiktok_video_id IS NOT NULL AND tiktok_video_id != ''
      GROUP BY tiktok_video_id
      HAVING COUNT(*) > 1
    ) THEN '⚠️ Il reste des doublons tiktok_video_id'
    ELSE '✅ Aucun doublon tiktok_video_id'
  END as tiktok_duplicates_status;

-- 7. Instructions pour nettoyage manuel
SELECT '=== INSTRUCTIONS POUR NETTOYAGE MANUEL ===' as info;
SELECT '1. Examinez les résultats ci-dessus pour identifier les doublons' as step1;
SELECT '2. Pour chaque doublon, décidez quelle chanson conserver (généralement la plus ancienne ou celle publiée)' as step2;
SELECT '3. Supprimez manuellement les doublons avec:' as step3;
SELECT '   DELETE FROM public.songs WHERE id = ID_DU_DOUBLON;' as sql_example;
SELECT '4. OU décommentez les scripts automatiques dans ce fichier (lignes après "-- 5.")' as step4;
SELECT '5. Les scripts automatiques gardent la chanson la plus ancienne et ne suppriment jamais les chansons publiées' as step5;

