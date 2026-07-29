-- Migração de dados (não de esquema) — preenche `lyrics_karaoke` a partir de
-- `lyrics` para as músicas que JÁ têm karaokê publicado, para que o histórico
-- não fique "em branco" na nova coluna assim que o admin passar a usá-la.
-- Migration: 20260716170000_backfill_lyrics_karaoke_for_published
--
-- Idempotente — só toca linhas onde `lyrics_karaoke` ainda está vazia, por isso
-- pode ser corrida mais do que uma vez sem efeito adicional. NÃO apaga nem
-- altera `lyrics` (campo original, continua intocado).

UPDATE public.songs
SET lyrics_karaoke = lyrics
WHERE lyrics_karaoke IS NULL
  AND lyrics IS NOT NULL AND btrim(lyrics) <> ''
  AND lrc_content IS NOT NULL AND btrim(lrc_content) <> ''
  AND karaoke_published IS DISTINCT FROM false;
