-- Create enum for squad member roles
CREATE TYPE squad_member_squad_role AS ENUM ('leader', 'co_leader', 'member');

-- Create squad_members table to link squads with registered platform users
CREATE TABLE IF NOT EXISTS public.squad_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role squad_member_squad_role NOT NULL DEFAULT 'member',
  position INTEGER NOT NULL DEFAULT 1,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(squad_id, user_id),
  UNIQUE(squad_id, profile_id)
);

-- Enable RLS
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;

-- Everyone can view squad members
CREATE POLICY "Squad members are viewable by everyone"
  ON public.squad_members FOR SELECT
  USING (true);

-- Leaders and co-leaders can add members
CREATE POLICY "Leaders can add squad members"
  ON public.squad_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.squad_members sm
      WHERE sm.squad_id = squad_members.squad_id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('leader', 'co_leader')
    )
    OR EXISTS (
      SELECT 1 FROM public.squads s
      WHERE s.id = squad_members.squad_id
      AND s.owner_id = auth.uid()
    )
  );

-- Leaders and co-leaders can update members
CREATE POLICY "Leaders can update squad members"
  ON public.squad_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.squad_members sm
      WHERE sm.squad_id = squad_members.squad_id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('leader', 'co_leader')
    )
    OR EXISTS (
      SELECT 1 FROM public.squads s
      WHERE s.id = squad_members.squad_id
      AND s.owner_id = auth.uid()
    )
  );

-- Leaders can remove members (but not themselves if they're the only leader)
CREATE POLICY "Leaders can remove squad members"
  ON public.squad_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.squad_members sm
      WHERE sm.squad_id = squad_members.squad_id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('leader', 'co_leader')
    )
    OR EXISTS (
      SELECT 1 FROM public.squads s
      WHERE s.id = squad_members.squad_id
      AND s.owner_id = auth.uid()
    )
  );

-- Members can leave (delete themselves)
CREATE POLICY "Members can leave squad"
  ON public.squad_members FOR DELETE
  USING (auth.uid() = user_id);

-- Add mlbb_id column to profiles if it doesn't exist (for searching players)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mlbb_id TEXT;

-- Create index for fast player search by IGN or MLBB ID
CREATE INDEX IF NOT EXISTS idx_profiles_ign_search ON public.profiles (LOWER(ign));
CREATE INDEX IF NOT EXISTS idx_profiles_mlbb_id ON public.profiles (mlbb_id);

-- Add indexes for squad_members
CREATE INDEX IF NOT EXISTS idx_squad_members_squad_id ON public.squad_members (squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_members_user_id ON public.squad_members (user_id);

-- Function to search profiles by IGN or MLBB ID
CREATE OR REPLACE FUNCTION public.search_profiles(search_term TEXT, exclude_squad_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  ign TEXT,
  mlbb_id TEXT,
  avatar_url TEXT,
  rank TEXT,
  main_role TEXT,
  contacts JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.ign,
    p.mlbb_id,
    p.avatar_url,
    p.rank,
    p.main_role,
    p.contacts
  FROM public.profiles p
  WHERE (
    LOWER(p.ign) ILIKE '%' || LOWER(search_term) || '%'
    OR p.mlbb_id ILIKE '%' || search_term || '%'
  )
  AND (
    exclude_squad_id IS NULL 
    OR NOT EXISTS (
      SELECT 1 FROM public.squad_members sm 
      WHERE sm.profile_id = p.id 
      AND sm.squad_id = exclude_squad_id
    )
  )
  LIMIT 20
$$;