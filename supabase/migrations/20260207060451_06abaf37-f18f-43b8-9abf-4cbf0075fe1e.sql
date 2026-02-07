-- Create profiles table for player profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  ign TEXT NOT NULL,
  avatar_url TEXT,
  rank TEXT NOT NULL DEFAULT 'warrior',
  win_rate NUMERIC(5,2),
  main_role TEXT NOT NULL DEFAULT 'gold',
  hero_class TEXT NOT NULL DEFAULT 'fighter',
  favorite_heroes TEXT[] DEFAULT '{}',
  server TEXT NOT NULL DEFAULT 'sea',
  bio TEXT,
  looking_for_squad BOOLEAN NOT NULL DEFAULT true,
  contacts JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create squads table
CREATE TABLE public.squads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  min_rank TEXT NOT NULL DEFAULT 'warrior',
  needed_roles TEXT[] DEFAULT '{}',
  server TEXT NOT NULL DEFAULT 'sea',
  member_count INTEGER NOT NULL DEFAULT 1,
  contacts JSONB DEFAULT '[]',
  is_recruiting BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" 
ON public.profiles FOR DELETE 
USING (auth.uid() = user_id);

-- Squads RLS Policies
CREATE POLICY "Squads are viewable by everyone" 
ON public.squads FOR SELECT 
USING (true);

CREATE POLICY "Users can create squads" 
ON public.squads FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their squads" 
ON public.squads FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their squads" 
ON public.squads FOR DELETE 
USING (auth.uid() = owner_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_squads_updated_at
BEFORE UPDATE ON public.squads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();