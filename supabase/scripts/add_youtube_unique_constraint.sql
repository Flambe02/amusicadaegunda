-- ===== AJOUTER CONTRAINTE UNIQUE SUR YOUTUBE_URL =====
-- Ce script ajoute une contrainte UNIQUE sur youtube_url pour éviter les doublons

-- 1. Vérifier si la contrainte existe déjà
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'public.songs'::regclass 
  AND conname LIKE '%youtube%';

-- 2. Supprimer la contrainte existante si elle existe (pour éviter les erreurs)
ALTER TABLE public.songs DROP CONSTRAINT IF EXISTS songs_youtube_url_key;

-- 3. Ajouter la contrainte UNIQUE sur youtube_url (seulement pour les valeurs non-null)
-- Note: PostgreSQL permet NULL dans une colonne UNIQUE, donc plusieurs NULL sont autorisés
-- Pour forcer l'unicité seulement sur les valeurs non-null, on peut créer un index unique partiel
CREATE UNIQUE INDEX IF NOT EXISTS songs_youtube_url_unique 
ON public.songs(youtube_url) 
WHERE youtube_url IS NOT NULL AND youtube_url != '';

-- 4. Vérifier les doublons existants avant d'appliquer la contrainte
SELECT 'Doublons youtube_url existants:' as info;
SELECT youtube_url, COUNT(*) as count
FROM public.songs
WHERE youtube_url IS NOT NULL AND youtube_url != ''
GROUP BY youtube_url
HAVING COUNT(*) > 1;

-- 5. Afficher les chansons avec youtube_url pour vérification
SELECT 'Chansons avec youtube_url:' as info;
SELECT id, title, youtube_url, created_at
FROM public.songs
WHERE youtube_url IS NOT NULL AND youtube_url != ''
ORDER BY created_at DESC
LIMIT 20;

