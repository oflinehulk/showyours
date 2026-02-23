-- ============================================================
-- Coin Toss & Group Draws
-- Adds toss columns to tournament_matches
-- Creates group_draws audit table
-- ============================================================

-- 1. Add toss columns to tournament_matches
ALTER TABLE public.tournament_matches
  ADD COLUMN IF NOT EXISTS toss_winner UUID REFERENCES public.tournament_squads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS blue_side_team UUID REFERENCES public.tournament_squads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS red_side_team UUID REFERENCES public.tournament_squads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS toss_completed_at TIMESTAMPTZ;

-- 2. group_draws audit table
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

ALTER TABLE public.group_draws ENABLE ROW LEVEL SECURITY;

-- RLS: viewable by everyone
CREATE POLICY "Group draws are viewable by everyone"
  ON public.group_draws FOR SELECT USING (true);

-- RLS: host can insert
CREATE POLICY "Hosts can create group draws"
  ON public.group_draws FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = group_draws.tournament_id
      AND t.host_id = auth.uid()
    )
  );

-- RLS: host can update (confirm)
CREATE POLICY "Hosts can update group draws"
  ON public.group_draws FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = group_draws.tournament_id
      AND t.host_id = auth.uid()
    )
  );

-- RLS: admin full access
CREATE POLICY "Admins can manage group draws"
  ON public.group_draws FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Audit trigger for coin toss completion
CREATE OR REPLACE FUNCTION public.audit_coin_toss()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.toss_completed_at IS NULL AND NEW.toss_completed_at IS NOT NULL THEN
    INSERT INTO tournament_audit_log (tournament_id, user_id, action, details)
    VALUES (
      NEW.tournament_id,
      auth.uid(),
      'coin_toss_completed',
      jsonb_build_object(
        'match_id', NEW.id,
        'round', NEW.round,
        'match_number', NEW.match_number,
        'toss_winner', NEW.toss_winner,
        'blue_side_team', NEW.blue_side_team,
        'red_side_team', NEW.red_side_team
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_coin_toss
  AFTER UPDATE ON public.tournament_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_coin_toss();

-- 4. Index for toss_winner lookups
CREATE INDEX IF NOT EXISTS idx_matches_toss_winner
  ON public.tournament_matches (toss_winner)
  WHERE toss_winner IS NOT NULL;

-- 5. Index for group_draws lookups
CREATE INDEX IF NOT EXISTS idx_group_draws_tournament
  ON public.group_draws (tournament_id);

CREATE INDEX IF NOT EXISTS idx_group_draws_stage
  ON public.group_draws (stage_id);
