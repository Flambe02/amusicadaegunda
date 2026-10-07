-- Contexto curto da música, para a tela grande (TV + computador).
-- Migration: 20261009120000_add_context_short_to_songs
--
-- ⚠️ Aplicar pelo painel Supabase (SQL Editor), nunca por `supabase db push`.
--
-- Uma ou duas frases escritas no admin (campo « Contexto curto (tela grande) »),
-- mostradas no bloco « Música da semana » e na ficha. NULL = sem texto próprio: a tela
-- mostra então o início de `description`, cortado em duas linhas.
--
-- ADITIVO PURO: coluna nullable, sem default, nenhuma linha preenchida.
-- O trigger `songs_touch_content_updated_at` não a observa (não aparece na página
-- pública da música, só na tela grande).

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS context_short text;

COMMENT ON COLUMN public.songs.context_short IS
  'Contexto curto (uma ou duas frases) para a tela grande. NULL = usa o início de description.';
