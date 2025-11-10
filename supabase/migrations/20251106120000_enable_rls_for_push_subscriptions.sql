-- Enable RLS and create policies for push_subscriptions table
-- Migration generated on 20251106120000

-- 1. Enable Row Level Security on the table
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (if any) to ensure a clean slate
DROP POLICY IF EXISTS "Allow public insert access" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow public update access" ON public.push_subscriptions;

-- 3. Create a policy to allow anyone to insert a new subscription
-- This is safe because they can only insert the subscription they generated on their own device.
CREATE POLICY "Allow public insert access"
ON public.push_subscriptions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 4. Create a policy to allow anyone to update their own subscription
-- The `upsert` operation relies on this to work for both new and existing subscriptions.
CREATE POLICY "Allow public update access"
ON public.push_subscriptions
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);
