-- Synchronisation hybride (frase / palavra) + historique de versions de timing.
-- Migration: 20260712170000_add_hybrid_timing
--
-- ADDITIF PUR — ne touche NI ne supprime `lrc_content` (source de compatibilité).
-- Toutes les colonnes ajoutées sont nullables/à défaut → aucune requête `select *`
-- existante n'est cassée, et les chansons actuelles continuent de jouer depuis
-- lrc_content tant que timing_data est NULL.
--
-- Rappel : songs.id est un BIGINT (cf. festa_queue.song_id BIGINT REFERENCES songs(id)).

-- ─────────────────────────────────────────────────────────────────────────
-- 1) Timing structuré optionnel sur `songs`
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS timing_mode    text    NOT NULL DEFAULT 'line',
  ADD COLUMN IF NOT EXISTS timing_data    jsonb,
  ADD COLUMN IF NOT EXISTS timing_version integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.songs.timing_mode    IS 'line | word | hybrid. Défaut line = comportement actuel (rendu depuis lrc_content).';
COMMENT ON COLUMN public.songs.timing_data    IS 'Timing structuré JSON (schemaVersion, lines[], words[] optionnel). NULL = utiliser lrc_content.';
COMMENT ON COLUMN public.songs.timing_version IS 'Version du schéma de timing structuré (commence à 1).';

-- ─────────────────────────────────────────────────────────────────────────
-- 2) Historique persistant des versions de timing (rollback) — append-only.
--    Une restauration INSÈRE une nouvelle ligne ; rien n'est jamais supprimé.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.song_timing_versions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id        bigint NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  lrc_content    text,
  timing_data    jsonb,
  timing_mode    text NOT NULL DEFAULT 'line',
  source         text NOT NULL DEFAULT 'manual_save',  -- manual_save | publish | restore | migration
  note           text,
  created_by     uuid,                                 -- auth.uid() de l'admin, quand disponible
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (song_id, version_number)
);

COMMENT ON TABLE public.song_timing_versions IS 'Historique append-only des sauvegardes de timing par chanson. Restaurer = INSÉRER une nouvelle ligne, jamais supprimer.';
COMMENT ON COLUMN public.song_timing_versions.source IS 'manual_save | publish | restore | migration — origine de la version.';

CREATE INDEX IF NOT EXISTS idx_song_timing_versions_song
  ON public.song_timing_versions (song_id, version_number DESC);

-- ─────────────────────────────────────────────────────────────────────────
-- 3) RLS — admins uniquement (même prédicat que la policy songs "Allow admins
--    full access"). L'historique de timing est une donnée back-office : pas de
--    lecture anon/public. Aucun service_role dans le navigateur.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.song_timing_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "song_timing_versions_admin_all" ON public.song_timing_versions;
CREATE POLICY "song_timing_versions_admin_all"
  ON public.song_timing_versions FOR ALL
  TO authenticated
  USING      (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
