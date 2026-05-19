-- Create public storage bucket for label source images
-- Closes #70

INSERT INTO storage.buckets (id, name, public)
VALUES ('label-images', 'label-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users can upload their own label images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'label-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "label images are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'label-images');

CREATE POLICY "users can delete their own label images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'label-images' AND (storage.foldername(name))[1] = auth.uid()::text);
