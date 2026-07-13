-- Difficulté de chant, éditable par chanson (affichée sur l'UI TV : catálogo, fiche, cartes).
--
-- Avant cette colonne, la difficulté était UNIQUEMENT estimée côté client à partir de la
-- densité de paroles (word count) dans `src/tv/lib/songMeta.js#getDifficulty`. Cette colonne
-- permet à l'admin de FIXER une valeur par chanson qui prime sur l'estimation.
--
-- Valeurs canoniques stables (clés, indépendantes de la langue) :
--   'easy'   → « Fácil »
--   'medium' → « Médio »
--   'hard'   → « Difícil »
-- NULL = pas de valeur explicite → l'app retombe sur l'estimation automatique (word count).
--
-- Colonne nullable SANS default → aucune requête `select *` existante n'est cassée, et la
-- policy RLS de `songs` (admins full access + public read published) reste valable telle quelle.

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS difficulty text;

-- Garde-fou : seules les 3 clés canoniques (ou NULL) sont acceptées.
ALTER TABLE public.songs
  DROP CONSTRAINT IF EXISTS songs_difficulty_check;
ALTER TABLE public.songs
  ADD CONSTRAINT songs_difficulty_check
  CHECK (difficulty IS NULL OR difficulty IN ('easy', 'medium', 'hard'));

COMMENT ON COLUMN public.songs.difficulty IS 'Difficulté de chant (clé stable): easy | medium | hard. NULL = estimation automatique côté client (densité de paroles). Mappé vers Fácil/Médio/Difícil dans songMeta.getDifficulty.';
