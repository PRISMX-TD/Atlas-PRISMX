-- Update RLS for transportations and accommodations to hide them from public view
-- Only owners and collaborators (has_trip_access) can view them now, regardless of is_public.

-- 1. TRANSPORTATIONS
DROP POLICY IF EXISTS "Trans Select" ON public.transportations;
-- Removed the OR EXISTS (... is_public = true) part
CREATE POLICY "Trans Select" ON public.transportations FOR SELECT USING (
  public.has_trip_access(trip_id)
);

-- 2. ACCOMMODATIONS
DROP POLICY IF EXISTS "Acc Select" ON public.accommodations;
-- Removed the OR EXISTS (... is_public = true) part
CREATE POLICY "Acc Select" ON public.accommodations FOR SELECT USING (
  public.has_trip_access(trip_id)
);
