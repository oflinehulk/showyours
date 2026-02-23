
-- 1. Create tournament_stages table
CREATE TABLE public.tournament_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  format public.tournament_format NOT NULL,
  best_of INTEGER NOT NULL DEFAULT 1 CHECK (best_of IN (1, 3, 5)),
  finals_best_of INTEGER NOT NULL DEFAULT 1 CHECK (finals_best_of IN (1, 3, 5)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'configuring', 'ongoing', 'completed')),
  group_count INTEGER NOT NULL DEFAULT 0,
  advance_per_group INTEGER NOT NULL DEFAULT 1,
  advance_best_remaining INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, stage_number)
);

-- 2. Create tournament_groups table
CREATE TABLE public.tournament_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID NOT NULL REFERENCES public.tournament_stages(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (stage_id, label)
);

-- 3. Create tournament_group_teams table
CREATE TABLE public.tournament_group_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.tournament_groups(id) ON DELETE CASCADE,
  tournament_squad_id UUID NOT NULL REFERENCES public.tournament_squads(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (group_id, tournament_squad_id)
);

-- 4. Modify tournament_matches: add stage_id and group_id
ALTER TABLE public.tournament_matches
  ADD COLUMN stage_id UUID REFERENCES public.tournament_stages(id) ON DELETE CASCADE,
  ADD COLUMN group_id UUID REFERENCES public.tournament_groups(id) ON DELETE SET NULL;

-- Drop old unique constraint on tournament_matches
ALTER TABLE public.tournament_matches DROP CONSTRAINT IF EXISTS tournament_matches_tournament_id_round_match_number_bracket_key;

-- Partial unique index for single-stage matches
CREATE UNIQUE INDEX idx_matches_single_stage_unique
  ON public.tournament_matches (tournament_id, round, match_number, bracket_type)
  WHERE stage_id IS NULL;

-- Partial unique index for multi-stage matches
CREATE UNIQUE INDEX idx_matches_multi_stage_unique
  ON public.tournament_matches (stage_id, round, match_number, bracket_type)
  WHERE stage_id IS NOT NULL;

-- 5. Modify tournaments: add is_multi_stage, relax max_squads
ALTER TABLE public.tournaments ADD COLUMN is_multi_stage BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_max_squads_check;
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_max_squads_check CHECK (max_squads >= 2);

-- 6. Modify roster_changes: add stage_id
ALTER TABLE public.roster_changes
  ADD COLUMN stage_id UUID REFERENCES public.tournament_stages(id) ON DELETE CASCADE;

-- 7. Enable RLS on new tables
ALTER TABLE public.tournament_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_group_teams ENABLE ROW LEVEL SECURITY;

-- RLS: tournament_stages
CREATE POLICY "Stages are viewable by everyone" ON public.tournament_stages FOR SELECT USING (true);
CREATE POLICY "Hosts can manage stages" ON public.tournament_stages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_stages.tournament_id AND t.host_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Hosts can update stages" ON public.tournament_stages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_stages.tournament_id AND t.host_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Hosts can delete stages" ON public.tournament_stages FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_stages.tournament_id AND t.host_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- RLS: tournament_groups
CREATE POLICY "Groups are viewable by everyone" ON public.tournament_groups FOR SELECT USING (true);
CREATE POLICY "Hosts can manage groups" ON public.tournament_groups FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_groups.tournament_id AND t.host_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Hosts can update groups" ON public.tournament_groups FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_groups.tournament_id AND t.host_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Hosts can delete groups" ON public.tournament_groups FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_groups.tournament_id AND t.host_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- RLS: tournament_group_teams
CREATE POLICY "Group teams are viewable by everyone" ON public.tournament_group_teams FOR SELECT USING (true);
CREATE POLICY "Hosts can manage group teams" ON public.tournament_group_teams FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournament_groups tg
    JOIN public.tournaments t ON t.id = tg.tournament_id
    WHERE tg.id = tournament_group_teams.group_id AND t.host_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Hosts can delete group teams" ON public.tournament_group_teams FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.tournament_groups tg
    JOIN public.tournaments t ON t.id = tg.tournament_id
    WHERE tg.id = tournament_group_teams.group_id AND t.host_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 8. Triggers
