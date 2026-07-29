-- Alternador « Publicar karaokê » no admin (Sincronizar karaokê).
-- Migration: 20260716150000_add_karaoke_published_to_songs
--
-- ADDITIF PUR — coluna nullable com default TRUE (comportamento histórico:
-- Guardar sempre publicava imediatamente). Quando false, `lrc_content`/
-- `timing_data` continuam guardados normalmente (o trabalho nunca se perde),
-- mas o karaokê deixa de aparecer no catálogo público, na página da música, na
-- Festa e na TV — ver `isKaraokePublished()` em `src/lib/lrc.js`, o único ponto
-- que decide a visibilidade pública (nunca checar `lrc_content` diretamente).
--
-- Rappel : songs.id é BIGINT ; RLS de escrita = admins (mesma policy de songs).

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS karaoke_published boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.songs.karaoke_published IS
  'Controla se o karaokê já sincronizado (lrc_content/timing_data) é visível ao público. Default true. false = rascunho: dados existem mas escondidos do site/TV/Festa.';
