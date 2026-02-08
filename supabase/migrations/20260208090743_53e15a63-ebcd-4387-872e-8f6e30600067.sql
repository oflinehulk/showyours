-- Create tournament status enum
CREATE TYPE public.tournament_status AS ENUM ('registration_open', 'registration_closed', 'bracket_generated', 'ongoing', 'completed', 'cancelled');

-- Create tournament format enum
CREATE TYPE public.tournament_format AS ENUM ('single_elimination', 'double_elimination', 'round_robin');

-- Create match status enum
CREATE TYPE public.match_status AS ENUM ('pending', 'ongoing', 'completed', 'disputed');

-- Create squad member role enum
CREATE TYPE public.squad_member_role AS ENUM ('main', 'substitute');

-- Tournaments table
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rules TEXT,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  max_squads INTEGER NOT NULL DEFAULT 8 CHECK (max_squads IN (8, 16, 32, 64)),
  status public.tournament_status NOT NULL DEFAULT 'registration_open',
  format public.tournament_format,
  prize_wallet TEXT,
  banner_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tournament squads (rosters created specifically for tournaments)
CREATE TABLE public.tournament_squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  leader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  existing_squad_id UUID REFERENCES public.squads(id) ON DELETE SET NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tournament squad members (5 main + 2 subs = 7 max)
CREATE TABLE public.tournament_squad_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_squad_id UUID REFERENCES public.tournament_squads(id) ON DELETE CASCADE NOT NULL,
  ign TEXT NOT NULL,
  mlbb_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role public.squad_member_role NOT NULL DEFAULT 'main',
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 7),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tournament_squad_id, position)
);

-- Tournament registrations
CREATE TABLE public.tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  tournament_squad_id UUID REFERENCES public.tournament_squads(id) ON DELETE CASCADE NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  UNIQUE(tournament_id, tournament_squad_id)
);

-- Tournament matches
CREATE TABLE public.tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  bracket_type TEXT DEFAULT 'winners' CHECK (bracket_type IN ('winners', 'losers', 'finals')),
  squad_a_id UUID REFERENCES public.tournament_squads(id) ON DELETE SET NULL,
  squad_b_id UUID REFERENCES public.tournament_squads(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES public.tournament_squads(id) ON DELETE SET NULL,
  status public.match_status NOT NULL DEFAULT 'pending',
  best_of INTEGER NOT NULL DEFAULT 1 CHECK (best_of IN (1, 3, 5)),
  squad_a_score INTEGER DEFAULT 0,
  squad_b_score INTEGER DEFAULT 0,
  result_screenshot TEXT,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, round, match_number, bracket_type)
);

-- Roster changes tracking (max 2 substitutions per squad per tournament)
CREATE TABLE public.roster_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_squad_id UUID REFERENCES public.tournament_squads(id) ON DELETE CASCADE NOT NULL,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  player_out_ign TEXT NOT NULL,
  player_in_ign TEXT NOT NULL,
  player_in_mlbb_id TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_changes ENABLE ROW LEVEL SECURITY;

-- Tournaments policies
CREATE POLICY "Tournaments are viewable by everyone"
ON public.tournaments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create tournaments"
ON public.tournaments FOR INSERT
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their tournaments"
ON public.tournaments FOR UPDATE
USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their tournaments"
ON public.tournaments FOR DELETE
USING (auth.uid() = host_id);

CREATE POLICY "Admins can update any tournament"
ON public.tournaments FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any tournament"
ON public.tournaments FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Tournament squads policies
CREATE POLICY "Tournament squads are viewable by everyone"
ON public.tournament_squads FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create tournament squads"
ON public.tournament_squads FOR INSERT
WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Leaders can update their tournament squads"
ON public.tournament_squads FOR UPDATE
USING (auth.uid() = leader_id);

CREATE POLICY "Leaders can delete their tournament squads"
ON public.tournament_squads FOR DELETE
USING (auth.uid() = leader_id);

-- Tournament squad members policies
CREATE POLICY "Squad members are viewable by everyone"
ON public.tournament_squad_members FOR SELECT
USING (true);

CREATE POLICY "Leaders can manage squad members"
ON public.tournament_squad_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournament_squads
    WHERE id = tournament_squad_id AND leader_id = auth.uid()
  )
);

CREATE POLICY "Leaders can update squad members"
ON public.tournament_squad_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tournament_squads
    WHERE id = tournament_squad_id AND leader_id = auth.uid()
  )
);

CREATE POLICY "Leaders can delete squad members"
ON public.tournament_squad_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tournament_squads
    WHERE id = tournament_squad_id AND leader_id = auth.uid()
  )
);

-- Tournament registrations policies
CREATE POLICY "Registrations are viewable by everyone"
ON public.tournament_registrations FOR SELECT
USING (true);

CREATE POLICY "Squad leaders can register for tournaments"
ON public.tournament_registrations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournament_squads
    WHERE id = tournament_squad_id AND leader_id = auth.uid()
  )
);

CREATE POLICY "Squad leaders can withdraw from tournaments"
ON public.tournament_registrations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tournament_squads
    WHERE id = tournament_squad_id AND leader_id = auth.uid()
  )
);

CREATE POLICY "Hosts can manage registrations"
ON public.tournament_registrations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = tournament_id AND host_id = auth.uid()
  )
);

CREATE POLICY "Hosts can delete registrations"
ON public.tournament_registrations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = tournament_id AND host_id = auth.uid()
  )
);

-- Tournament matches policies
CREATE POLICY "Matches are viewable by everyone"
ON public.tournament_matches FOR SELECT
USING (true);

CREATE POLICY "Hosts can create matches"
ON public.tournament_matches FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = tournament_id AND host_id = auth.uid()
  )
);

CREATE POLICY "Hosts can update matches"
ON public.tournament_matches FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = tournament_id AND host_id = auth.uid()
  )
);

CREATE POLICY "Squad leaders can update match results"
ON public.tournament_matches FOR UPDATE
USING (
  auth.uid() IN (
    SELECT leader_id FROM public.tournament_squads WHERE id = squad_a_id
    UNION
    SELECT leader_id FROM public.tournament_squads WHERE id = squad_b_id
  )
);

CREATE POLICY "Admins can manage all matches"
ON public.tournament_matches FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Roster changes policies
CREATE POLICY "Roster changes are viewable by everyone"
ON public.roster_changes FOR SELECT
USING (true);

CREATE POLICY "Leaders can make roster changes"
ON public.roster_changes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournament_squads
    WHERE id = tournament_squad_id AND leader_id = auth.uid()
  )
);

-- Create updated_at triggers for new tables
CREATE TRIGGER update_tournaments_updated_at
BEFORE UPDATE ON public.tournaments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tournament_squads_updated_at
BEFORE UPDATE ON public.tournament_squads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tournament_matches_updated_at
BEFORE UPDATE ON public.tournament_matches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for tournament assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('tournament-assets', 'tournament-assets', true);

-- Storage policies for tournament assets
CREATE POLICY "Tournament assets are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'tournament-assets');

CREATE POLICY "Authenticated users can upload tournament assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tournament-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own tournament assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tournament-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own tournament assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'tournament-assets' AND auth.uid()::text = (storage.foldername(name))[1]);