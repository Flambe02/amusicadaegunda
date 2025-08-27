-- 🚀 SCRIPT DE MIGRATION INCRÉMENTALE - Música da Segunda
-- Ce script gère les données existantes et évite les conflits
-- Exécutez ce script pour synchroniser localStorage avec Supabase

-- ===== 1. VÉRIFICATION DE L'ÉTAT ACTUEL =====
SELECT '🔍 ÉTAT ACTUEL DE LA BASE' as info;

SELECT 'Chansons existantes:' as info;
SELECT id, title, artist, status, tiktok_video_id FROM songs ORDER BY id;

SELECT 'Total des chansons:' as info;
SELECT COUNT(*) as total_songs FROM songs;

-- ===== 2. MIGRATION INTELLIGENTE DES CHANSONS =====
-- Mettre à jour "Confissões Bancárias" si elle existe, sinon l'insérer
INSERT INTO songs (
  title, 
  artist, 
  description, 
  lyrics, 
  release_date, 
  status, 
  tiktok_video_id, 
  tiktok_url, 
  spotify_url, 
  apple_music_url, 
  youtube_url, 
  cover_image, 
  hashtags
) VALUES 
(
  'Confissões Bancárias',
  'A Música da Segunda',
  'Uma música sobre confissões bancárias e humor',
  'Confissões bancárias...\nNova música da segunda...',
  '2025-08-25',
  'published',
  '7540762684149517590',
  'https://www.tiktok.com/@amusicadasegunda/video/7540762684149517590',
  '',
  '',
  '',
  '',
  ARRAY['humor', 'moraes', 'bancos', 'trendingsong', 'musica']
) ON CONFLICT (tiktok_video_id) DO UPDATE SET
  title = EXCLUDED.title,
  artist = EXCLUDED.artist,
  description = EXCLUDED.description,
  lyrics = EXCLUDED.lyrics,
  release_date = EXCLUDED.release_date,
  status = EXCLUDED.status,
  tiktok_url = EXCLUDED.tiktok_url,
  spotify_url = EXCLUDED.spotify_url,
  apple_music_url = EXCLUDED.apple_music_url,
  youtube_url = EXCLUDED.youtube_url,
  cover_image = EXCLUDED.cover_image,
  hashtags = EXCLUDED.hashtags,
  updated_at = NOW();

-- ===== 3. SYNCHRONISATION DES PARAMÈTRES =====
-- Mettre à jour ou insérer les paramètres
INSERT INTO settings (key, value) VALUES 
('app_name', 'Música da Segunda'),
('version', '1.0.0'),
('last_migration', NOW()::text),
('storage_mode', 'supabase'),
('migration_date', NOW()::text)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- ===== 4. VÉRIFICATION FINALE =====
SELECT '✅ MIGRATION INCRÉMENTALE TERMINÉE' as status;

SELECT 'Chansons après migration:' as info;
SELECT id, title, artist, status, tiktok_video_id, updated_at FROM songs ORDER BY id;

SELECT 'Paramètres après migration:' as info;
SELECT key, value, updated_at FROM settings ORDER BY key;

SELECT 'Résumé de la migration:' as info;
SELECT 
  (SELECT COUNT(*) FROM songs) as total_songs,
  (SELECT COUNT(*) FROM albums) as total_albums,
  (SELECT COUNT(*) FROM settings) as total_settings;

-- ===== 5. MESSAGE DE CONFIRMATION =====
SELECT '🎉 SYNCHRONISATION TERMINÉE AVEC SUCCÈS !' as final_status;
SELECT '📱 Votre application peut maintenant utiliser Supabase sans conflits' as next_step;
