-- « Nota da semana » : 🔥 / 😂 / 😐 sur la chanson de la semaine.
-- Migration: 20261115120000_create_song_reactions
--
-- ⚠️ Aplicar pelo painel Supabase (SQL Editor), nunca por `supabase db push`.
-- Idempotente : pode ser executada mais de uma vez.
--
-- Um voto por aparelho e por música (identificador aleatório guardado no aparelho,
-- sem conta), que pode ser trocado. A tabela não é acessível diretamente : RLS ativo
-- SEM nenhuma regra, e nenhum privilégio para anon/authenticated. Tudo passa por três
-- funções SECURITY DEFINER :
--   - song_reaction_counts(song_id)        → {"fogo":n,"risada":n,"meh":n}
--   - vote_song_reaction(song_id, device, reaction) → mesmos totais, depois do voto
--     (recusado se não for a música da semana)
--   - song_reaction_totals()               → painel do admin, só usuário logado
-- Os resultados são devolvidos em jsonb (e não em colunas OUT) para evitar, em
-- plpgsql, a ambiguidade entre uma coluna OUT `reaction` e a coluna da tabela.

CREATE TABLE IF NOT EXISTS public.song_reactions (
  song_id    bigint      NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  device_id  uuid        NOT NULL,
  reaction   text        NOT NULL CHECK (reaction IN ('fogo', 'risada', 'meh')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (song_id, device_id)
);

ALTER TABLE public.song_reactions ENABLE ROW LEVEL SECURITY;

-- Nenhuma regra de acesso (de propósito) : nem leitura nem escrita direta.
REVOKE ALL ON TABLE public.song_reactions FROM PUBLIC;
REVOKE ALL ON TABLE public.song_reactions FROM anon, authenticated;

-- Totais de uma música (zeros se ainda não houver votos).
CREATE OR REPLACE FUNCTION public.song_reaction_counts(p_song_id bigint)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'fogo',   count(*) FILTER (WHERE r.reaction = 'fogo'),
    'risada', count(*) FILTER (WHERE r.reaction = 'risada'),
    'meh',    count(*) FILTER (WHERE r.reaction = 'meh')
  )
  FROM public.song_reactions AS r
  WHERE r.song_id = p_song_id;
$$;

-- Voto (ou troca de voto) de um aparelho ; devolve os totais atualizados.
CREATE OR REPLACE FUNCTION public.vote_song_reaction(p_song_id bigint, p_device_id uuid, p_reaction text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_reaction IS NULL OR p_reaction NOT IN ('fogo', 'risada', 'meh') THEN
    RAISE EXCEPTION 'invalid reaction' USING ERRCODE = '22023';
  END IF;

  IF p_device_id IS NULL THEN
    RAISE EXCEPTION 'missing device id' USING ERRCODE = '22023';
  END IF;

  -- Só a música da semana : a publicada mais recente (mesma regra do site,
  -- Song.getCurrentLite : status 'published', release_date mais recente).
  IF NOT EXISTS (
    SELECT 1 FROM public.songs AS s
    WHERE s.id = p_song_id
      AND s.status = 'published'
      AND s.release_date = (
        SELECT max(w.release_date) FROM public.songs AS w WHERE w.status = 'published'
      )
  ) THEN
    RAISE EXCEPTION 'not the song of the week' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.song_reactions AS sr (song_id, device_id, reaction)
  VALUES (p_song_id, p_device_id, p_reaction)
  ON CONFLICT (song_id, device_id)
  DO UPDATE SET reaction = EXCLUDED.reaction, updated_at = now();

  RETURN public.song_reaction_counts(p_song_id);
END;
$$;

-- Painel do admin (só usuário logado) : uma linha por música que recebeu pelo menos um voto
-- (junção interna : nenhum título de rascunho é exposto), da mais recente à mais antiga.
CREATE OR REPLACE FUNCTION public.song_reaction_totals()
RETURNS TABLE (song_id bigint, title text, fogo bigint, risada bigint, meh bigint, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.title::text,
    count(*) FILTER (WHERE r.reaction = 'fogo'),
    count(*) FILTER (WHERE r.reaction = 'risada'),
    count(*) FILTER (WHERE r.reaction = 'meh'),
    count(*)
  FROM public.song_reactions AS r
  JOIN public.songs AS s ON s.id = r.song_id
  GROUP BY s.id, s.title, s.release_date
  ORDER BY s.release_date DESC NULLS LAST, s.id DESC;
$$;

REVOKE ALL ON FUNCTION public.song_reaction_counts(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vote_song_reaction(bigint, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.song_reaction_totals() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.song_reaction_counts(bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vote_song_reaction(bigint, uuid, text) TO anon, authenticated;
-- Resultados completos : só o admin logado (o público vê os totais de UMA música,
-- depois de votar, por song_reaction_counts).
REVOKE ALL ON FUNCTION public.song_reaction_totals() FROM anon;
GRANT EXECUTE ON FUNCTION public.song_reaction_totals() TO authenticated;
