-- Phase 2.1: Status transition validation
-- Prevents invalid tournament status transitions

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
BEGIN
  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Always allow transition to cancelled
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Validate transitions
  CASE OLD.status
    WHEN 'registration_open' THEN
      IF NEW.status NOT IN ('registration_closed') THEN
        RAISE EXCEPTION 'Cannot transition from registration_open to %', NEW.status;
      END IF;

    WHEN 'registration_closed' THEN
      IF NEW.status NOT IN ('bracket_generated') THEN
        RAISE EXCEPTION 'Cannot transition from registration_closed to %', NEW.status;
      END IF;
      -- Require at least 2 approved squads
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
      -- Require all matches to be completed
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

DROP TRIGGER IF EXISTS validate_tournament_status ON public.tournaments;
CREATE TRIGGER validate_tournament_status
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tournament_status_transition();

-- Phase 2.2: Atomic RPC for tournament registration
-- Wraps squad creation + member insertion + registration in one transaction

CREATE OR REPLACE FUNCTION public.rpc_register_for_tournament(
  p_tournament_id UUID,
  p_squad_name TEXT,
  p_existing_squad_id UUID,
  p_logo_url TEXT,
  p_members JSONB -- array of {ign, mlbb_id, role, position, user_id}
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tournament RECORD;
  v_approved_count INTEGER;
  v_squad_id UUID;
  v_member JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock the tournament row to prevent races
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF v_tournament IS NULL THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  IF v_tournament.status != 'registration_open' THEN
    RAISE EXCEPTION 'Registration is not open for this tournament';
  END IF;

  -- Check capacity
  SELECT COUNT(*) INTO v_approved_count
  FROM tournament_registrations
  WHERE tournament_id = p_tournament_id AND status = 'approved';

  IF v_approved_count >= v_tournament.max_squads THEN
    RAISE EXCEPTION 'Tournament is full — no more spots available';
  END IF;

  -- Check duplicate registration
  IF EXISTS (
    SELECT 1 FROM tournament_registrations tr
    JOIN tournament_squads ts ON ts.id = tr.tournament_squad_id
    WHERE tr.tournament_id = p_tournament_id
      AND ts.existing_squad_id = p_existing_squad_id
  ) THEN
    RAISE EXCEPTION 'This squad is already registered for this tournament';
  END IF;

  -- Create tournament squad
  INSERT INTO tournament_squads (name, leader_id, existing_squad_id, logo_url)
  VALUES (p_squad_name, v_user_id, p_existing_squad_id, p_logo_url)
  RETURNING id INTO v_squad_id;

  -- Insert members
  FOR v_member IN SELECT * FROM jsonb_array_elements(p_members)
  LOOP
    INSERT INTO tournament_squad_members (
      tournament_squad_id, ign, mlbb_id, role, position, user_id, member_status
    ) VALUES (
      v_squad_id,
      v_member->>'ign',
      v_member->>'mlbb_id',
      (v_member->>'role')::squad_member_role,
      (v_member->>'position')::integer,
      CASE WHEN v_member->>'user_id' = '' OR v_member->>'user_id' IS NULL
        THEN NULL ELSE (v_member->>'user_id')::uuid END,
      'active'
    );
  END LOOP;

  -- Create registration
  INSERT INTO tournament_registrations (tournament_id, tournament_squad_id)
  VALUES (p_tournament_id, v_squad_id);

  RETURN v_squad_id;
END;
$$;

-- RPC for atomic roster change approval
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the change request
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

  -- Verify caller is tournament host
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = v_change.tournament_id;

  IF v_tournament.host_id != v_user_id THEN
    RAISE EXCEPTION 'Only the tournament host can approve roster changes';
  END IF;

  -- Check max 2 approved changes for this squad
  IF (
    SELECT COUNT(*) FROM roster_changes
    WHERE tournament_squad_id = v_change.tournament_squad_id
      AND tournament_id = v_change.tournament_id
      AND status = 'approved'
  ) >= 2 THEN
    RAISE EXCEPTION 'Maximum roster changes (2) reached for this squad';
  END IF;

  -- Update status - this will fire the apply_roster_change_on_approval trigger
  UPDATE roster_changes
  SET status = 'approved',
      approved_by = v_user_id,
      approved_at = now()
  WHERE id = p_change_id;
END;
$$;
