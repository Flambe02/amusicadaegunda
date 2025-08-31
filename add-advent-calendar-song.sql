-- 🎵 SCRIPT D'AJOUT - Chanson "Calendario do Advento"
-- Exécutez ce script dans l'éditeur SQL de Supabase pour ajouter la chanson spéciale

-- ===== 1. VÉRIFICATION DE L'EXISTENCE =====
SELECT '🔍 Vérification de l\'existence de la chanson...' as info;

SELECT 
  id, 
  title, 
  artist, 
  tiktok_video_id,
  status,
  release_date
FROM songs 
WHERE title ILIKE '%Calendario%' OR title ILIKE '%Advento%';

-- ===== 2. AJOUT DE LA CHANSON SPÉCIALE =====
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
) VALUES (
  'Calendário do Advento',
  'A Música da Segunda',
  'Música especial do calendário do advento musical - Uma surpresa a cada dia de dezembro',
  'Calendário do advento...\nUma surpresa a cada dia...\nDezembro chega com magia...\nMúsica para alegrar o coração...',
  '2025-12-01',
  'published',
  '7540762684149517590', -- ID de "Confissão Bancárias" pour l'exemple
  'https://www.tiktok.com/@amusicadasegunda/video/7540762684149517590',
  NULL, -- Pas encore de lien Spotify
  NULL, -- Pas encore de lien Apple Music
  NULL, -- Pas encore de lien YouTube
  NULL, -- Pas encore d'image de couverture
  ARRAY['advent', 'calendario', 'musica', 'dezembro', 'surpresa', 'natal', 'magia', 'musica-da-segunda']
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

-- ===== 3. VÉRIFICATION DE L'AJOUT =====
SELECT '✅ Vérification de l\'ajout...' as info;

SELECT 
  id, 
  title, 
  artist, 
  tiktok_video_id,
  status,
  release_date,
  hashtags
FROM songs 
WHERE title = 'Calendário do Advento';

-- ===== 4. MISE À JOUR DES MÉTADONNÉES (optionnel) =====
-- Si vous voulez utiliser une autre vidéo TikTok, modifiez ici
UPDATE songs 
SET 
  tiktok_video_id = '7540762684149517590', -- ID de "Confissão Bancárias"
  tiktok_url = 'https://www.tiktok.com/@amusicadaegunda/video/7540762684149517590',
  updated_at = NOW()
WHERE title = 'Calendário do Advento';

-- ===== 5. VÉRIFICATION FINALE =====
SELECT '🎉 VÉRIFICATION FINALE' as info;

SELECT 
  'Chanson ajoutée:' as type,
  title,
  artist,
  status,
  tiktok_video_id,
  release_date
FROM songs 
WHERE title = 'Calendário do Advento';

-- ===== 6. STATISTIQUES =====
SELECT '📊 Statistiques des chansons:' as info;

SELECT 
  COUNT(*) as total_songs,
  COUNT(CASE WHEN status = 'published' THEN 1 END) as published_songs,
  COUNT(CASE WHEN tiktok_video_id IS NOT NULL THEN 1 END) as songs_with_tiktok
FROM songs;

-- ===== 7. INFORMATIONS TECHNIQUES =====
SELECT '🔧 Informations techniques:' as info;

SELECT 
  'Base de données:' as info,
  current_database() as database_name,
  current_user as current_user,
  NOW() as execution_time;

-- ===== 8. RÉSUMÉ =====
SELECT '🎯 RÉSUMÉ DE L\'OPÉRATION' as info;

SELECT 
  CASE 
    WHEN EXISTS(SELECT 1 FROM songs WHERE title = 'Calendário do Advento') 
    THEN '✅ Chanson "Calendário do Advento" ajoutée avec succès!'
    ELSE '❌ Erreur lors de l\'ajout de la chanson'
  END as status;

SELECT 
  '📱 Utilisation:' as info,
  '1. Ouvrez le calendrier de l''avent' as step1,
  '2. Cliquez sur le jour 15 (case avec logo iOS)' as step2,
  '3. La vidéo TikTok s''ouvre en plein écran' as step3;
