
-- Add coin toss columns to tournament_matches
ALTER TABLE public.tournament_matches
  ADD COLUMN toss_winner UUID REFERENCES public.tournament_squads(id) ON DELETE SET NULL,
  ADD COLUMN blue_side_team UUID REFERENCES public.tournament_squads(id) ON DELETE SET NULL,
  ADD COLUMN red_side_team UUID REFERENCES public.tournament_squads(id) ON DELETE SET NULL,
  ADD COLUMN toss_completed_at TIMESTAMPTZ;

-- Create group_draws table
CREATE TABLE public.group_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.tournament_stages(id) ON DELETE CASCADE,
  draw_seed TEXT NOT NULL,
  draw_sequence JSONB NOT NULL DEFAULT '[]'::jsonb,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.group_draws ENABLE ROW LEVEL SECURITY;

-- RLS policies for group_draws
CREATE POLICY "Group draws are viewable by everyone"
  ON public.group_draws FOR SELECT USING (true);

CREATE POLICY "Hosts can insert group draws"
  ON public.group_draws FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM tournaments t WHERE t.id = group_draws.tournament_id AND t.host_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Hosts can update group draws"
  ON public.group_draws FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM tournaments t WHERE t.id = group_draws.tournament_id AND t.host_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete group draws"
  ON public.group_draws FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM tournaments t WHERE t.id = group_draws.tournament_id AND t.host_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Audit trigger for coin toss
CREATE OR REPLACE FUNCTION public.audit_coin_toss()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.toss_completed_at IS NULL AND NEW.toss_completed_at IS NOT NULL THEN
    INSERT INTO tournament_audit_log (tournament_id, user_id, action, details)
    VALUES (NEW.tournament_id, auth.uid(), 'coin_toss_completed',
      jsonb_build_object(
        'match_id', NEW.id,
        'round', NEW.round,
        'match_number', NEW.match_number,
        'toss_winner', NEW.toss_winner,
        'blue_side_team', NEW.blue_side_team,
        'red_side_team', NEW.red_side_team
      ));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_coin_toss
  AFTER UPDATE ON public.tournament_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_coin_toss();

-- Indexes
CREATE INDEX idx_matches_toss_winner ON public.tournament_matches(toss_winner) WHERE toss_winner IS NOT NULL;
CREATE INDEX idx_group_draws_tournament ON public.group_draws(tournament_id);
CREATE INDEX idx_group_draws_stage ON public.group_draws(stage_id);
