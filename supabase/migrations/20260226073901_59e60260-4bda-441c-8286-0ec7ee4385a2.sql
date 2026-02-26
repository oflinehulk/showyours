
-- 1. Add player_out_id column to roster_changes
ALTER TABLE public.roster_changes
  ADD COLUMN IF NOT EXISTS player_out_id uuid REFERENCES public.tournament_squad_members(id) ON DELETE SET NULL;

-- 2. Fix apply_roster_change() to prefer player_out_id lookup
CREATE OR REPLACE FUNCTION public.apply_roster_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old_member_id UUID; v_old_position INTEGER; v_old_role squad_member_role;
  v_squad_id UUID; v_tournament_id UUID;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    v_squad_id := NEW.tournament_squad_id; v_tournament_id := NEW.tournament_id;

    -- Try lookup by player_out_id first
    IF NEW.player_out_id IS NOT NULL THEN
      SELECT id, position, role INTO v_old_member_id, v_old_position, v_old_role
      FROM tournament_squad_members
      WHERE id = NEW.player_out_id
        AND tournament_squad_id = v_squad_id
        AND member_status = 'active'
      LIMIT 1;
    END IF;

    -- Fall back to IGN lookup
    IF v_old_member_id IS NULL THEN
      SELECT id, position, role INTO v_old_member_id, v_old_position, v_old_role
      FROM tournament_squad_members
      WHERE tournament_squad_id = v_squad_id
        AND ign = NEW.player_out_ign
        AND member_status = 'active'
      LIMIT 1;
    END IF;

    IF v_old_member_id IS NULL THEN
      RAISE EXCEPTION 'Player "%" not found as active member', NEW.player_out_ign;
    END IF;

    UPDATE tournament_squad_members SET member_status = 'inactive' WHERE id = v_old_member_id;

    INSERT INTO tournament_squad_members (tournament_squad_id, ign, mlbb_id, role, position, member_status)
    VALUES (v_squad_id, NEW.player_in_ign, NEW.player_in_mlbb_id, v_old_role, v_old_position, 'active');

    UPDATE tournament_registrations SET roster_snapshot = (
      SELECT jsonb_agg(jsonb_build_object('id', tsm.id, 'ign', tsm.ign, 'mlbb_id', tsm.mlbb_id, 'role', tsm.role, 'position', tsm.position))
      FROM tournament_squad_members tsm WHERE tsm.tournament_squad_id = v_squad_id AND tsm.member_status = 'active'
    ) WHERE tournament_id = v_tournament_id AND tournament_squad_id = v_squad_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Fix rpc_approve_roster_change() with FOR UPDATE locking