CREATE TRIGGER update_tournament_stages_updated_at
  BEFORE UPDATE ON public.tournament_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.audit_stage_status_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO tournament_audit_log (tournament_id, user_id, action, details)
    VALUES (NEW.tournament_id, auth.uid(), 'stage_status_changed',
      jsonb_build_object('stage_id', NEW.id, 'stage_name', NEW.name, 'stage_number', NEW.stage_number, 'old_status', OLD.status, 'new_status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_stage_status_change_trigger
  AFTER UPDATE ON public.tournament_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_stage_status_change();

-- 9. Update rpc_approve_roster_change to support per-stage limits
CREATE OR REPLACE FUNCTION public.rpc_approve_roster_change(p_change_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE v_user_id UUID; v_change RECORD; v_tournament RECORD; v_approved_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_change FROM roster_changes WHERE id = p_change_id FOR UPDATE;
  IF v_change IS NULL THEN RAISE EXCEPTION 'Roster change not found'; END IF;
  IF v_change.status != 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;
  SELECT * INTO v_tournament FROM tournaments WHERE id = v_change.tournament_id;
  IF v_tournament.host_id != v_user_id THEN RAISE EXCEPTION 'Only host can approve'; END IF;

  IF v_change.stage_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_approved_count FROM roster_changes
    WHERE tournament_squad_id = v_change.tournament_squad_id
      AND stage_id = v_change.stage_id
      AND status = 'approved';
  ELSE
    SELECT COUNT(*) INTO v_approved_count FROM roster_changes
    WHERE tournament_squad_id = v_change.tournament_squad_id
      AND tournament_id = v_change.tournament_id
      AND status = 'approved';
  END IF;

  IF v_approved_count >= 2 THEN
    RAISE EXCEPTION 'Max roster changes (2) reached';
  END IF;

  UPDATE roster_changes SET status = 'approved', approved_by = v_user_id, approved_at = now() WHERE id = p_change_id;
END;
$$;

-- 10. Update validate_tournament_status_transition for multi-stage
CREATE OR REPLACE FUNCTION public.validate_tournament_status_transition()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE v_approved_count INTEGER; v_match_count INTEGER; v_completed_match_count INTEGER; v_incomplete_stages INTEGER;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;
  CASE OLD.status
    WHEN 'registration_open' THEN
      IF NEW.status NOT IN ('registration_closed') THEN RAISE EXCEPTION 'Cannot transition from registration_open to %', NEW.status; END IF;
    WHEN 'registration_closed' THEN
      IF NEW.status NOT IN ('bracket_generated') THEN RAISE EXCEPTION 'Cannot transition from registration_closed to %', NEW.status; END IF;
      SELECT COUNT(*) INTO v_approved_count FROM tournament_registrations WHERE tournament_id = NEW.id AND status = 'approved';
      IF v_approved_count < 2 THEN RAISE EXCEPTION 'Need at least 2 approved squads (currently %)', v_approved_count; END IF;
    WHEN 'bracket_generated' THEN
      IF NEW.status NOT IN ('ongoing') THEN RAISE EXCEPTION 'Cannot transition from bracket_generated to %', NEW.status; END IF;
    WHEN 'ongoing' THEN
      IF NEW.status NOT IN ('completed') THEN RAISE EXCEPTION 'Cannot transition from ongoing to %', NEW.status; END IF;
      SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed') INTO v_match_count, v_completed_match_count FROM tournament_matches WHERE tournament_id = NEW.id;
      IF v_match_count > 0 AND v_completed_match_count < v_match_count THEN RAISE EXCEPTION 'All matches must be completed (% of % done)', v_completed_match_count, v_match_count; END IF;
      IF NEW.is_multi_stage THEN
        SELECT COUNT(*) INTO v_incomplete_stages FROM tournament_stages WHERE tournament_id = NEW.id AND status != 'completed';
        IF v_incomplete_stages > 0 THEN RAISE EXCEPTION 'All stages must be completed (% incomplete)', v_incomplete_stages; END IF;
      END IF;
    WHEN 'completed' THEN RAISE EXCEPTION 'Cannot change status of a completed tournament';
    WHEN 'cancelled' THEN RAISE EXCEPTION 'Cannot change status of a cancelled tournament';
  END CASE;
  RETURN NEW;
END;
$$;

-- 11. Performance indexes
CREATE INDEX idx_tournament_stages_tournament ON public.tournament_stages(tournament_id, stage_number);
CREATE INDEX idx_tournament_groups_stage ON public.tournament_groups(stage_id);
CREATE INDEX idx_group_teams_group ON public.tournament_group_teams(group_id);
CREATE INDEX idx_matches_stage ON public.tournament_matches(stage_id) WHERE stage_id IS NOT NULL;
CREATE INDEX idx_matches_group ON public.tournament_matches(group_id) WHERE group_id IS NOT NULL;
