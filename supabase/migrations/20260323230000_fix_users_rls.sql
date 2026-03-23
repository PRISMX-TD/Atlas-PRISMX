-- Fix users table RLS policies
-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Recreate it to ensure it works for both USING and WITH CHECK
CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);