-- Fechar uma sessão do Modo Festa (botão « Encerrar Festa » da TV, saída da sala).
-- Migration: 20261010120000_add_end_festa_session_function
--
-- ⚠️ Aplicar pelo painel Supabase (SQL Editor), nunca por `supabase db push`.
--
-- Um UPDATE direto `active = false` é recusado pelas regras de acesso: a linha
-- fechada deixa de ser visível pela regra de leitura « sessões ativas », e o Postgres
-- rejeita a escrita (« new row violates row-level security policy »). Resultado: desde
-- julho de 2026 nenhuma sessão foi fechada pela app.
--
-- Esta função fecha UMA sessão pelo seu id (uuid, impossível de adivinhar). Só passa
-- `active` de true para false: não lê nem altera mais nada.

CREATE OR REPLACE FUNCTION public.end_festa_session(p_session_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.festa_sessions SET active = false WHERE id = p_session_id AND active = true;
$$;

REVOKE ALL ON FUNCTION public.end_festa_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.end_festa_session(uuid) TO anon, authenticated;
