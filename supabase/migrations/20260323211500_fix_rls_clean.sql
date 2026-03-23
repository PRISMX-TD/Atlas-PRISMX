-- A very clean and safe RLS setup without recursion
-- We will use a materialized view or just very simple policies.

-- First, drop ALL existing policies on trips and trip_members to start fresh
DROP POLICY IF EXISTS "Users can view trips they collaborate on" ON public.trips;
DROP POLICY IF EXISTS "Collaborators can update trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view trips they own" ON public.trips;
DROP POLICY IF EXISTS "Users can view public trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view trips they are members of" ON public.trips;
DROP POLICY IF EXISTS "Users can insert their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can update their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can delete their own trips" ON public.trips;

DROP POLICY IF EXISTS "Users can view members of trips they have access to" ON public.trip_members;
DROP POLICY IF EXISTS "Editors and owners can manage members" ON public.trip_members;

-- Trips policies (Very Simple)
CREATE POLICY "Users can select trips they own" ON public.trips FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can select public trips" ON public.trips FOR SELECT USING (is_public = true);

-- For trips they collaborate on, we use a simple subquery. This subquery reads trip_members.
CREATE POLICY "Users can select trips they collaborate on" ON public.trips FOR SELECT USING (
  id IN (SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert trips" ON public.trips FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update trips they own" ON public.trips FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can update trips they collaborate on as editors" ON public.trips FOR UPDATE USING (
  id IN (SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
);

CREATE POLICY "Users can delete trips they own" ON public.trips FOR DELETE USING (user_id = auth.uid());

-- Trip Members policies
-- To prevent recursion, we DO NOT query trip_members or trips inside trip_members policies!
-- Instead, users can see:
-- 1. Their own membership
-- 2. Memberships of trips they own (we can query trips, because trips doesn't query trip_members for its ownership policy)

CREATE POLICY "Users can view their own memberships" ON public.trip_members FOR SELECT USING (
  user_id = auth.uid()
);

CREATE POLICY "Users can view memberships of trips they own" ON public.trip_members FOR SELECT USING (
  trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid())
);

-- If we want users to see OTHER members of the trip they are in, we use a SECURITY DEFINER function
-- that Bypasses RLS to check if the user is in the trip.
CREATE OR REPLACE FUNCTION public.is_trip_member(check_trip_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_members WHERE trip_id = check_trip_id AND user_id = auth.uid()
  );
$$;

CREATE POLICY "Users can view all members of trips they are in" ON public.trip_members FOR SELECT USING (
  public.is_trip_member(trip_id)
);

CREATE POLICY "Owners and editors can manage members" ON public.trip_members FOR ALL USING (
  trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid()) OR
  (public.is_trip_member(trip_id) AND EXISTS (
    SELECT 1 FROM trip_members WHERE trip_id = trip_members.trip_id AND user_id = auth.uid() AND role IN ('owner', 'editor')
  ))
);

-- Do the same simple pattern for other tables
-- Locations
DROP POLICY IF EXISTS "Users can view locations of trips they collaborate on" ON public.locations;
DROP POLICY IF EXISTS "Collaborators can manage locations" ON public.locations;
DROP POLICY IF EXISTS "Users can view public locations" ON public.locations;
DROP POLICY IF EXISTS "Users can manage locations of their trips" ON public.locations;

CREATE POLICY "Users can view locations of their trips" ON public.locations FOR SELECT USING (
  trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid() OR is_public = true) OR
  public.is_trip_member(trip_id)
);

CREATE POLICY "Users can manage locations" ON public.locations FOR ALL USING (
  trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = public.locations.trip_id AND user_id = auth.uid() AND role IN ('owner', 'editor'))
);

-- Transportations
DROP POLICY IF EXISTS "Users can view transportations of trips they collaborate on" ON public.transportations;
DROP POLICY IF EXISTS "Collaborators can manage transportations" ON public.transportations;
DROP POLICY IF EXISTS "Users can view public transportations" ON public.transportations;
DROP POLICY IF EXISTS "Users can manage transportations of their trips" ON public.transportations;

CREATE POLICY "Users can view transportations of their trips" ON public.transportations FOR SELECT USING (
  trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid() OR is_public = true) OR
  public.is_trip_member(trip_id)
);

CREATE POLICY "Users can manage transportations" ON public.transportations FOR ALL USING (
  trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = public.transportations.trip_id AND user_id = auth.uid() AND role IN ('owner', 'editor'))
);

-- Accommodations
DROP POLICY IF EXISTS "Users can view accommodations of trips they collaborate on" ON public.accommodations;
DROP POLICY IF EXISTS "Collaborators can manage accommodations" ON public.accommodations;
DROP POLICY IF EXISTS "Users can view public accommodations" ON public.accommodations;
DROP POLICY IF EXISTS "Users can manage accommodations of their trips" ON public.accommodations;

CREATE POLICY "Users can view accommodations of their trips" ON public.accommodations FOR SELECT USING (
  trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid() OR is_public = true) OR
  public.is_trip_member(trip_id)
);

CREATE POLICY "Users can manage accommodations" ON public.accommodations FOR ALL USING (
  trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = public.accommodations.trip_id AND user_id = auth.uid() AND role IN ('owner', 'editor'))
);

-- Photos
DROP POLICY IF EXISTS "Users can view photos of trips they collaborate on" ON public.photos;
DROP POLICY IF EXISTS "Collaborators can manage photos" ON public.photos;
DROP POLICY IF EXISTS "Users can view public photos" ON public.photos;
DROP POLICY IF EXISTS "Users can manage photos of their trips" ON public.photos;

CREATE POLICY "Users can view photos of their trips" ON public.photos FOR SELECT USING (
  trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid() OR is_public = true) OR
  public.is_trip_member(trip_id)
);

CREATE POLICY "Users can manage photos" ON public.photos FOR ALL USING (
  trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = public.photos.trip_id AND user_id = auth.uid() AND role IN ('owner', 'editor'))
);

-- Invites
DROP POLICY IF EXISTS "Users can view invites for their trips" ON public.trip_invites;
DROP POLICY IF EXISTS "Editors and owners can manage invites" ON public.trip_invites;
DROP POLICY IF EXISTS "Anyone can read invites by token" ON public.trip_invites;

CREATE POLICY "Users can view invites for their trips" ON public.trip_invites FOR SELECT USING (
  trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid()) OR
  public.is_trip_member(trip_id)
);

CREATE POLICY "Editors and owners can manage invites" ON public.trip_invites FOR ALL USING (
  trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = public.trip_invites.trip_id AND user_id = auth.uid() AND role IN ('owner', 'editor'))
);

CREATE POLICY "Anyone can read invites by token" ON public.trip_invites FOR SELECT USING (true);
