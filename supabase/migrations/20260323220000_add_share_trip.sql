-- Migration to add link sharing feature to trips

-- 1. Add columns to trips table
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid() UNIQUE,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- 2. Create a secure function to fetch shared trip data
-- This uses SECURITY DEFINER to bypass RLS, ensuring unauthenticated users
-- can only access the trip if they have the exact unguessable share_token,
-- and ONLY if is_shared is true.
CREATE OR REPLACE FUNCTION public.get_shared_trip_data(p_share_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'trip', to_jsonb(t.*),
    'locations', COALESCE((SELECT jsonb_agg(l.*) FROM locations l WHERE l.trip_id = t.id), '[]'::jsonb),
    'transportations', COALESCE((SELECT jsonb_agg(tr.*) FROM transportations tr WHERE tr.trip_id = t.id), '[]'::jsonb),
    'accommodations', COALESCE((SELECT jsonb_agg(a.*) FROM accommodations a WHERE a.trip_id = t.id), '[]'::jsonb),
    'photos', COALESCE((SELECT jsonb_agg(p.*) FROM photos p WHERE p.trip_id = t.id), '[]'::jsonb)
  ) INTO result
  FROM trips t
  WHERE t.share_token = p_share_token AND t.is_shared = true;

  RETURN result;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_shared_trip_data(UUID) TO anon, authenticated;
