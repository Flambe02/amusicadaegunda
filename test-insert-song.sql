-- Test d'insertion d'une chanson en tant qu'admin
-- Cette requête doit fonctionner si vous êtes connecté en tant qu'admin

INSERT INTO public.songs (
  title,
  artist,
  description,
  release_date,
  status,
  tiktok_video_id,
  tiktok_url
)
VALUES (
  'Test Song - ' || NOW()::text,
  'A Música da Segunda',
  'Chanson de test pour vérifier les policies RLS',
  CURRENT_DATE,
  'draft',
  '1234567890',
  'https://www.tiktok.com/@amusicadasegunda/video/1234567890'
)
RETURNING id, title, status, created_at;

