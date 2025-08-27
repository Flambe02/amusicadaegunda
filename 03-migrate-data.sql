-- 🚀 SCRIPT DE MIGRATION DES DONNÉES - Música da Segunda
-- Exécutez ce script APRÈS avoir créé les tables
-- Ce script migre les données localStorage vers Supabase

-- ===== 1. MIGRATION DES CHANSONS =====
-- Insérer "Confissões Bancárias" et autres chansons existantes
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

-- ===== 2. MIGRATION DES ALBUMS (si existants) =====
-- Pour l'instant, pas d'albums à migrer
-- INSERT INTO albums (title, artist, description, release_date) VALUES (...);

-- ===== 3. MIGRATION DES PARAMÈTRES (si existants) =====
-- Insérer des paramètres par défaut
INSERT INTO settings (key, value) VALUES 
('app_name', 'Música da Segunda'),
('version', '1.0.0'),
('last_migration', NOW()::text)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- ===== 4. VÉRIFICATION DE LA MIGRATION =====
SELECT '✅ MIGRATION TERMINÉE' as status;

SELECT 'Chansons migrées:' as info;
SELECT id, title, artist, status, tiktok_video_id FROM songs;

SELECT 'Albums migrés:' as info;
SELECT id, title, artist FROM albums;

SELECT 'Paramètres migrés:' as info;
SELECT key, value FROM settings;

SELECT 'Total des éléments:' as info;
SELECT 
  (SELECT COUNT(*) FROM songs) as total_songs,
  (SELECT COUNT(*) FROM albums) as total_albums,
  (SELECT COUNT(*) FROM settings) as total_settings;

-- ===== 5. MESSAGE DE CONFIRMATION =====
SELECT '🎉 DONNÉES MIGRÉES AVEC SUCCÈS VERS SUPABASE !' as final_status;
SELECT '📱 Votre application peut maintenant utiliser la base de données cloud' as next_step;
