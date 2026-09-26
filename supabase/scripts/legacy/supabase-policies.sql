-- ===== POLICIES RLS POUR MÚSICA DA SEGUNDA =====
-- Objectif : Lecture publique des chansons published, écriture réservée aux admins

-- 1) Table des admins
CREATE TABLE IF NOT EXISTS public.admins(
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2) Activer RLS sur la table songs (si pas déjà fait)
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- 3) Supprimer les anciennes policies pour repartir propre
DROP POLICY IF EXISTS "songs_public_select_published" ON public.songs;
DROP POLICY IF EXISTS "songs_admin_all" ON public.songs;
DROP POLICY IF EXISTS "songs_public_read" ON public.songs;
DROP POLICY IF EXISTS "songs_authenticated_write" ON public.songs;

-- 4) Policy de lecture publique des chansons published
CREATE POLICY "songs_public_select_published" ON public.songs
FOR SELECT
TO anon, authenticated
USING (status = 'published');

-- 5) Policy d'écriture pour les admins authentifiés
CREATE POLICY "songs_admin_all" ON public.songs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid()
  )
);

-- 6) Vérifier les contraintes et indexes existants
SELECT conname, pg_get_constraintdef(oid) as def
FROM pg_constraint 
WHERE conrelid = 'public.songs'::regclass;

SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname='public' AND tablename='songs';

-- 7) Vérifier les triggers existants
SELECT t.tgname, pg_get_triggerdef(t.oid, true) as def, p.proname
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE c.relname='songs' AND NOT t.tgisinternal;

-- 8) Vérifier les policies créées
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='songs';

-- 9) Compter les chansons par statut
SELECT status, count(*) 
FROM public.songs 
GROUP BY status 
ORDER BY status;

-- 10) Ajouter l'utilisateur admin (remplacer par l'UUID réel)
-- D'abord, lister les utilisateurs pour trouver l'UUID
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Puis insérer l'UUID de l'admin (à remplacer par l'UUID réel)
-- INSERT INTO public.admins(user_id) VALUES ('<UUID-ADMIN-REEL>') ON CONFLICT DO NOTHING;
