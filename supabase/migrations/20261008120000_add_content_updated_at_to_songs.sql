-- Data da última alteração REAL do conteúdo de uma música (sitemap <lastmod>).
-- Migration: 20261008120000_add_content_updated_at_to_songs
--
-- ⚠️ Aplicar pelo painel Supabase (SQL Editor), nunca por `supabase db push`.
--
-- `updated_at` muda a cada escrita, mesmo técnica: o preenchimento em massa de
-- `difficulty` (2026-10-07) pôs a mesma data em todas as músicas, e o sitemap anunciou
-- 69 páginas « alteradas hoje ». `content_updated_at` só muda quando um campo VISÍVEL
-- na página da música muda (título, subtítulo, descrição, letra, categoria, capa, links).
--
-- NULL = nunca alterada desde esta migração → o sitemap usa a data de lançamento.
-- Sem preenchimento das linhas existentes: as datas reais de alterações passadas não
-- existem em lugar nenhum, e inventá-las seria o mesmo erro.
--
-- ADITIVO PURO: coluna nullable, nenhuma leitura existente é afetada.

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS content_updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.songs_touch_content_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (NEW.title, NEW.subtitle, NEW.description, NEW.lyrics, NEW.category, NEW.cover_image,
      NEW.youtube_url, NEW.youtube_music_url, NEW.spotify_url, NEW.apple_music_url)
     IS DISTINCT FROM
     (OLD.title, OLD.subtitle, OLD.description, OLD.lyrics, OLD.category, OLD.cover_image,
      OLD.youtube_url, OLD.youtube_music_url, OLD.spotify_url, OLD.apple_music_url)
  THEN
    NEW.content_updated_at := pg_catalog.now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS songs_touch_content_updated_at ON public.songs;
CREATE TRIGGER songs_touch_content_updated_at
  BEFORE UPDATE ON public.songs
  FOR EACH ROW
  EXECUTE FUNCTION public.songs_touch_content_updated_at();

COMMENT ON COLUMN public.songs.content_updated_at IS
  'Última alteração real do conteúdo visível da música (trigger songs_touch_content_updated_at). NULL = inalterada desde 2026-10-08; o sitemap usa então release_date. Nunca usar updated_at para o lastmod.';
