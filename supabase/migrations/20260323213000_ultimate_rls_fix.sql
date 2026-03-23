-- Drop all existing policies to completely clean up
DROP POLICY IF EXISTS "Users can view trips they collaborate on" ON public.trips;
DROP POLICY IF EXISTS "Collaborators can update trips" ON public.trips;
DROP POLICY IF EXISTS "Users can select trips they own" ON public.trips;
DROP POLICY IF EXISTS "Users can select public trips" ON public.trips;
DROP POLICY IF EXISTS "Users can select trips they collaborate on" ON public.trips;
DROP POLICY IF EXISTS "Users can insert trips" ON public.trips;
DROP POLICY IF EXISTS "Users can update trips they own" ON public.trips;
DROP POLICY IF EXISTS "Users can update trips they collaborate on as editors" ON public.trips;
DROP POLICY IF EXISTS "Users can delete trips they own" ON public.trips;

DROP POLICY IF EXISTS "Users can view members of trips they have access to" ON public.trip_members;
DROP POLICY IF EXISTS "Editors and owners can manage members" ON public.trip_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.trip_members;
DROP POLICY IF EXISTS "Users can view memberships of trips they own" ON public.trip_members;
DROP POLICY IF EXISTS "Users can view all members of trips they are in" ON public.trip_members;
DROP POLICY IF EXISTS "Owners and editors can manage members" ON public.trip_members;

-- 1. Create a trigger to automatically add the trip owner to trip_members
CREATE OR REPLACE FUNCTION public.handle_new_trip() 
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_trip_created ON public.trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON public.trips
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_trip();

-- Insert missing owners into trip_members
INSERT INTO public.trip_members (trip_id, user_id, role)
SELECT id, user_id, 'owner' FROM public.trips
WHERE NOT EXISTS (
  SELECT 1 FROM public.trip_members WHERE trip_members.trip_id = trips.id AND trip_members.user_id = trips.user_id
);

-- 2. Create foolproof SECURITY DEFINER functions that bypass RLS
-- We use a separate schema or explicit SELECT to avoid RLS. 
-- Wait, SECURITY DEFINER already bypasses RLS if owned by postgres. 
-- To be absolutely sure it doesn't trigger RLS, we can temporarily disable RLS, or just trust postgres bypasses it.

CREATE OR REPLACE FUNCTION public.get_user_trip_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Returns all trip_ids where the user is a member
  SELECT trip_id FROM trip_members WHERE user_id = auth.uid();
$$;

-- 3. TRIPS Policies
CREATE POLICY "Users can select trips" ON public.trips FOR SELECT USING (
  user_id = auth.uid() OR 
  is_public = true OR 
  id IN (SELECT public.get_user_trip_ids())
);

CREATE POLICY "Users can insert trips" ON public.trips FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "Users can update trips" ON public.trips FOR UPDATE USING (
  user_id = auth.uid() OR 
  id IN (
    SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
  )
);

CREATE POLICY "Users can delete trips" ON public.trips FOR DELETE USING (
  user_id = auth.uid()
);

-- 4. TRIP_MEMBERS Policies
CREATE POLICY "Users can select trip_members" ON public.trip_members FOR SELECT USING (
  trip_id IN (SELECT public.get_user_trip_ids())
);

CREATE POLICY "Users can insert trip_members" ON public.trip_members FOR INSERT WITH CHECK (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
);

CREATE POLICY "Users can update trip_members" ON public.trip_members FOR UPDATE USING (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
);

CREATE POLICY "Users can delete trip_members" ON public.trip_members FOR DELETE USING (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
);

-- 5. LOCATIONS, TRANSPORTATIONS, ACCOMMODATIONS, PHOTOS
-- Now we can safely use get_user_trip_ids() for all of them!

-- Locations
DROP POLICY IF EXISTS "Users can view locations of their trips" ON public.locations;
DROP POLICY IF EXISTS "Users can manage locations" ON public.locations;

CREATE POLICY "Users can select locations" ON public.locations FOR SELECT USING (
  trip_id IN (SELECT id FROM public.trips WHERE is_public = true) OR
  trip_id IN (SELECT public.get_user_trip_ids())
);

CREATE POLICY "Users can manage locations" ON public.locations FOR ALL USING (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
);

-- Transportations
DROP POLICY IF EXISTS "Users can view transportations of their trips" ON public.transportations;
DROP POLICY IF EXISTS "Users can manage transportations" ON public.transportations;

CREATE POLICY "Users can select transportations" ON public.transportations FOR SELECT USING (
  trip_id IN (SELECT id FROM public.trips WHERE is_public = true) OR
  trip_id IN (SELECT public.get_user_trip_ids())
);

CREATE POLICY "Users can manage transportations" ON public.transportations FOR ALL USING (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
);

-- Accommodations
DROP POLICY IF EXISTS "Users can view accommodations of their trips" ON public.accommodations;
DROP POLICY IF EXISTS "Users can manage accommodations" ON public.accommodations;

CREATE POLICY "Users can select accommodations" ON public.accommodations FOR SELECT USING (
  trip_id IN (SELECT id FROM public.trips WHERE is_public = true) OR
  trip_id IN (SELECT public.get_user_trip_ids())
);

CREATE POLICY "Users can manage accommodations" ON public.accommodations FOR ALL USING (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
);

-- Photos
DROP POLICY IF EXISTS "Users can view photos of their trips" ON public.photos;
DROP POLICY IF EXISTS "Users can manage photos" ON public.photos;

CREATE POLICY "Users can select photos" ON public.photos FOR SELECT USING (
  trip_id IN (SELECT id FROM public.trips WHERE is_public = true) OR
  trip_id IN (SELECT public.get_user_trip_ids())
);

CREATE POLICY "Users can manage photos" ON public.photos FOR ALL USING (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
);

-- Invites
DROP POLICY IF EXISTS "Users can view invites for their trips" ON public.trip_invites;
DROP POLICY IF EXISTS "Editors and owners can manage invites" ON public.trip_invites;
DROP POLICY IF EXISTS "Anyone can read invites by token" ON public.trip_invites;

CREATE POLICY "Users can select invites" ON public.trip_invites FOR SELECT USING (
  trip_id IN (SELECT public.get_user_trip_ids())
);

CREATE POLICY "Users can manage invites" ON public.trip_invites FOR ALL USING (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
);

CREATE POLICY "Anyone can read invites by token" ON public.trip_invites FOR SELECT USING (true);
