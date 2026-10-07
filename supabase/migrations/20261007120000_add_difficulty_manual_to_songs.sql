-- Dificuldade « Automática » ou escolhida à mão (admin, campo Dificuldade).
-- Migration: 20261007120000_add_difficulty_manual_to_songs
--
-- ⚠️ Aplicar pelo painel Supabase (SQL Editor), nunca por `supabase db push`.
-- ⚠️ ORDEM: executar ESTA migração ANTES do preenchimento das 67 músicas
--    (`node scripts/backfill-difficulty.mjs --sql`). A linha UPDATE abaixo marca
--    como « manual » as músicas que JÁ têm uma dificuldade — antes do preenchimento,
--    são só as escolhidas à mão (ids 85 e 78 nas publicadas).
--
-- Até aqui `difficulty` NULL queria dizer « automática » (estimada no cliente pelo
-- número de palavras da letra) e um valor queria dizer « escolhida à mão ». Com a
-- coluna preenchida para todas as músicas (para não carregar a letra no arranque da
-- TV), é preciso outra coluna para distinguir os dois casos:
--   difficulty_manual = false → « Automática »: o admin recalcula `difficulty` a cada
--                               gravação da música (src/lib/songDifficulty.js);
--   difficulty_manual = true  → escolhida à mão: nunca substituída pelo cálculo.
--
-- ADITIVO PURO — NOT NULL com default false: nenhuma leitura existente é afetada.
-- RLS de escrita = admins (mesma policy de songs).

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS difficulty_manual boolean NOT NULL DEFAULT false;

UPDATE public.songs
  SET difficulty_manual = true
  WHERE difficulty IS NOT NULL;

COMMENT ON COLUMN public.songs.difficulty_manual IS
  'true = dificuldade escolhida à mão no admin (nunca recalculada). false = « Automática »: recalculada pela letra a cada gravação (src/lib/songDifficulty.js).';
