-- Fix RLS isolation issue on trips table: allow collaborators to update trips

-- Drop the old overly restrictive update policy
DROP POLICY IF EXISTS "Trips Update" ON public.trips;

-- Create a helper function to check if user is owner or editor
CREATE OR REPLACE FUNCTION public.can_edit_trip(check_trip_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trips WHERE id = check_trip_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM trip_members WHERE trip_id = check_trip_id AND user_id = auth.uid() AND role IN ('owner', 'editor')
  );
$$;

-- Recreate the Update policy: allow owner and editors to update
CREATE POLICY "Trips Update" ON public.trips FOR UPDATE USING (
  public.can_edit_trip(id)
);
