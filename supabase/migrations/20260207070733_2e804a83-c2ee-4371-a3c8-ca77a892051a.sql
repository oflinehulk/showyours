-- Add new columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state text DEFAULT 'maharashtra';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS screenshots text[] DEFAULT '{}';

-- Add new columns to squads table  
ALTER TABLE public.squads ADD COLUMN IF NOT EXISTS max_members integer DEFAULT 10;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for squad logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('squad-logos', 'squad-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for game screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for squad logos
CREATE POLICY "Squad logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'squad-logos');

CREATE POLICY "Users can upload squad logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'squad-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their squad logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'squad-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their squad logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'squad-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for screenshots
CREATE POLICY "Screenshots are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'screenshots');

CREATE POLICY "Users can upload their screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their screenshots"
ON storage.objects FOR UPDATE
USING (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their screenshots"
ON storage.objects FOR DELETE
USING (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);