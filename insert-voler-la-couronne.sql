-- Insérer la chanson "Voler la couronne" dans la table songs
INSERT INTO public.songs (
  title,
  artist,
  description,
  lyrics,
  release_date,
  status,
  tiktok_video_id,
  tiktok_url,
  tiktok_publication_date,
  spotify_url,
  hashtags
)
VALUES (
  'Voler la couronne',
  'A Música da Segunda',
  'Nova paródia musical sobre os acontecimentos atuais do Brasil.',
  NULL,
  CURRENT_DATE,
  'published',
  '7565206467788197131',
  'https://www.tiktok.com/@amusicadasegunda/video/7565206467788197131',
  CURRENT_DATE,
  'https://open.spotify.com/track/675jWhMufju94vMd4eM2AQ',
  ARRAY['brasil', 'política', 'paródia', 'música']
)
RETURNING id, title, status, release_date;


