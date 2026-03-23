-- Create missing columns for accommodations
ALTER TABLE "public"."accommodations" 
ADD COLUMN IF NOT EXISTS "lat" numeric,
ADD COLUMN IF NOT EXISTS "lng" numeric,
ADD COLUMN IF NOT EXISTS "place_id" text,
ADD COLUMN IF NOT EXISTS "photo_url" text,
ADD COLUMN IF NOT EXISTS "map_url" text;
