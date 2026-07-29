-- Coluna « lyrics_karaoke » — versão da letra com espaçamento revisto entre
-- palavras, editável a partir de « Sincronizar karaokê » → « Guardar letra ».
-- Migration: 20260716160000_add_lyrics_karaoke_to_songs
--
-- ADDITIF PUR — coluna nullable. `songs.lyrics` (campo original) NUNCA é escrito
-- pelo editor de karaokê a partir de agora — fica intocado, exatamente como
-- estava. `lyrics_karaoke` é a fonte preferida tanto para leitura pública
-- (diálogos/drawers de letra) como para a sincronização karaokê — ver
-- `resolveLyricsText()` em `src/lib/lrc.js`, o único ponto que decide qual
-- texto usar (cai para `lyrics` enquanto `lyrics_karaoke` estiver vazio).
--
-- Rappel : songs.id é BIGINT ; RLS de escrita = admins (mesma policy de songs).

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS lyrics_karaoke text;

COMMENT ON COLUMN public.songs.lyrics_karaoke IS
  'Letra com espaçamento revisto entre palavras, editada a partir de Sincronizar karaokê. Fonte preferida para leitura pública e sincronização; cai para lyrics quando vazia. A coluna lyrics original nunca é escrita a partir daqui.';
