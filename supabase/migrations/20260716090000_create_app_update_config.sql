-- Contrôle de version distant (mobile + Android TV) — table app_update_config
-- Migration: 20260716090000_create_app_update_config
--
-- Additif pur : ne touche à aucune table existante. Une ligne par plateforme
-- (clé primaire = platform), lue publiquement (anon) au démarrage de l'app
-- native pour décider none/recommended/required. Écriture réservée aux admins
-- (même mécanisme que public.admins + RLS déjà utilisé par `songs`, cf.
-- supabase/scripts/fix_songs_rls_complete.sql) — jamais au rôle anon.

CREATE TABLE IF NOT EXISTS public.app_update_config (
  platform              text PRIMARY KEY
                          CHECK (platform IN ('android_mobile', 'android_tv')),
  enabled               boolean NOT NULL DEFAULT true,
  latest_version_code   integer NOT NULL,
  minimum_version_code  integer NOT NULL,
  latest_version_name   text,
  title_recommended     text,
  message_recommended   text,
  title_required        text,
  message_required      text,
  store_url             text,
  check_interval_minutes integer NOT NULL DEFAULT 360,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_update_config_minimum_lte_latest
    CHECK (minimum_version_code <= latest_version_code)
);

COMMENT ON TABLE public.app_update_config IS
  'Configuration de mise à jour distante, une ligne par plateforme (android_mobile / android_tv). Lue par src/services/appUpdateService.ts au démarrage natif. Écriture réservée aux admins (dashboard Supabase ou /admin/atualizacoes).';
COMMENT ON COLUMN public.app_update_config.latest_version_code IS 'Dernier versionCode publié sur la Google Play pour cette plateforme.';
COMMENT ON COLUMN public.app_update_config.minimum_version_code IS 'versionCode minimum encore accepté. En dessous : état "required" (bloquant). À modifier avec prudence — cf. documentation APP_UPDATE_SYSTEM.md.';
COMMENT ON COLUMN public.app_update_config.store_url IS 'Optionnel : remplace l''URL HTTPS Google Play par défaut (repli après market://). NULL = repli par défaut (com.amusicadasegunda.app).';
COMMENT ON COLUMN public.app_update_config.check_interval_minutes IS 'Fréquence minimale (en minutes) entre deux requêtes réseau. Le cache local est toujours utilisé immédiatement au démarrage.';

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.app_update_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_update_config_public_read" ON public.app_update_config;
DROP POLICY IF EXISTS "app_update_config_admin_full_access" ON public.app_update_config;

-- Lecture publique (anon + authenticated) : l'app native doit pouvoir lire
-- cette table AVANT toute authentification.
CREATE POLICY "app_update_config_public_read"
  ON public.app_update_config FOR SELECT
  TO anon, authenticated
  USING (true);

-- Écriture réservée aux admins (même pattern que songs_admin_full_access).
-- Pas de policy INSERT/UPDATE/DELETE pour anon : le rôle anon ne peut QUE lire.
CREATE POLICY "app_update_config_admin_full_access"
  ON public.app_update_config FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Seed — ⚠️ le développeur DOIT vérifier ces version codes avant chaque
-- déploiement (cf. android/app/build.gradle → versionCode/versionName).
-- Valeurs ci-dessous = versionCode 13 / versionName 1.4.4, constatés dans
-- android/app/build.gradle au moment d'écrire cette migration (2026-07-16).
-- latest = minimum ⇒ AUCUN utilisateur n'est bloqué/notifié tant que ces
-- lignes ne sont pas explicitement mises à jour (cf. APP_UPDATE_SYSTEM.md).
-- ─────────────────────────────────────────────────────────────────────────

INSERT INTO public.app_update_config (
  platform, enabled, latest_version_code, minimum_version_code, latest_version_name,
  title_recommended, message_recommended, title_required, message_required,
  store_url, check_interval_minutes
) VALUES (
  'android_mobile', true, 13, 13, '1.4.4',
  'Nova versão disponível',
  'Atualizamos A Música da Segunda com melhorias de estabilidade, navegação e karaokê.',
  'Atualização necessária',
  'Esta versão não é mais compatível. Atualize o aplicativo para continuar usando A Música da Segunda.',
  NULL, 360
) ON CONFLICT (platform) DO NOTHING;

INSERT INTO public.app_update_config (
  platform, enabled, latest_version_code, minimum_version_code, latest_version_name,
  title_recommended, message_recommended, title_required, message_required,
  store_url, check_interval_minutes
) VALUES (
  'android_tv', true, 13, 13, '1.4.4',
  'Nova versão disponível',
  'Atualizamos A Música da Segunda com melhorias de estabilidade, navegação e karaokê.',
  'Atualização necessária',
  'Esta versão não é mais compatível. Atualize o aplicativo para continuar usando A Música da Segunda.',
  NULL, 360
) ON CONFLICT (platform) DO NOTHING;
