-- ============================================================
-- Multi-Stage Tournament Support
-- Adds tournament_stages, tournament_groups, tournament_group_teams
-- Modifies tournament_matches, roster_changes, tournaments
-- ============================================================

-- 1a. tournament_stages table
CREATE TABLE public.tournament_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  format public.tournament_format NOT NULL,
  best_of INTEGER NOT NULL DEFAULT 1 CHECK (best_of IN (1, 3, 5)),
  finals_best_of INTEGER DEFAULT NULL CHECK (finals_best_of IS NULL OR finals_best_of IN (1, 3, 5)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'configuring', 'ongoing', 'completed')),
  group_count INTEGER NOT NULL DEFAULT 0,
  advance_per_group INTEGER NOT NULL DEFAULT 0,
  advance_best_remaining INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, stage_number)
);

ALTER TABLE public.tournament_stages ENABLE ROW LEVEL SECURITY;

-- 1b. tournament_groups table
CREATE TABLE public.tournament_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES public.tournament_stages(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(stage_id, label)
);

ALTER TABLE public.tournament_groups ENABLE ROW LEVEL SECURITY;

-- 1c. tournament_group_teams table
CREATE TABLE public.tournament_group_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.tournament_groups(id) ON DELETE CASCADE,
  tournament_squad_id UUID NOT NULL REFERENCES public.tournament_squads(id) ON DELETE CASCADE,
  UNIQUE(group_id, tournament_squad_id)
);

ALTER TABLE public.tournament_group_teams ENABLE ROW LEVEL SECURITY;

-- 1d. Add columns to tournament_matches
ALTER TABLE public.tournament_matches
  ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.tournament_stages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.tournament_groups(id) ON DELETE SET NULL;

-- 1e. Update unique constraint on tournament_matches
-- Drop old unique constraint (may be named differently depending on migration)
DO $$
BEGIN
  -- Try dropping by commonly generated names
  BEGIN
    ALTER TABLE public.tournament_matches DROP CONSTRAINT IF EXISTS tournament_matches_tournament_id_round_match_number_bracket_key;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.tournament_matches DROP CONSTRAINT IF EXISTS tournament_matches_tournament_id_round_match_number_brack_key;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END $$;

-- Also drop any unique index with same columns
DROP INDEX IF EXISTS public.tournament_matches_tournament_id_round_match_number_bracket_key;
DROP INDEX IF EXISTS public.tournament_matches_tournament_id_round_match_number_brack_key;

