
-- Host can directly edit locked rosters: add, remove, or swap members
CREATE OR REPLACE FUNCTION public.rpc_host_edit_roster(
  p_tournament_id UUID,
  p_tournament_squad_id UUID,
  p_action TEXT,              -- 'add', 'remove', 'swap'
  p_member_id UUID DEFAULT NULL,       -- existing member id (for remove/swap)
  p_new_ign TEXT DEFAULT NULL,         -- new player IGN (for add/swap)
  p_new_mlbb_id TEXT DEFAULT NULL,     -- new player MLBB ID (for add/swap)
  p_new_role TEXT DEFAULT 'substitute', -- 'main' or 'substitute' (for add/swap)
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tournament RECORD;
  v_old_member RECORD;
  v_new_member_id UUID;
  v_max_position INTEGER;
  v_result_action TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify tournament and host
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  IF v_tournament IS NULL THEN RAISE EXCEPTION 'Tournament not found'; END IF;
  IF v_tournament.host_id != v_user_id AND NOT public.has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Only the tournament host or admin can edit rosters';
  END IF;

  -- Verify the squad belongs to this tournament
  IF NOT EXISTS (
    SELECT 1 FROM tournament_registrations
    WHERE tournament_id = p_tournament_id AND tournament_squad_id = p_tournament_squad_id
  ) THEN
    RAISE EXCEPTION 'Squad is not registered in this tournament';
  END IF;

  -- === REMOVE ===
  IF p_action = 'remove' THEN
    IF p_member_id IS NULL THEN
      RAISE EXCEPTION 'member_id is required for remove action';
    END IF;

    SELECT * INTO v_old_member
    FROM tournament_squad_members
    WHERE id = p_member_id AND tournament_squad_id = p_tournament_squad_id AND member_status = 'active';

    IF v_old_member IS NULL THEN
      RAISE EXCEPTION 'Active member not found';
    END IF;

    UPDATE tournament_squad_members SET member_status = 'removed_by_host' WHERE id = p_member_id;
    v_result_action := 'removed';

  -- === ADD ===
  ELSIF p_action = 'add' THEN
    IF p_new_ign IS NULL OR trim(p_new_ign) = '' THEN
      RAISE EXCEPTION 'IGN is required for add action';
    END IF;
    IF p_new_mlbb_id IS NULL OR trim(p_new_mlbb_id) = '' THEN
      RAISE EXCEPTION 'MLBB ID is required for add action';
    END IF;

    SELECT COALESCE(MAX(position), 0) INTO v_max_position
    FROM tournament_squad_members
    WHERE tournament_squad_id = p_tournament_squad_id AND member_status = 'active';

    INSERT INTO tournament_squad_members (
      tournament_squad_id, ign, mlbb_id, role, position, member_status
    ) VALUES (
      p_tournament_squad_id, trim(p_new_ign), trim(p_new_mlbb_id),
      p_new_role::squad_member_role, v_max_position + 1, 'active'
    ) RETURNING id INTO v_new_member_id;

    v_result_action := 'added';

  -- === SWAP ===
  ELSIF p_action = 'swap' THEN
    IF p_member_id IS NULL THEN
      RAISE EXCEPTION 'member_id is required for swap action';
    END IF;
    IF p_new_ign IS NULL OR trim(p_new_ign) = '' THEN
      RAISE EXCEPTION 'IGN is required for swap action';
    END IF;
    IF p_new_mlbb_id IS NULL OR trim(p_new_mlbb_id) = '' THEN
      RAISE EXCEPTION 'MLBB ID is required for swap action';
    END IF;

    SELECT * INTO v_old_member
    FROM tournament_squad_members
    WHERE id = p_member_id AND tournament_squad_id = p_tournament_squad_id AND member_status = 'active';

    IF v_old_member IS NULL THEN
      RAISE EXCEPTION 'Active member not found';
    END IF;

    UPDATE tournament_squad_members SET member_status = 'replaced_by_host' WHERE id = p_member_id;

    INSERT INTO tournament_squad_members (
      tournament_squad_id, ign, mlbb_id, role, position, member_status
    ) VALUES (
      p_tournament_squad_id, trim(p_new_ign), trim(p_new_mlbb_id),
      v_old_member.role, v_old_member.position, 'active'
    ) RETURNING id INTO v_new_member_id;

    v_result_action := 'swapped';

  ELSE
    RAISE EXCEPTION 'Invalid action: %. Use add, remove, or swap.', p_action;
  END IF;

  -- Update roster snapshot
  UPDATE tournament_registrations
  SET roster_snapshot = (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', tsm.id,
        'ign', tsm.ign,
        'mlbb_id', tsm.mlbb_id,
        'role', tsm.role,
        'position', tsm.position
      )
    ), '[]'::jsonb)
    FROM tournament_squad_members tsm
    WHERE tsm.tournament_squad_id = p_tournament_squad_id AND tsm.member_status = 'active'
  )
  WHERE tournament_id = p_tournament_id AND tournament_squad_id = p_tournament_squad_id;

  -- Audit log
  INSERT INTO tournament_audit_log (tournament_id, user_id, action, details)
  VALUES (p_tournament_id, v_user_id, 'host_roster_edit',
    jsonb_build_object(
      'action', p_action,
      'squad_id', p_tournament_squad_id,
      'member_id', p_member_id,
      'old_ign', v_old_member.ign,
      'new_ign', p_new_ign,
      'new_mlbb_id', p_new_mlbb_id,
      'new_role', p_new_role,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object('success', true, 'action', v_result_action);
END;
$$;
