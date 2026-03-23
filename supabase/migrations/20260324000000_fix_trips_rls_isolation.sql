-- Fix RLS isolation issue on trips table: remove the auth.role() = 'authenticated' vulnerability

-- 1. Drop the dangerous Select policy
DROP POLICY IF EXISTS "Trips Select" ON public.trips;

-- 2. Create a safe, recursion-free function to get collaborated trip IDs for the current user
CREATE OR REPLACE FUNCTION public.get_user_collaborated_trip_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER -- Bypass RLS to avoid infinite recursion
SET search_path = public
STABLE
AS $$
  SELECT trip_id FROM trip_members WHERE user_id = auth.uid();
$$;

-- 3. Recreate the strict Select policy: visible only to owner, public trips, or collaborators
CREATE POLICY "Trips Select" ON public.trips FOR SELECT USING (
  auth.uid() = user_id 
  OR is_public = true 
  OR id IN (SELECT public.get_user_collaborated_trip_ids())
);