-- Single-stage tournaments (no stage_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_single_stage
  ON public.tournament_matches (tournament_id, round, match_number, bracket_type)
  WHERE stage_id IS NULL;

-- Multi-stage tournaments
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_multi_stage
  ON public.tournament_matches (stage_id, round, match_number, bracket_type)
  WHERE stage_id IS NOT NULL;

-- 1f. Add is_multi_stage to tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS is_multi_stage BOOLEAN NOT NULL DEFAULT false;

-- 1g. Relax max_squads constraint (allow any count >= 2)
ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_max_squads_check;
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_max_squads_check CHECK (max_squads >= 2);

-- 1h. Add stage_id to roster_changes
ALTER TABLE public.roster_changes
  ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.tournament_stages(id) ON DELETE CASCADE;

-- ============================================================
-- RLS Policies
-- ============================================================

-- tournament_stages
CREATE POLICY "Tournament stages are viewable by everyone"
  ON public.tournament_stages FOR SELECT USING (true);

CREATE POLICY "Hosts can create tournament stages"
  ON public.tournament_stages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_stages.tournament_id
      AND t.host_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can update tournament stages"
  ON public.tournament_stages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_stages.tournament_id
      AND t.host_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can delete tournament stages"
  ON public.tournament_stages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_stages.tournament_id
      AND t.host_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage tournament stages"
  ON public.tournament_stages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- tournament_groups
CREATE POLICY "Tournament groups are viewable by everyone"
  ON public.tournament_groups FOR SELECT USING (true);

CREATE POLICY "Hosts can create tournament groups"
  ON public.tournament_groups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_groups.tournament_id
      AND t.host_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can update tournament groups"
  ON public.tournament_groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_groups.tournament_id
      AND t.host_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can delete tournament groups"
  ON public.tournament_groups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_groups.tournament_id
      AND t.host_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage tournament groups"
  ON public.tournament_groups FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- tournament_group_teams
CREATE POLICY "Group teams are viewable by everyone"
  ON public.tournament_group_teams FOR SELECT USING (true);

CREATE POLICY "Hosts can create group teams"
  ON public.tournament_group_teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournament_groups tg
      JOIN public.tournaments t ON t.id = tg.tournament_id
      WHERE tg.id = tournament_group_teams.group_id
      AND t.host_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can delete group teams"
  ON public.tournament_group_teams FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournament_groups tg
      JOIN public.tournaments t ON t.id = tg.tournament_id
      WHERE tg.id = tournament_group_teams.group_id
      AND t.host_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage group teams"
  ON public.tournament_group_teams FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Triggers
-- ============================================================

-- Auto-update updated_at for tournament_stages
CREATE TRIGGER update_tournament_stages_updated_at
  BEFORE UPDATE ON public.tournament_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Audit stage status changes
CREATE OR REPLACE FUNCTION public.audit_stage_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO tournament_audit_log (tournament_id, user_id, action, details)
    VALUES (
      NEW.tournament_id,
      auth.uid(),
      'stage_status_changed',
      jsonb_build_object(
        'stage_id', NEW.id,
        'stage_name', NEW.name,
        'stage_number', NEW.stage_number,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_stage_status
  AFTER UPDATE ON public.tournament_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_stage_status_change();

-- ============================================================
-- Update rpc_approve_roster_change to count per stage
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_approve_roster_change(
  p_change_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_change RECORD;
  v_tournament RECORD;
  v_approved_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_change
  FROM roster_changes
  WHERE id = p_change_id
  FOR UPDATE;

  IF v_change IS NULL THEN
    RAISE EXCEPTION 'Roster change not found';
  END IF;

  IF v_change.status != 'pending' THEN
    RAISE EXCEPTION 'This change has already been processed';
  END IF;

  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = v_change.tournament_id;

  IF v_tournament.host_id != v_user_id THEN
    RAISE EXCEPTION 'Only the tournament host can approve roster changes';
  END IF;

  -- Count per stage when stage_id is set, otherwise per tournament
  IF v_change.stage_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_approved_count
    FROM roster_changes
    WHERE tournament_squad_id = v_change.tournament_squad_id
      AND stage_id = v_change.stage_id
      AND status = 'approved';
  ELSE
    SELECT COUNT(*) INTO v_approved_count
    FROM roster_changes
    WHERE tournament_squad_id = v_change.tournament_squad_id
      AND tournament_id = v_change.tournament_id
      AND stage_id IS NULL
      AND status = 'approved';
  END IF;

  IF v_approved_count >= 2 THEN
    RAISE EXCEPTION 'Maximum roster changes (2) reached for this squad in this stage';
  END IF;

  UPDATE roster_changes
  SET status = 'approved',
      approved_by = v_user_id,
      approved_at = now()
  WHERE id = p_change_id;
END;
$$;

-- ============================================================
-- Update validate_tournament_status_transition for multi-stage
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_tournament_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approved_count INTEGER;
  v_match_count INTEGER;
  v_completed_match_count INTEGER;
  v_stage_count INTEGER;
  v_completed_stage_count INTEGER;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  CASE OLD.status
    WHEN 'registration_open' THEN
      IF NEW.status NOT IN ('registration_closed') THEN
        RAISE EXCEPTION 'Cannot transition from registration_open to %', NEW.status;
      END IF;

    WHEN 'registration_closed' THEN
      IF NEW.status NOT IN ('bracket_generated') THEN
        RAISE EXCEPTION 'Cannot transition from registration_closed to %', NEW.status;
      END IF;
      SELECT COUNT(*) INTO v_approved_count
      FROM tournament_registrations
      WHERE tournament_id = NEW.id AND status = 'approved';
      IF v_approved_count < 2 THEN
        RAISE EXCEPTION 'Need at least 2 approved squads to generate bracket (currently %)', v_approved_count;
      END IF;

    WHEN 'bracket_generated' THEN
      IF NEW.status NOT IN ('ongoing') THEN
        RAISE EXCEPTION 'Cannot transition from bracket_generated to %', NEW.status;
      END IF;

    WHEN 'ongoing' THEN
      IF NEW.status NOT IN ('completed') THEN
        RAISE EXCEPTION 'Cannot transition from ongoing to %', NEW.status;
      END IF;

      -- For multi-stage: check all stages are completed
      IF NEW.is_multi_stage THEN
        SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
        INTO v_stage_count, v_completed_stage_count
        FROM tournament_stages
        WHERE tournament_id = NEW.id;

        IF v_stage_count > 0 AND v_completed_stage_count < v_stage_count THEN
          RAISE EXCEPTION 'All stages must be completed before finishing tournament (% of % done)',
            v_completed_stage_count, v_stage_count;
        END IF;
      END IF;

      -- Check all matches completed
      SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
      INTO v_match_count, v_completed_match_count
      FROM tournament_matches
      WHERE tournament_id = NEW.id;
      IF v_match_count > 0 AND v_completed_match_count < v_match_count THEN
        RAISE EXCEPTION 'All matches must be completed before finishing tournament (% of % done)',
          v_completed_match_count, v_match_count;
      END IF;

    WHEN 'completed' THEN
      RAISE EXCEPTION 'Cannot change status of a completed tournament';

    WHEN 'cancelled' THEN
      RAISE EXCEPTION 'Cannot change status of a cancelled tournament';
  END CASE;

  RETURN NEW;
END;
$$;

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tournament_stages_tournament
  ON public.tournament_stages (tournament_id, stage_number);

CREATE INDEX IF NOT EXISTS idx_tournament_groups_stage
  ON public.tournament_groups (stage_id);

CREATE INDEX IF NOT EXISTS idx_group_teams_group
  ON public.tournament_group_teams (group_id);

CREATE INDEX IF NOT EXISTS idx_matches_stage
  ON public.tournament_matches (stage_id)
  WHERE stage_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_matches_group
  ON public.tournament_matches (group_id)
  WHERE group_id IS NOT NULL;
