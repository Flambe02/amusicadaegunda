-- ===== COMPLETE ADMIN SETUP FOR MUSIC CREATION =====
-- This script completely sets up admin access for music creation

-- 1. Create admins table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admins(
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS on songs table
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- 3. Drop ALL existing policies to start clean
DROP POLICY IF EXISTS "Chansons publiques visibles par tous" ON public.songs;
DROP POLICY IF EXISTS "Gestion complète des chansons" ON public.songs;
DROP POLICY IF EXISTS "songs_public_select_published" ON public.songs;
DROP POLICY IF EXISTS "songs_admin_all" ON public.songs;
DROP POLICY IF EXISTS "songs_public_read" ON public.songs;
DROP POLICY IF EXISTS "songs_authenticated_write" ON public.songs;
DROP POLICY IF EXISTS "songs_admin_full_access" ON public.songs;
DROP POLICY IF EXISTS "songs_public_read_published" ON public.songs;

-- 4. Create the correct RLS policies

-- Policy 1: Anyone can read published songs (for public website)
CREATE POLICY "songs_public_read_published" ON public.songs
FOR SELECT
TO anon, authenticated
USING (status = 'published');

-- Policy 2: Authenticated admins can do everything
CREATE POLICY "songs_admin_full_access" ON public.songs
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

-- 5. Show current users so you can add one as admin
SELECT 'Current users in auth.users:' as info;
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- 6. Show current admins
SELECT 'Current admins:' as info;
SELECT a.user_id, u.email, a.created_at
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
ORDER BY a.created_at DESC;

-- 7. Show the policies that were created
SELECT 'RLS Policies on songs table:' as info;
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='songs'
ORDER BY policyname;

-- 8. Instructions for adding an admin user
SELECT 'To add an admin user, run this with the actual UUID:' as instruction;
SELECT 'INSERT INTO public.admins(user_id) VALUES (''USER-UUID-HERE'') ON CONFLICT (user_id) DO NOTHING;' as sql_command;
