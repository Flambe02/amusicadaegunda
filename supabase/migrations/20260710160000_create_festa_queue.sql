-- Fila de músicas por telefone (Modo Festa) — festa_sessions + festa_queue
-- Migration: 20260710160000_create_festa_queue
--
-- Additif pur : ne touche à aucune table existante (songs, lrc_content, etc.).
-- Pas d'authentification — sessions éphémères identifiées par un code partagé
-- (jamais "CPF" ni équivalent officiel, cf. spec produit).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS festa_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT UNIQUE NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  current_song_id  BIGINT REFERENCES songs(id) ON DELETE SET NULL,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE festa_sessions IS 'Session Modo Festa éphémère (téléphones ↔ TV) — identifiée par un code partagé, sans compte.';
COMMENT ON COLUMN festa_sessions.code IS 'Code court partagé (4 lettres + 2 chiffres, ex. SEGA26). Jamais dérivé d''un identifiant officiel (CPF etc).';
COMMENT ON COLUMN festa_sessions.active IS 'FALSE = session fermée (ne plus lire/écrire). Ne supprime pas la ligne.';
COMMENT ON COLUMN festa_sessions.last_activity_at IS 'Mis à jour par le trigger touch_festa_session() à chaque activité de la fila — sert au nettoyage des sessions inactives.';

CREATE TABLE IF NOT EXISTS festa_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES festa_sessions(id) ON DELETE CASCADE,
  song_id         BIGINT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  singer_name     TEXT NOT NULL CHECK (char_length(singer_name) BETWEEN 1 AND 24),
  added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'done', 'skipped')),
  applause_score  INTEGER NOT NULL DEFAULT 0 CHECK (applause_score >= 0),
  tomato_score    INTEGER NOT NULL DEFAULT 0 CHECK (tomato_score >= 0)
);

COMMENT ON TABLE festa_queue IS 'Fila de músicas envoyée par les téléphones pour une session festa_sessions donnée.';
COMMENT ON COLUMN festa_queue.status IS 'waiting → playing → done, ou skipped (retiré par l''invité — pas de suppression physique, pour garder l''historique de la soirée).';
COMMENT ON COLUMN festa_queue.applause_score IS 'Compteur d''applaudissements — incrémenté via increment_applause() (atomique, évite les pertes de clics concurrents).';
COMMENT ON COLUMN festa_queue.tomato_score IS 'Compteur de "tomates" (réaction négative/moquerie) — incrémenté via increment_tomato(), même mécanique qu''applause_score mais compteur séparé.';

CREATE INDEX IF NOT EXISTS idx_festa_queue_session_added ON festa_queue (session_id, added_at);
CREATE INDEX IF NOT EXISTS idx_festa_queue_session_status ON festa_queue (session_id, status);

