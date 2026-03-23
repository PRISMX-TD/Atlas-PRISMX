-- Recreate it as PLPGSQL to prevent query inlining, which causes the recursion detection
CREATE OR REPLACE FUNCTION public.get_user_trip_ids()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Because this is PLPGSQL and SECURITY DEFINER, it runs as the owner (postgres)
  -- and will NOT be inlined by the query planner, completely avoiding the recursion error.
  RETURN QUERY SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid();
END;
$$;
