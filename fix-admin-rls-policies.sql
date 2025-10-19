-- ===== FIX ADMIN RLS POLICIES FOR MUSIC CREATION =====
-- This script fixes the RLS policy conflicts preventing admin music creation

-- 1. Check current policies on songs table
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='songs';

-- 2. Drop ALL existing policies on songs table to start clean
DROP POLICY IF EXISTS "Chansons publiques visibles par tous" ON public.songs;
DROP POLICY IF EXISTS "Gestion complète des chansons" ON public.songs;
DROP POLICY IF EXISTS "songs_public_select_published" ON public.songs;
DROP POLICY IF EXISTS "songs_admin_all" ON public.songs;
DROP POLICY IF EXISTS "songs_public_read" ON public.songs;
DROP POLICY IF EXISTS "songs_authenticated_write" ON public.songs;

-- 3. Ensure admins table exists and is properly configured
CREATE TABLE IF NOT EXISTS public.admins(
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create the correct RLS policies for songs table

-- Policy 1: Public can read published songs
CREATE POLICY "songs_public_read_published" ON public.songs
FOR SELECT
TO anon, authenticated
USING (status = 'published');

-- Policy 2: Authenticated admins can do everything (SELECT, INSERT, UPDATE, DELETE)
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

-- 5. Verify the policies are created correctly
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='songs'
ORDER BY policyname;

-- 6. Check if there are any admin users
SELECT a.user_id, u.email, a.created_at
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
ORDER BY a.created_at DESC;

-- 7. If no admin users exist, show how to add one
-- First, list all users to get their UUIDs:
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- Then add an admin (replace 'USER-UUID-HERE' with actual UUID):
-- INSERT INTO public.admins(user_id) VALUES ('USER-UUID-HERE') ON CONFLICT (user_id) DO NOTHING;

-- 8. Test the policies work
-- This should work for authenticated admin users:
-- SELECT * FROM public.songs LIMIT 5;
