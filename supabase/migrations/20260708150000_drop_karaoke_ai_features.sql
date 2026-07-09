-- Retrait complet du mode « brouillon IA » (Whisper) : l'alignement automatique
-- s'est révélé peu fiable en usage réel (lignes décalées de plusieurs dizaines de
-- secondes). On revient au seul outil de synchronisation manuelle.
--
-- Annule supabase/migrations/20260708130000_add_karaoke_ai_draft.sql
-- et         supabase/migrations/20260708140000_add_karaoke_ai_jobs.sql

DROP TRIGGER IF EXISTS trg_karaoke_ai_jobs_updated_at ON public.karaoke_ai_jobs;
DROP FUNCTION IF EXISTS public.set_karaoke_ai_jobs_updated_at();
DROP TABLE IF EXISTS public.karaoke_ai_jobs;

ALTER TABLE public.songs
  DROP COLUMN IF EXISTS karaoke_ai_draft,
  DROP COLUMN IF EXISTS karaoke_ai_raw_transcript;
