-- ===== TEST FINAL - VÉRIFICATION ÉCRITURE ADMIN =====
-- Ce script teste que les admins peuvent bien écrire sur la table songs

-- 1. Vérifier la policy "Allow admins full access"
SELECT 'Vérification de la policy:' as info;
SELECT 
  policyname,
  cmd,
  roles,
  CASE 
    WHEN cmd = 'ALL' THEN '✅ Permet toutes les opérations'
    ELSE '❌ Opération limitée'
  END as command_status,
  CASE 
    WHEN qual LIKE '%admins%' AND qual LIKE '%auth.uid()%' THEN '✅ USING correcte'
    ELSE '❌ USING incorrecte'
  END as using_status,
  CASE 
    WHEN with_check LIKE '%admins%' AND with_check LIKE '%auth.uid()%' THEN '✅ WITH CHECK correcte - INSERT/UPDATE fonctionnent'
    WHEN with_check IS NULL THEN '❌ WITH CHECK manquante - INSERT/UPDATE BLOQUÉS'
    ELSE '❌ WITH CHECK incorrecte'
  END as with_check_status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'songs'
  AND policyname = 'Allow admins full access';

-- 2. Vérifier les admins
SELECT 'Admins configurés:' as info;
SELECT 
  a.user_id, 
  u.email,
  a.created_at
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
ORDER BY a.created_at DESC;

-- 3. Instructions pour tester l'écriture
SELECT 'Pour tester l''écriture en tant qu''admin:' as instruction;
SELECT '1. Connectez-vous à l''application avec un compte admin' as step1;
SELECT '2. Allez sur la page /admin' as step2;
SELECT '3. Créez une nouvelle chanson' as step3;
SELECT '4. Vérifiez qu''elle est sauvegardée' as step4;

-- 4. Vérifier les dernières chansons créées (pour voir si l'écriture fonctionne)
SELECT 'Dernières chansons créées (pour vérifier l''écriture):' as info;
SELECT 
  id, 
  title, 
  status, 
  created_at, 
  updated_at
FROM public.songs
ORDER BY created_at DESC
LIMIT 5;

-- 5. Compter les chansons par statut
SELECT 'Chansons par statut:' as info;
SELECT 
  status, 
  COUNT(*) as count
FROM public.songs
GROUP BY status
ORDER BY status;

-- 6. Vérifier les contraintes qui pourraient bloquer
SELECT 'Contraintes sur la table songs:' as info;
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  CASE 
    WHEN contype = 'u' THEN 'UNIQUE - peut bloquer les doublons'
    WHEN contype = 'p' THEN 'PRIMARY KEY'
    WHEN contype = 'f' THEN 'FOREIGN KEY'
    ELSE 'Autre contrainte'
  END as constraint_info
FROM pg_constraint
WHERE conrelid = 'public.songs'::regclass
ORDER BY conname;

-- 7. Vérifier les indexes uniques (peuvent bloquer les doublons)
SELECT 'Indexes uniques sur youtube_url et tiktok_video_id:' as info;
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'songs'
  AND (indexdef LIKE '%youtube_url%' OR indexdef LIKE '%tiktok_video_id%')
ORDER BY indexname;

