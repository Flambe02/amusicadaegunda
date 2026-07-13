-- Rollback manuel de la migration 20260712170000_add_hybrid_timing.
-- À exécuter dans le SQL editor Supabase UNIQUEMENT si l'on veut revenir en arrière.
-- Détruit l'historique de timing et les colonnes structurées ; lrc_content reste intact.

DROP TABLE IF EXISTS public.song_timing_versions;

ALTER TABLE public.songs
  DROP COLUMN IF EXISTS timing_mode,
  DROP COLUMN IF EXISTS timing_data,
  DROP COLUMN IF EXISTS timing_version;
