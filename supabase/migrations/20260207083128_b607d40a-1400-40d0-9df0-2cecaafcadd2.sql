-- Create heroes table for dynamic hero management
CREATE TABLE IF NOT EXISTS public.heroes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  hero_class text NOT NULL DEFAULT 'fighter',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.heroes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Heroes are viewable by everyone" ON public.heroes;
DROP POLICY IF EXISTS "Admins can insert heroes" ON public.heroes;
DROP POLICY IF EXISTS "Admins can update heroes" ON public.heroes;
DROP POLICY IF EXISTS "Admins can delete heroes" ON public.heroes;

-- Heroes are viewable by everyone
CREATE POLICY "Heroes are viewable by everyone" 
ON public.heroes 
FOR SELECT 
USING (true);

-- Only admins can insert heroes
CREATE POLICY "Admins can insert heroes" 
ON public.heroes 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update heroes
CREATE POLICY "Admins can update heroes" 
ON public.heroes 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete heroes
CREATE POLICY "Admins can delete heroes" 
ON public.heroes 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_heroes_updated_at ON public.heroes;
CREATE TRIGGER update_heroes_updated_at
BEFORE UPDATE ON public.heroes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add main_roles column to profiles if not exists (array of roles for multi-role players)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'main_roles'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN main_roles text[] DEFAULT '{}';
    UPDATE public.profiles SET main_roles = ARRAY[main_role] WHERE main_role IS NOT NULL AND main_role != '';
  END IF;
END $$;

-- Insert all MLBB heroes (131 total, avoiding duplicates)
-- Tank (24)
INSERT INTO public.heroes (name, hero_class) VALUES
  ('Akai', 'tank'), ('Alice', 'tank'), ('Atlas', 'tank'), ('Baxia', 'tank'), ('Belerick', 'tank'),
  ('Carmilla', 'tank'), ('Chip', 'tank'), ('Edith', 'tank'), ('Esmeralda', 'tank'), ('Franco', 'tank'),
  ('Fredrinn', 'tank'), ('Gatotkaca', 'tank'), ('Gloo', 'tank'), ('Grock', 'tank'), ('Hilda', 'tank'),
  ('Hylos', 'tank'), ('Johnson', 'tank'), ('Khufra', 'tank'), ('Lolita', 'tank'), ('Masha', 'tank'),
  ('Minotaur', 'tank'), ('Ruby', 'tank'), ('Tigreal', 'tank'), ('Uranus', 'tank')
ON CONFLICT (name) DO NOTHING;

-- Fighter (35)
INSERT INTO public.heroes (name, hero_class) VALUES
  ('Aldous', 'fighter'), ('Alpha', 'fighter'), ('Argus', 'fighter'), ('Arlott', 'fighter'), ('Aulus', 'fighter'),
  ('Badang', 'fighter'), ('Balmond', 'fighter'), ('Barats', 'fighter'), ('Benedetta', 'fighter'), ('Chou', 'fighter'),
  ('Cici', 'fighter'), ('Dyrroth', 'fighter'), ('Guinevere', 'fighter'), ('Jawhead', 'fighter'), ('Julian', 'fighter'),
  ('Kaja', 'fighter'), ('Khaleed', 'fighter'), ('Lapu-Lapu', 'fighter'), ('Leomord', 'fighter'), ('Lukas', 'fighter'),
  ('Martis', 'fighter'), ('Minsitthar', 'fighter'), ('Paquito', 'fighter'), ('Phoveus', 'fighter'), ('Roger', 'fighter'),
  ('Silvanna', 'fighter'), ('Sun', 'fighter'), ('Terizla', 'fighter'), ('Thamuz', 'fighter'), ('X.Borg', 'fighter'),
  ('Yin', 'fighter'), ('Yu Zhong', 'fighter'), ('Zilong', 'fighter'), ('Zhuxin', 'fighter'), ('Tujimori', 'fighter')
ON CONFLICT (name) DO NOTHING;

-- Assassin (21)
INSERT INTO public.heroes (name, hero_class) VALUES
  ('Aamon', 'assassin'), ('Alucard', 'assassin'), ('Enzo', 'assassin'), ('Fanny', 'assassin'), ('Gusion', 'assassin'),
  ('Hanzo', 'assassin'), ('Harley', 'assassin'), ('Hayabusa', 'assassin'), ('Helcurt', 'assassin'), ('Joy', 'assassin'),
  ('Kadita', 'assassin'), ('Karina', 'assassin'), ('Lancelot', 'assassin'), ('Ling', 'assassin'), ('Natalia', 'assassin'),
  ('Nolan', 'assassin'), ('Saber', 'assassin'), ('Selena', 'assassin'), ('Suyou', 'assassin'), ('Yi Sun-shin', 'assassin'),
  ('Serena', 'assassin')
ON CONFLICT (name) DO NOTHING;

-- Mage (28)
INSERT INTO public.heroes (name, hero_class) VALUES
  ('Aurora', 'mage'), ('Cecilion', 'mage'), ('Chang''e', 'mage'), ('Cyclops', 'mage'), ('Eudora', 'mage'),
  ('Faramis', 'mage'), ('Gord', 'mage'), ('Harith', 'mage'), ('Kagura', 'mage'), ('Lunox', 'mage'),
  ('Luo Yi', 'mage'), ('Lylia', 'mage'), ('Nana', 'mage'), ('Novaria', 'mage'), ('Odette', 'mage'),
  ('Pharsa', 'mage'), ('Valentina', 'mage'), ('Vale', 'mage'), ('Valir', 'mage'), ('Vexana', 'mage'),
  ('Xavier', 'mage'), ('Yve', 'mage'), ('Zhask', 'mage'), ('Zetian', 'mage'), ('Natan', 'mage'),
  ('Paquito', 'mage'), ('Kimmy', 'mage'), ('Popol and Kupa', 'mage')
ON CONFLICT (name) DO NOTHING;

-- Marksman (21)
INSERT INTO public.heroes (name, hero_class) VALUES
  ('Beatrix', 'marksman'), ('Brody', 'marksman'), ('Bruno', 'marksman'), ('Claude', 'marksman'), ('Clint', 'marksman'),
  ('Granger', 'marksman'), ('Hanabi', 'marksman'), ('Ixia', 'marksman'), ('Irithel', 'marksman'), ('Karrie', 'marksman'),
  ('Layla', 'marksman'), ('Lesley', 'marksman'), ('Melissa', 'marksman'), ('Miya', 'marksman'), ('Moskov', 'marksman'),
  ('Wanwan', 'marksman'), ('Roger', 'marksman'), ('Yi Sun-shin', 'marksman'), ('Natan', 'marksman'), ('Hanabi', 'marksman'),
  ('Beatrix', 'marksman')
ON CONFLICT (name) DO NOTHING;

-- Support (12)
INSERT INTO public.heroes (name, hero_class) VALUES
  ('Angela', 'support'), ('Diggie', 'support'), ('Estes', 'support'), ('Floryn', 'support'), ('Mathilda', 'support'),
  ('Rafaela', 'support'), ('Kaja', 'support'), ('Lolita', 'support'), ('Minotaur', 'support'), ('Carmilla', 'support'),
  ('Faramis', 'support'), ('Johnson', 'support')
ON CONFLICT (name) DO NOTHING;

-- Admin policies for profiles and squads (drop if exist first)
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete any squad" ON public.squads;

CREATE POLICY "Admins can delete any profile"
ON public.profiles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any squad"
ON public.squads
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));