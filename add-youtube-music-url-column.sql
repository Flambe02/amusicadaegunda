-- 🎵 Script pour ajouter la colonne youtube_music_url à la table songs
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- Ajouter la colonne youtube_music_url si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'songs'
      AND column_name  = 'youtube_music_url'
  ) THEN
    ALTER TABLE public.songs
    ADD COLUMN youtube_music_url TEXT;
    
    RAISE NOTICE '✅ Colonne youtube_music_url ajoutée avec succès';
  ELSE
    RAISE NOTICE 'ℹ️ La colonne youtube_music_url existe déjà';
  END IF;
END $$;

-- Index optionnel pour requêtes futures (facultatif)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_songs_youtube_music_url_not_null'
  ) THEN
    CREATE INDEX idx_songs_youtube_music_url_not_null
    ON public.songs ((youtube_music_url IS NOT NULL))
    WHERE youtube_music_url IS NOT NULL;
    
    RAISE NOTICE '✅ Index créé pour youtube_music_url';
  END IF;
END $$;

-- Vérification
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'songs'
  AND column_name IN ('youtube_url', 'youtube_music_url')
ORDER BY column_name;

