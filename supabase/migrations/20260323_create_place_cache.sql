-- Create a cache table to minimize Google Places API costs
CREATE TABLE IF NOT EXISTS "public"."place_cache" (
    "place_id" text PRIMARY KEY,
    "name" text NOT NULL,
    "formatted_address" text,
    "lat" numeric,
    "lng" numeric,
    "photo_name" text,
    "updated_at" timestamp with time zone DEFAULT now()
);

-- Allow everyone to read the cache
CREATE POLICY "Enable read access for all users" ON "public"."place_cache"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

-- Allow authenticated users to insert/update cache
CREATE POLICY "Enable insert/update for all users" ON "public"."place_cache"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE "public"."place_cache" ENABLE ROW LEVEL SECURITY;
