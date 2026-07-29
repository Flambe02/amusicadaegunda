-- Guia de tom · Beta : melodia de referência (pitch-map) opcional por música.
-- Migration: 20260715120000_add_pitch_map_to_songs
--
-- ADDITIF PUR — colunas nullables, nenhuma requête `select *` existante é
-- afetada. Uma música SEM pitch-map continua a funcionar normalmente no karaokê
-- (o guia de tom simplesmente fica indisponível). Ver src/lib/pitchReference.js.
--
-- Duas formas de fornecer a referência (a app prefere o jsonb inline):
--   * pitch_map          : jsonb inline { version, notes:[{startMs,endMs,midi,confidence}] }
--   * pitch_reference_url : URL para um .json com o mesmo formato (fetch em runtime)
--
-- Rappel : songs.id é BIGINT.

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS pitch_map           jsonb,
  ADD COLUMN IF NOT EXISTS pitch_reference_url text;

COMMENT ON COLUMN public.songs.pitch_map IS
  'Melodia de referência inline (jsonb) para o Guia de tom · Beta. NULL = guia indisponível. Formato: { version:1, notes:[{startMs,endMs,midi,confidence}] }. Gerado offline por scripts/generate-pitch-map.cjs.';
COMMENT ON COLUMN public.songs.pitch_reference_url IS
  'Alternativa a pitch_map: URL para um .json com a melodia de referência. Se ambos existirem, pitch_map (inline) tem prioridade.';
