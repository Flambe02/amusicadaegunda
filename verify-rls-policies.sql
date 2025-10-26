-- Vérifier les policies RLS créées
SELECT 
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN qual::text
    ELSE 'NULL'
  END as using_condition,
  CASE 
    WHEN with_check IS NOT NULL THEN with_check::text
    ELSE 'NULL'
  END as with_check_condition
FROM pg_policies 
WHERE tablename = 'songs'
ORDER BY policyname;

