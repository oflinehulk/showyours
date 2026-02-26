-- 1. Allow registration_closed → registration_open transition
CREATE OR REPLACE FUNCTION public.validate_tournament_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_approved_count INT;
  v_stage_count INT;
  v_completed_stage_count INT;
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
$$;

-- 2. Fix rpc_host_add_squad: all members get member_status='active'
CREATE OR REPLACE FUNCTION public.rpc_host_add_squad(
  p_tournament_id UUID,
  p_squad_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tournament RECORD;
  v_squad RECORD;
  v_approved_count INTEGER;
  v_tournament_squad_id UUID;
  v_member RECORD;
  v_position INTEGER := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF v_tournament IS NULL THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  IF v_tournament.host_id != v_user_id THEN
    RAISE EXCEPTION 'Only the tournament host can add squads';
  END IF;

  IF v_tournament.status != 'registration_closed' THEN
    RAISE EXCEPTION 'Squads can only be added when registration is closed';
  END IF;

  SELECT COUNT(*) INTO v_approved_count
  FROM tournament_registrations
  WHERE tournament_id = p_tournament_id AND status = 'approved';

  IF v_approved_count >= v_tournament.max_squads THEN
    RAISE EXCEPTION 'Tournament is full — no more spots available';
  END IF;

  IF EXISTS (
    SELECT 1 FROM tournament_registrations tr
    JOIN tournament_squads ts ON ts.id = tr.tournament_squad_id
    WHERE tr.tournament_id = p_tournament_id
      AND ts.existing_squad_id = p_squad_id
  ) THEN
    RAISE EXCEPTION 'This squad is already registered for this tournament';
  END IF;

  SELECT * INTO v_squad
  FROM squads
  WHERE id = p_squad_id;

  IF v_squad IS NULL THEN
    RAISE EXCEPTION 'Squad not found';
  END IF;

  IF v_squad.member_count < 5 THEN
    RAISE EXCEPTION 'Squad must have at least 5 members';
  END IF;

  INSERT INTO tournament_squads (name, leader_id, existing_squad_id, logo_url)
  VALUES (v_squad.name, v_squad.owner_id, p_squad_id, v_squad.logo_url)
  RETURNING id INTO v_tournament_squad_id;

  FOR v_member IN
    SELECT sm.*, p.ign AS profile_ign, p.mlbb_id AS profile_mlbb_id
    FROM squad_members sm
    LEFT JOIN profiles p ON p.id = sm.profile_id
    WHERE sm.squad_id = p_squad_id
    ORDER BY sm.position ASC
  LOOP
    v_position := v_position + 1;

    INSERT INTO tournament_squad_members (
      tournament_squad_id, ign, mlbb_id, role, position, user_id, member_status
    ) VALUES (
      v_tournament_squad_id,
      COALESCE(v_member.profile_ign, v_member.ign),
      COALESCE(v_member.profile_mlbb_id, v_member.mlbb_id),
      CASE WHEN v_position <= 5 THEN 'main'::squad_member_role ELSE 'substitute'::squad_member_role END,
      v_position,
      v_member.user_id,
      'active'
    );
  END LOOP;

  INSERT INTO tournament_registrations (tournament_id, tournament_squad_id, status)
  VALUES (p_tournament_id, v_tournament_squad_id, 'approved');

  RETURN v_tournament_squad_id;
END;
$$;

-- 3. Lock rosters on close, UNLOCK rosters on reopen
CREATE OR REPLACE FUNCTION public.lock_tournament_rosters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Lock rosters when closing registration
  IF NEW.status IN ('registration_closed', 'bracket_generated', 'ongoing')
     AND OLD.status = 'registration_open' THEN
    UPDATE tournament_registrations tr
    SET
      roster_locked = true,
      roster_locked_at = now(),
      roster_snapshot = (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', tsm.id,
            'ign', tsm.ign,
            'mlbb_id', tsm.mlbb_id,
            'role', tsm.role,
            'position', tsm.position
          )
        )
        FROM tournament_squad_members tsm
        WHERE tsm.tournament_squad_id = tr.tournament_squad_id
          AND tsm.member_status = 'active'
      )
    WHERE tr.tournament_id = NEW.id
      AND tr.roster_locked = false;
  END IF;

  -- Unlock rosters when reopening registration
  IF NEW.status = 'registration_open' AND OLD.status = 'registration_closed' THEN
    UPDATE tournament_registrations
    SET
      roster_locked = false,
      roster_locked_at = NULL,
      roster_snapshot = '[]'::jsonb
    WHERE tournament_id = NEW.id
      AND roster_locked = true;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. New RPC: host manually recaptures roster snapshots for all approved squads
CREATE OR REPLACE FUNCTION public.rpc_recapture_roster_snapshots(p_tournament_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_host_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT host_id INTO v_host_id
  FROM tournaments
  WHERE id = p_tournament_id;

  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  IF v_host_id != v_user_id THEN
    RAISE EXCEPTION 'Only the tournament host can recapture roster snapshots';
  END IF;

  UPDATE tournament_registrations tr
  SET
    roster_locked = true,
    roster_locked_at = now(),
    roster_snapshot = (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', tsm.id,
          'ign', tsm.ign,
          'mlbb_id', tsm.mlbb_id,
          'role', tsm.role,
          'position', tsm.position
        )
      )
      FROM tournament_squad_members tsm
      WHERE tsm.tournament_squad_id = tr.tournament_squad_id
        AND tsm.member_status = 'active'
    )
  WHERE tr.tournament_id = p_tournament_id
    AND tr.status = 'approved';
END;
$$;