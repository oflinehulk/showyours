
-- Squad invitations table: leaders invite players
CREATE TABLE public.squad_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  invited_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Prevent duplicate pending invites
  CONSTRAINT unique_pending_invite UNIQUE (squad_id, invited_profile_id)
);

-- Enable RLS
ALTER TABLE public.squad_invitations ENABLE ROW LEVEL SECURITY;

-- Squad leaders/co-leaders can create invitations
CREATE POLICY "Squad leaders can send invitations"
ON public.squad_invitations FOR INSERT
WITH CHECK (
  auth.uid() = invited_by
  AND (
    EXISTS (SELECT 1 FROM squads s WHERE s.id = squad_invitations.squad_id AND s.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM squad_members sm WHERE sm.squad_id = squad_invitations.squad_id AND sm.user_id = auth.uid() AND sm.role IN ('leader', 'co_leader'))
  )
);

-- Squad leaders can view their sent invitations
CREATE POLICY "Squad leaders can view sent invitations"
ON public.squad_invitations FOR SELECT
USING (
  EXISTS (SELECT 1 FROM squads s WHERE s.id = squad_invitations.squad_id AND s.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM squad_members sm WHERE sm.squad_id = squad_invitations.squad_id AND sm.user_id = auth.uid() AND sm.role IN ('leader', 'co_leader'))
);

-- Invited players can view their invitations
CREATE POLICY "Players can view their invitations"
ON public.squad_invitations FOR SELECT
USING (auth.uid() = invited_user_id);

-- Invited players can update (accept/reject) their invitations
CREATE POLICY "Players can respond to invitations"
ON public.squad_invitations FOR UPDATE
USING (auth.uid() = invited_user_id);

-- Squad leaders can cancel invitations
CREATE POLICY "Squad leaders can cancel invitations"
ON public.squad_invitations FOR DELETE
USING (
  EXISTS (SELECT 1 FROM squads s WHERE s.id = squad_invitations.squad_id AND s.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM squad_members sm WHERE sm.squad_id = squad_invitations.squad_id AND sm.user_id = auth.uid() AND sm.role IN ('leader', 'co_leader'))
);

-- Players can decline (delete) their invitations
CREATE POLICY "Players can decline invitations"
ON public.squad_invitations FOR DELETE
USING (auth.uid() = invited_user_id);

-- Trigger for updated_at
CREATE TRIGGER update_squad_invitations_updated_at
BEFORE UPDATE ON public.squad_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
