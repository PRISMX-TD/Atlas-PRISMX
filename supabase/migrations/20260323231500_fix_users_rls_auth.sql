-- Need to give users table proper policies
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- We can also recreate the insert just in case
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Allow update
CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow insert
CREATE POLICY "Users can insert their own profile" 
ON public.users 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);
