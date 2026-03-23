-- Fix RLS isolation issue on child tables (locations, accommodations, transportations, photos, trip_members)
-- Replace the dangerous auth.role() = 'authenticated' with strict checks using SECURITY DEFINER functions.

-- 1. Create a helper function to check if a user has access to a specific trip
-- (Either as owner, or as a collaborator)
CREATE OR REPLACE FUNCTION public.has_trip_access(check_trip_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER -- Bypass RLS to avoid infinite recursion
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trips WHERE id = check_trip_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM trip_members WHERE trip_id = check_trip_id AND user_id = auth.uid()
  );
$$;

-- 2. TRIP MEMBERS
DROP POLICY IF EXISTS "Members Select" ON public.trip_members;
DROP POLICY IF EXISTS "Members Insert" ON public.trip_members;
DROP POLICY IF EXISTS "Members Update" ON public.trip_members;
DROP POLICY IF EXISTS "Members Delete" ON public.trip_members;

CREATE POLICY "Members Select" ON public.trip_members FOR SELECT USING (public.has_trip_access(trip_id));
CREATE POLICY "Members Insert" ON public.trip_members FOR INSERT WITH CHECK (public.has_trip_access(trip_id));
CREATE POLICY "Members Update" ON public.trip_members FOR UPDATE USING (public.has_trip_access(trip_id));
CREATE POLICY "Members Delete" ON public.trip_members FOR DELETE USING (public.has_trip_access(trip_id));

-- 3. LOCATIONS
DROP POLICY IF EXISTS "Locations Select" ON public.locations;
DROP POLICY IF EXISTS "Locations Insert" ON public.locations;
DROP POLICY IF EXISTS "Locations Update" ON public.locations;
DROP POLICY IF EXISTS "Locations Delete" ON public.locations;

CREATE POLICY "Locations Select" ON public.locations FOR SELECT USING (
  public.has_trip_access(trip_id) OR 
  EXISTS (SELECT 1 FROM trips WHERE id = public.locations.trip_id AND is_public = true)
);
CREATE POLICY "Locations Insert" ON public.locations FOR INSERT WITH CHECK (public.has_trip_access(trip_id));
CREATE POLICY "Locations Update" ON public.locations FOR UPDATE USING (public.has_trip_access(trip_id));
CREATE POLICY "Locations Delete" ON public.locations FOR DELETE USING (public.has_trip_access(trip_id));

-- 4. TRANSPORTATIONS
DROP POLICY IF EXISTS "Trans Select" ON public.transportations;
DROP POLICY IF EXISTS "Trans Insert" ON public.transportations;
DROP POLICY IF EXISTS "Trans Update" ON public.transportations;
DROP POLICY IF EXISTS "Trans Delete" ON public.transportations;

CREATE POLICY "Trans Select" ON public.transportations FOR SELECT USING (
  public.has_trip_access(trip_id) OR 
  EXISTS (SELECT 1 FROM trips WHERE id = public.transportations.trip_id AND is_public = true)
);
CREATE POLICY "Trans Insert" ON public.transportations FOR INSERT WITH CHECK (public.has_trip_access(trip_id));
CREATE POLICY "Trans Update" ON public.transportations FOR UPDATE USING (public.has_trip_access(trip_id));
CREATE POLICY "Trans Delete" ON public.transportations FOR DELETE USING (public.has_trip_access(trip_id));

-- 5. ACCOMMODATIONS
DROP POLICY IF EXISTS "Acc Select" ON public.accommodations;
DROP POLICY IF EXISTS "Acc Insert" ON public.accommodations;
DROP POLICY IF EXISTS "Acc Update" ON public.accommodations;
DROP POLICY IF EXISTS "Acc Delete" ON public.accommodations;

CREATE POLICY "Acc Select" ON public.accommodations FOR SELECT USING (
  public.has_trip_access(trip_id) OR 
  EXISTS (SELECT 1 FROM trips WHERE id = public.accommodations.trip_id AND is_public = true)
);
CREATE POLICY "Acc Insert" ON public.accommodations FOR INSERT WITH CHECK (public.has_trip_access(trip_id));
CREATE POLICY "Acc Update" ON public.accommodations FOR UPDATE USING (public.has_trip_access(trip_id));
CREATE POLICY "Acc Delete" ON public.accommodations FOR DELETE USING (public.has_trip_access(trip_id));

-- 6. PHOTOS
DROP POLICY IF EXISTS "Photos Select" ON public.photos;
DROP POLICY IF EXISTS "Photos Insert" ON public.photos;
DROP POLICY IF EXISTS "Photos Update" ON public.photos;
DROP POLICY IF EXISTS "Photos Delete" ON public.photos;

CREATE POLICY "Photos Select" ON public.photos FOR SELECT USING (
  public.has_trip_access(trip_id) OR 
  EXISTS (SELECT 1 FROM trips WHERE id = public.photos.trip_id AND is_public = true)
);
CREATE POLICY "Photos Insert" ON public.photos FOR INSERT WITH CHECK (public.has_trip_access(trip_id));
CREATE POLICY "Photos Update" ON public.photos FOR UPDATE USING (public.has_trip_access(trip_id));
CREATE POLICY "Photos Delete" ON public.photos FOR DELETE USING (public.has_trip_access(trip_id));
