-- Draft picks/bans per match
CREATE TABLE public.match_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  -- Each team bans 2 heroes in-app, additional bans noted from in-game
  squad_a_bans TEXT[] NOT NULL DEFAULT '{}',
  squad_b_bans TEXT[] NOT NULL DEFAULT '{}',
  -- Additional in-game bans noted by host
  squad_a_ingame_bans TEXT[] NOT NULL DEFAULT '{}',
  squad_b_ingame_bans TEXT[] NOT NULL DEFAULT '{}',
  -- Optional notes
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- One draft record per match
  UNIQUE(match_id)
);

-- Enable RLS
ALTER TABLE public.match_drafts ENABLE ROW LEVEL SECURITY;

-- Everyone can view drafts
CREATE POLICY "Drafts are viewable by everyone"
  ON public.match_drafts FOR SELECT
  USING (true);

-- Hosts can create drafts
CREATE POLICY "Hosts can create drafts"
  ON public.match_drafts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = match_drafts.tournament_id
      AND t.host_id = auth.uid()
    )
  );

-- Hosts can update drafts
CREATE POLICY "Hosts can update drafts"
  ON public.match_drafts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = match_drafts.tournament_id
      AND t.host_id = auth.uid()
    )
  );

-- Hosts can delete drafts
CREATE POLICY "Hosts can delete drafts"
  ON public.match_drafts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = match_drafts.tournament_id
      AND t.host_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_match_drafts_updated_at
  BEFORE UPDATE ON public.match_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
