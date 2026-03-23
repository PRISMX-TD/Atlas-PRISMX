-- 1. Create SECURITY DEFINER functions to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.check_trip_access(check_trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_accessible boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM trips WHERE id = check_trip_id AND (user_id = auth.uid() OR is_public = true)
  ) OR EXISTS (
    SELECT 1 FROM trip_members WHERE trip_id = check_trip_id AND user_id = auth.uid()
  ) INTO is_accessible;
  RETURN is_accessible;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_trip_edit_access(check_trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_accessible boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM trips WHERE id = check_trip_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM trip_members WHERE trip_id = check_trip_id AND user_id = auth.uid() AND role IN ('owner', 'editor')
  ) INTO is_accessible;
  RETURN is_accessible;
END;
$$;

-- 2. Drop recursive policies from previous migrations
DROP POLICY IF EXISTS "Users can view trips they collaborate on" ON public.trips;
DROP POLICY IF EXISTS "Collaborators can update trips" ON public.trips;

DROP POLICY IF EXISTS "Users can view members of trips they have access to" ON public.trip_members;
DROP POLICY IF EXISTS "Editors and owners can manage members" ON public.trip_members;

DROP POLICY IF EXISTS "Users can view invites for their trips" ON public.trip_invites;
DROP POLICY IF EXISTS "Editors and owners can manage invites" ON public.trip_invites;

DROP POLICY IF EXISTS "Users can view locations of trips they collaborate on" ON public.locations;
DROP POLICY IF EXISTS "Collaborators can manage locations" ON public.locations;

DROP POLICY IF EXISTS "Users can view transportations of trips they collaborate on" ON public.transportations;
DROP POLICY IF EXISTS "Collaborators can manage transportations" ON public.transportations;

DROP POLICY IF EXISTS "Users can view accommodations of trips they collaborate on" ON public.accommodations;
DROP POLICY IF EXISTS "Collaborators can manage accommodations" ON public.accommodations;

-- 3. Recreate policies using the safe functions
CREATE POLICY "Users can view trips they collaborate on" ON public.trips FOR SELECT USING (public.check_trip_access(id));
CREATE POLICY "Collaborators can update trips" ON public.trips FOR UPDATE USING (public.check_trip_edit_access(id));

CREATE POLICY "Users can view members of trips they have access to" ON public.trip_members FOR SELECT USING (public.check_trip_access(trip_id));
CREATE POLICY "Editors and owners can manage members" ON public.trip_members FOR ALL USING (public.check_trip_edit_access(trip_id));

CREATE POLICY "Users can view invites for their trips" ON public.trip_invites FOR SELECT USING (public.check_trip_access(trip_id));
CREATE POLICY "Editors and owners can manage invites" ON public.trip_invites FOR ALL USING (public.check_trip_edit_access(trip_id));

CREATE POLICY "Users can view locations of trips they collaborate on" ON public.locations FOR SELECT USING (public.check_trip_access(trip_id));
CREATE POLICY "Collaborators can manage locations" ON public.locations FOR ALL USING (public.check_trip_edit_access(trip_id));

CREATE POLICY "Users can view transportations of trips they collaborate on" ON public.transportations FOR SELECT USING (public.check_trip_access(trip_id));
CREATE POLICY "Collaborators can manage transportations" ON public.transportations FOR ALL USING (public.check_trip_edit_access(trip_id));

CREATE POLICY "Users can view accommodations of trips they collaborate on" ON public.accommodations FOR SELECT USING (public.check_trip_access(trip_id));
CREATE POLICY "Collaborators can manage accommodations" ON public.accommodations FOR ALL USING (public.check_trip_edit_access(trip_id));

DROP POLICY IF EXISTS "Users can view public photos" ON public.photos;
DROP POLICY IF EXISTS "Users can manage photos of their trips" ON public.photos;
CREATE POLICY "Users can view photos of trips they collaborate on" ON public.photos FOR SELECT USING (public.check_trip_access(trip_id));
CREATE POLICY "Collaborators can manage photos" ON public.photos FOR ALL USING (public.check_trip_edit_access(trip_id));
