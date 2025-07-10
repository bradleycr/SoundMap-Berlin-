-- Enable necessary extensions for UUIDs and geospatial queries
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create profiles table to store user-specific data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  anonymous BOOLEAN DEFAULT false,
  likes UUID[] DEFAULT '{}',
  dislikes UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create clips table for audio recordings
CREATE TABLE IF NOT EXISTS public.clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Keep clip if profile is deleted
  title TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius INTEGER DEFAULT 30,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  like_count INTEGER DEFAULT 0,
  dislike_count INTEGER DEFAULT 0
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS clips_location_idx ON public.clips USING GIST (ll_to_earth(lat, lng));
CREATE INDEX IF NOT EXISTS clips_created_at_idx ON public.clips (created_at DESC);
CREATE INDEX IF NOT EXISTS clips_owner_idx ON public.clips (owner);

-- Create a function to find nearby clips efficiently
CREATE OR REPLACE FUNCTION public.get_nearby(lat DOUBLE PRECISION, lng DOUBLE PRECISION, max_dist INTEGER)
RETURNS SETOF public.clips AS $$
  SELECT * FROM public.clips
  WHERE earth_distance(ll_to_earth(lat, lng), ll_to_earth(clips.lat, clips.lng)) < max_dist
  ORDER BY earth_distance(ll_to_earth(lat, lng), ll_to_earth(clips.lat, clips.lng));
$$ LANGUAGE SQL STABLE;

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view clips" ON public.clips;
DROP POLICY IF EXISTS "Allow clip inserts for anonymous and authenticated users" ON public.clips;
DROP POLICY IF EXISTS "Allow clip inserts for authenticated users" ON public.clips;
DROP POLICY IF EXISTS "Users can update their own clips" ON public.clips;
DROP POLICY IF EXISTS "Users can delete their own clips" ON public.clips;
DROP POLICY IF EXISTS "Anyone can view files in the clips bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow storage uploads for anonymous and authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Allow storage uploads for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own clips" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own clips" ON storage.objects;

-- POLICIES FOR PROFILES TABLE
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- POLICIES FOR CLIPS TABLE
CREATE POLICY "Anyone can view clips" ON public.clips FOR SELECT USING (true);
CREATE POLICY "Allow clip inserts for authenticated users" ON public.clips FOR INSERT WITH CHECK (auth.uid() = owner);
CREATE POLICY "Users can update their own clips" ON public.clips FOR UPDATE USING (auth.uid() = owner);
CREATE POLICY "Users can delete their own clips" ON public.clips FOR DELETE USING (auth.uid() = owner);

-- POLICIES FOR STORAGE (for the 'clips' bucket)
CREATE POLICY "Anyone can view files in the clips bucket" ON storage.objects FOR SELECT USING (bucket_id = 'clips');
CREATE POLICY "Allow storage uploads for authenticated users" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'clips' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own clips" ON storage.objects FOR UPDATE USING (bucket_id = 'clips' AND auth.uid() = owner);
CREATE POLICY "Users can delete their own clips" ON storage.objects FOR DELETE USING (bucket_id = 'clips' AND auth.uid() = owner);

-- Create the 'clips' storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clips',
  'clips',
  true,
  5242880, -- 5MB limit
  ARRAY['audio/webm', 'audio/wav', 'audio/mp3', 'audio/aac', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;
