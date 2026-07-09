-- Karaoké : synchronisation manuelle des paroles avec la lecture YouTube.
--
-- On RÉUTILISE la colonne existante `lyrics` comme paroles brutes (source de la sync).
-- On ajoute seulement :
--   - lrc_content       : le fichier .lrc final ([mm:ss.xx]texte), NULL tant que non synchronisé
--   - karaoke_synced_at : date de la dernière synchronisation
--
-- Colonnes nullables SANS default → aucune requête `select *` existante n'est cassée,
-- et la policy RLS de `songs` (admins full access + public read published) reste valable.

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS lrc_content       text,
  ADD COLUMN IF NOT EXISTS karaoke_synced_at timestamptz;

COMMENT ON COLUMN public.songs.lrc_content       IS 'Paroles synchronisées au format LRC ([mm:ss.xx]texte). NULL = pas encore synchronisé. Source brute = colonne lyrics.';
COMMENT ON COLUMN public.songs.karaoke_synced_at IS 'Date de la dernière synchronisation karaoké (mise à jour à chaque sauvegarde du LRC).';

-- Index partiel : lister rapidement les chansons déjà synchronisées (usage admin + public).
CREATE INDEX IF NOT EXISTS idx_songs_karaoke_synced
  ON public.songs (karaoke_synced_at)
  WHERE lrc_content IS NOT NULL;
