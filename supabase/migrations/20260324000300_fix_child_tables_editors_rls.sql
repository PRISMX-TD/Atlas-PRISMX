-- Fix child tables update/insert/delete permissions for editors
-- Replace the general 'has_trip_access' with 'can_edit_trip' for write operations

-- 1. Create a helper function to check if user is owner or editor
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

-- 2. TRIP MEMBERS
DROP POLICY IF EXISTS "Members Insert" ON public.trip_members;
DROP POLICY IF EXISTS "Members Update" ON public.trip_members;
DROP POLICY IF EXISTS "Members Delete" ON public.trip_members;

CREATE POLICY "Members Insert" ON public.trip_members FOR INSERT WITH CHECK (public.can_edit_trip(trip_id));
CREATE POLICY "Members Update" ON public.trip_members FOR UPDATE USING (public.can_edit_trip(trip_id));
CREATE POLICY "Members Delete" ON public.trip_members FOR DELETE USING (public.can_edit_trip(trip_id));

-- 3. LOCATIONS
DROP POLICY IF EXISTS "Locations Insert" ON public.locations;
DROP POLICY IF EXISTS "Locations Update" ON public.locations;
DROP POLICY IF EXISTS "Locations Delete" ON public.locations;

CREATE POLICY "Locations Insert" ON public.locations FOR INSERT WITH CHECK (public.can_edit_trip(trip_id));
CREATE POLICY "Locations Update" ON public.locations FOR UPDATE USING (public.can_edit_trip(trip_id));
CREATE POLICY "Locations Delete" ON public.locations FOR DELETE USING (public.can_edit_trip(trip_id));

-- 4. TRANSPORTATIONS
DROP POLICY IF EXISTS "Trans Insert" ON public.transportations;
DROP POLICY IF EXISTS "Trans Update" ON public.transportations;
DROP POLICY IF EXISTS "Trans Delete" ON public.transportations;

CREATE POLICY "Trans Insert" ON public.transportations FOR INSERT WITH CHECK (public.can_edit_trip(trip_id));
CREATE POLICY "Trans Update" ON public.transportations FOR UPDATE USING (public.can_edit_trip(trip_id));
CREATE POLICY "Trans Delete" ON public.transportations FOR DELETE USING (public.can_edit_trip(trip_id));

-- 5. ACCOMMODATIONS
DROP POLICY IF EXISTS "Acc Insert" ON public.accommodations;
DROP POLICY IF EXISTS "Acc Update" ON public.accommodations;
DROP POLICY IF EXISTS "Acc Delete" ON public.accommodations;

CREATE POLICY "Acc Insert" ON public.accommodations FOR INSERT WITH CHECK (public.can_edit_trip(trip_id));
CREATE POLICY "Acc Update" ON public.accommodations FOR UPDATE USING (public.can_edit_trip(trip_id));
CREATE POLICY "Acc Delete" ON public.accommodations FOR DELETE USING (public.can_edit_trip(trip_id));

-- 6. PHOTOS
DROP POLICY IF EXISTS "Photos Insert" ON public.photos;
DROP POLICY IF EXISTS "Photos Update" ON public.photos;
DROP POLICY IF EXISTS "Photos Delete" ON public.photos;

CREATE POLICY "Photos Insert" ON public.photos FOR INSERT WITH CHECK (public.can_edit_trip(trip_id));
CREATE POLICY "Photos Update" ON public.photos FOR UPDATE USING (public.can_edit_trip(trip_id));
CREATE POLICY "Photos Delete" ON public.photos FOR DELETE USING (public.can_edit_trip(trip_id));
