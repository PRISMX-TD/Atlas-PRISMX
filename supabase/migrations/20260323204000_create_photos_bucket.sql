-- Create the trip_photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('trip_photos', 'trip_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the bucket
-- Allow public access to view photos
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'trip_photos');

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'trip_photos');

-- Allow users to delete their own uploaded photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'trip_photos');