CREATE OR REPLACE FUNCTION public.rpc_approve_roster_change(p_change_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      AND status = 'approved'
    FOR UPDATE;
  ELSE
    SELECT COUNT(*) INTO v_approved_count FROM roster_changes
    WHERE tournament_squad_id = v_change.tournament_squad_id
      AND tournament_id = v_change.tournament_id
      AND status = 'approved'
    FOR UPDATE;
  END IF;

  IF v_approved_count >= 2 THEN
    RAISE EXCEPTION 'Max roster changes (2) reached';
  END IF;

  UPDATE roster_changes SET status = 'approved', approved_by = v_user_id, approved_at = now() WHERE id = p_change_id;
END;
$function$;

-- 4. Fix rpc_register_for_tournament() with member validation and COALESCE
CREATE OR REPLACE FUNCTION public.rpc_register_for_tournament(p_tournament_id uuid, p_squad_name text, p_existing_squad_id uuid, p_logo_url text, p_members jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_user_id UUID; v_tournament RECORD; v_approved_count INTEGER; v_squad_id UUID; v_member JSONB;
BEGIN
  v_user_id := auth.uid(); IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Validate members
  IF p_members IS NULL OR jsonb_array_length(p_members) < 5 THEN
    RAISE EXCEPTION 'Squad must have at least 5 members';
  END IF;

  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id FOR UPDATE;
  IF v_tournament IS NULL THEN RAISE EXCEPTION 'Tournament not found'; END IF;
  IF v_tournament.status != 'registration_open' THEN RAISE EXCEPTION 'Registration is not open'; END IF;
  SELECT COUNT(*) INTO v_approved_count FROM tournament_registrations WHERE tournament_id = p_tournament_id AND status = 'approved';
  IF v_approved_count >= v_tournament.max_squads THEN RAISE EXCEPTION 'Tournament is full'; END IF;
  IF EXISTS (SELECT 1 FROM tournament_registrations tr JOIN tournament_squads ts ON ts.id = tr.tournament_squad_id WHERE tr.tournament_id = p_tournament_id AND ts.existing_squad_id = p_existing_squad_id) THEN
    RAISE EXCEPTION 'This squad is already registered';
  END IF;
  INSERT INTO tournament_squads (name, leader_id, existing_squad_id, logo_url) VALUES (p_squad_name, v_user_id, p_existing_squad_id, p_logo_url) RETURNING id INTO v_squad_id;
  FOR v_member IN SELECT * FROM jsonb_array_elements(p_members) LOOP
    INSERT INTO tournament_squad_members (tournament_squad_id, ign, mlbb_id, role, position, user_id, member_status)
    VALUES (v_squad_id, v_member->>'ign', COALESCE(v_member->>'mlbb_id', ''), (v_member->>'role')::squad_member_role, (v_member->>'position')::integer,
      CASE WHEN v_member->>'user_id' = '' OR v_member->>'user_id' IS NULL THEN NULL ELSE (v_member->>'user_id')::uuid END, 'active');
  END LOOP;
  INSERT INTO tournament_registrations (tournament_id, tournament_squad_id) VALUES (p_tournament_id, v_squad_id);
  RETURN v_squad_id;
END;
$function$;

-- 5. Add CHECK constraint on roster_changes.status (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'roster_changes_status_check'
  ) THEN
    ALTER TABLE public.roster_changes
      ADD CONSTRAINT roster_changes_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- 6. Fix validate_tournament_status_transition() — guard bracket_generated -> registration_closed
CREATE OR REPLACE FUNCTION public.validate_tournament_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_approved_count INT;
  v_stage_count INT;
  v_completed_stage_count INT;
  v_match_count INT;
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
      IF NEW.is_multi_stage THEN
        IF NEW.status NOT IN ('registration_open', 'bracket_generated', 'ongoing') THEN
          RAISE EXCEPTION 'Cannot transition from registration_closed to %', NEW.status;
        END IF;
      ELSE
        IF NEW.status NOT IN ('registration_open', 'bracket_generated') THEN
          RAISE EXCEPTION 'Cannot transition from registration_closed to %', NEW.status;
        END IF;
      END IF;

      IF NEW.status <> 'registration_open' THEN
        SELECT COUNT(*) INTO v_approved_count
        FROM tournament_registrations
        WHERE tournament_id = NEW.id AND status = 'approved';

        IF v_approved_count < 2 THEN
          RAISE EXCEPTION 'Need at least 2 approved squads to generate bracket (currently %)', v_approved_count;
        END IF;
      END IF;

    WHEN 'bracket_generated' THEN
      IF NEW.status NOT IN ('ongoing', 'registration_closed') THEN
        RAISE EXCEPTION 'Cannot transition from bracket_generated to %', NEW.status;
      END IF;

      -- Guard backward transition: no matches must exist
      IF NEW.status = 'registration_closed' THEN
        SELECT COUNT(*) INTO v_match_count
        FROM tournament_matches
        WHERE tournament_id = NEW.id;

        IF v_match_count > 0 THEN
          RAISE EXCEPTION 'Cannot revert to registration_closed: % matches still exist. Reset the bracket first.', v_match_count;
        END IF;
      END IF;

    WHEN 'ongoing' THEN
      IF NEW.is_multi_stage THEN
        IF NEW.status NOT IN ('completed', 'registration_closed') THEN
          RAISE EXCEPTION 'Cannot transition from ongoing to %', NEW.status;
        END IF;
      ELSE
        IF NEW.status NOT IN ('completed') THEN
          RAISE EXCEPTION 'Cannot transition from ongoing to %', NEW.status;
        END IF;
      END IF;

      IF NEW.status = 'completed' AND NEW.is_multi_stage THEN
        SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
        INTO v_stage_count, v_completed_stage_count
        FROM tournament_stages
        WHERE tournament_id = NEW.id;

        IF v_stage_count > 0 AND v_completed_stage_count < v_stage_count THEN
          RAISE EXCEPTION 'Cannot complete tournament: % of % stages completed', v_completed_stage_count, v_stage_count;
        END IF;
      END IF;

    WHEN 'completed' THEN
      RAISE EXCEPTION 'Cannot change status of a completed tournament';

    WHEN 'cancelled' THEN
      RAISE EXCEPTION 'Cannot change status of a cancelled tournament';
  END CASE;

  RETURN NEW;
END;
$function$;
