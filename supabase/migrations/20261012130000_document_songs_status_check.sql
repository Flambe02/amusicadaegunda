-- Documente la contrainte songs_status_check, présente en base mais écrite dans aucune
-- migration du dépôt (relevée le 2026-10-08 par la requête sur pg_constraint).
--
-- Idempotente : ne fait RIEN si la contrainte existe déjà — donc rien sur la base
-- actuelle. Elle ne sert qu'à faire refléter la base par le dépôt.
-- Définition relevée en base :
--   CHECK (((status)::text = ANY (ARRAY['draft', 'scheduled', 'published', 'archived'])))
--
-- Les deux autres contraintes CHECK de public.songs sont déjà dans le dépôt :
--   songs_difficulty_check → 20260712120000_add_difficulty_to_songs.sql
--   songs_category_check   → 20261012120000_add_cidades_to_songs_category_check.sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'songs_status_check' AND conrelid = 'public.songs'::regclass
  ) THEN
    ALTER TABLE public.songs ADD CONSTRAINT songs_status_check
      CHECK (status::text = ANY (ARRAY['draft', 'scheduled', 'published', 'archived']));
  END IF;
END $$;
