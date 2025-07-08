-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  likes UUID[] DEFAULT '{}',
  dislikes UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create clips table
CREATE TABLE IF NOT EXISTS clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius INTEGER DEFAULT 30,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  like_count INTEGER DEFAULT 0,
  dislike_count INTEGER DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS clips_location_idx ON clips USING GIST (ll_to_earth(lat, lng));
CREATE INDEX IF NOT EXISTS clips_created_at_idx ON clips (created_at DESC);
CREATE INDEX IF NOT EXISTS clips_owner_idx ON clips (owner);

-- RPC function to get nearby clips
CREATE OR REPLACE FUNCTION get_nearby(lat DOUBLE PRECISION, lng DOUBLE PRECISION, max_dist INTEGER)
RETURNS SETOF clips AS $$
  SELECT * FROM clips
  WHERE earth_distance(ll_to_earth(lat, lng), ll_to_earth(clips.lat, clips.lng)) < max_dist
  ORDER BY earth_distance(ll_to_earth(lat, lng), ll_to_earth(clips.lat, clips.lng));
$$ LANGUAGE SQL STABLE;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Clips policies
CREATE POLICY "Anyone can view clips" ON clips FOR SELECT USING (true);
CREATE POLICY "Users can insert own clips" ON clips FOR INSERT WITH CHECK (auth.uid() = owner);
CREATE POLICY "Users can update own clips" ON clips FOR UPDATE USING (auth.uid() = owner);
CREATE POLICY "Users can delete own clips" ON clips FOR DELETE USING (auth.uid() = owner);

-- Create storage bucket for audio clips
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio-clips', 'audio-clips', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view audio clips" ON storage.objects FOR SELECT USING (bucket_id = 'audio-clips');
CREATE POLICY "Authenticated users can upload audio clips" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio-clips' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own audio clips" ON storage.objects FOR UPDATE USING (bucket_id = 'audio-clips' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own audio clips" ON storage.objects FOR DELETE USING (bucket_id = 'audio-clips' AND auth.uid()::text = (storage.foldername(name))[1]);