-- ─────────────────────────────────────────────────────────────────────────
-- Trigger : touche last_activity_at à chaque insert/update de la fila
-- (évite de dépendre d'un appel client dédié pour le nettoyage plus bas).
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_festa_session() RETURNS TRIGGER AS $$
BEGIN
  UPDATE festa_sessions SET last_activity_at = NOW() WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_festa_session ON festa_queue;
CREATE TRIGGER trg_touch_festa_session
  AFTER INSERT OR UPDATE ON festa_queue
  FOR EACH ROW EXECUTE FUNCTION touch_festa_session();

-- ─────────────────────────────────────────────────────────────────────────
-- RLS — pas d'authentification dans ce produit : la sécurité repose sur le
-- code de session (partagé en direct, usage familial de confiance — limite
-- documentée dans la spec) plutôt que sur une identité vérifiée. Les policies
-- ci-dessous bornent la portée à la session ACTIVE correspondante, mais ne
-- distinguent pas "mon" invité d'un autre (le retrait "ma propre entrée" côté
-- téléphone est un contrôle d'UI, pas une garantie DB).
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE festa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE festa_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "festa_sessions_select_active" ON festa_sessions;
DROP POLICY IF EXISTS "festa_sessions_insert_any" ON festa_sessions;
DROP POLICY IF EXISTS "festa_sessions_update_active" ON festa_sessions;

-- Lecture : seulement les sessions actives (empêche de lister/consulter des
-- sessions fermées/anciennes par code deviné une fois la fête finie).
CREATE POLICY "festa_sessions_select_active"
  ON festa_sessions FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Création : la TV crée une session sans compte (anon key), donc INSERT public.
CREATE POLICY "festa_sessions_insert_any"
  ON festa_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Mise à jour : uniquement sur une session encore active (current_song_id,
-- ou active=false pour la fermer). Une fois fermée, plus aucune écriture
-- possible via cette policy (USING relit l'état AVANT la modification).
CREATE POLICY "festa_sessions_update_active"
  ON festa_sessions FOR UPDATE
  TO anon, authenticated
  USING (active = true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "festa_queue_select_active_session" ON festa_queue;
DROP POLICY IF EXISTS "festa_queue_insert_active_session" ON festa_queue;
DROP POLICY IF EXISTS "festa_queue_update_active_session" ON festa_queue;

CREATE POLICY "festa_queue_select_active_session"
  ON festa_queue FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM festa_sessions fs WHERE fs.id = festa_queue.session_id AND fs.active = true
  ));

CREATE POLICY "festa_queue_insert_active_session"
  ON festa_queue FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM festa_sessions fs WHERE fs.id = festa_queue.session_id AND fs.active = true
  ));

-- UPDATE (status, applause_score) — pas de policy DELETE : le retrait d'une
-- entrée par un invité se fait via status='skipped', jamais une suppression
-- physique (garde l'historique, évite d'avoir à ouvrir une policy DELETE).
CREATE POLICY "festa_queue_update_active_session"
  ON festa_queue FOR UPDATE
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM festa_sessions fs WHERE fs.id = festa_queue.session_id AND fs.active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM festa_sessions fs WHERE fs.id = festa_queue.session_id AND fs.active = true
  ));

-- ─────────────────────────────────────────────────────────────────────────
-- RPC : incrément atomique des applaudissements (évite les pertes de clics
-- si plusieurs téléphones applaudissent en même temps sur la même ligne).
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_applause(p_queue_id UUID) RETURNS INTEGER AS $$
DECLARE
  new_score INTEGER;
BEGIN
  UPDATE festa_queue
  SET applause_score = applause_score + 1
  WHERE id = p_queue_id
    AND EXISTS (
      SELECT 1 FROM festa_sessions fs WHERE fs.id = festa_queue.session_id AND fs.active = true
    )
  RETURNING applause_score INTO new_score;
  RETURN new_score;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION increment_applause(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION increment_tomato(p_queue_id UUID) RETURNS INTEGER AS $$
DECLARE
  new_score INTEGER;
BEGIN
  UPDATE festa_queue
  SET tomato_score = tomato_score + 1
  WHERE id = p_queue_id
    AND EXISTS (
      SELECT 1 FROM festa_sessions fs WHERE fs.id = festa_queue.session_id AND fs.active = true
    )
  RETURNING tomato_score INTO new_score;
  RETURN new_score;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION increment_tomato(UUID) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Nettoyage — pas de cron automatique dans cette première version (aucune
-- infra de scheduling supplémentaire requise par la spec). À exécuter
-- manuellement depuis le SQL editor Supabase de temps en temps, ou à
-- brancher plus tard sur pg_cron / une Edge Function planifiée :
--   select cleanup_stale_festa_sessions();
-- Ferme (active=false) les sessions sans activité depuis 6h — ne supprime
-- rien (les lignes restent disponibles pour un éventuel historique/debug).
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cleanup_stale_festa_sessions() RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE festa_sessions
  SET active = false
  WHERE active = true
    AND last_activity_at < NOW() - INTERVAL '6 hours';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────
-- Realtime — active la réplication logique pour que Supabase Realtime
-- (postgres_changes) puisse notifier les téléphones/la TV. Idempotent :
-- ne réajoute pas une table déjà présente dans la publication.
-- ─────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'festa_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.festa_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'festa_queue'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.festa_queue;
  END IF;
END $$;
