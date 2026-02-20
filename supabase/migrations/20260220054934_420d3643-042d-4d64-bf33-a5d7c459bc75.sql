
-- Create tournament_invitations table
CREATE TABLE public.tournament_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Prevent duplicate invitations
  UNIQUE(tournament_id, squad_id)
);

-- Enable RLS
ALTER TABLE public.tournament_invitations ENABLE ROW LEVEL SECURITY;

-- Everyone can view invitations (needed for checking duplicates)
CREATE POLICY "Tournament invitations are viewable by everyone"
  ON public.tournament_invitations FOR SELECT USING (true);

-- Hosts can send invitations
CREATE POLICY "Hosts can send tournament invitations"
  ON public.tournament_invitations FOR INSERT
  WITH CHECK (
    auth.uid() = invited_by
    AND EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_invitations.tournament_id
      AND t.host_id = auth.uid()
    )
  );

-- Hosts can delete/cancel invitations
CREATE POLICY "Hosts can delete tournament invitations"
  ON public.tournament_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_invitations.tournament_id
      AND t.host_id = auth.uid()
    )
  );

-- Squad leaders/owners can update (accept/reject) invitations
CREATE POLICY "Squad owners can respond to tournament invitations"
  ON public.tournament_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM squads s
      WHERE s.id = tournament_invitations.squad_id
      AND s.owner_id = auth.uid()
    )
  );

-- Squad co-leaders can also respond
CREATE POLICY "Squad co-leaders can respond to tournament invitations"
  ON public.tournament_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM squad_members sm
      WHERE sm.squad_id = tournament_invitations.squad_id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('leader', 'co_leader')
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_tournament_invitations_updated_at
  BEFORE UPDATE ON public.tournament_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
