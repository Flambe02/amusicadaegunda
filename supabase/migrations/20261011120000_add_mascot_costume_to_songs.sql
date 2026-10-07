-- Costume da mascote (Caipivara) associado a uma música.
-- Migration: 20261011120000_add_mascot_costume_to_songs
--
-- ⚠️ Aplicar pelo painel Supabase (SQL Editor), nunca por `supabase db push`.
--
-- Identificador de um costume do catálogo de animações (public/mascot/catalog.json,
-- campo `costume`, ex. bets-bets-bets). Escrito no admin (« Costume da mascote »).
-- NULL = sem costume: a Caipivara dança. Enquanto a coluna estiver vazia, o catálogo
-- pode nomear a música ele mesmo (campo `song`).
--
-- ADITIVO PURO: coluna nullable, sem default, nenhuma linha preenchida.

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS mascot_costume text;

COMMENT ON COLUMN public.songs.mascot_costume IS
  'Costume da mascote para esta música (identificador do catálogo public/mascot/catalog.json). NULL = sem costume.';
