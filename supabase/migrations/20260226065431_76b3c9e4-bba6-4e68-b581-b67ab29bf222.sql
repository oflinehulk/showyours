
CREATE OR REPLACE FUNCTION public.rpc_recapture_roster_snapshots(p_tournament_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_host_id UUID;
  v_reg RECORD;
  v_original_squad_id UUID;
  v_member RECORD;
  v_position INTEGER;
  v_ign TEXT;
  v_mlbb TEXT;
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

  FOR v_reg IN
    SELECT tr.id AS reg_id, tr.tournament_squad_id, ts.existing_squad_id
    FROM tournament_registrations tr
    JOIN tournament_squads ts ON ts.id = tr.tournament_squad_id
    WHERE tr.tournament_id = p_tournament_id
      AND tr.status = 'approved'
      AND ts.existing_squad_id IS NOT NULL
  LOOP
    v_original_squad_id := v_reg.existing_squad_id;

    DELETE FROM tournament_squad_members
    WHERE tournament_squad_id = v_reg.tournament_squad_id;

    v_position := 0;
    FOR v_member IN
      SELECT
        sm.user_id AS sm_user_id,
        sm.ign AS sm_ign,
        sm.mlbb_id AS sm_mlbb_id,
        p.ign AS p_ign,
        p.mlbb_id AS p_mlbb_id
      FROM squad_members sm
      LEFT JOIN profiles p ON p.id = sm.profile_id
      WHERE sm.squad_id = v_original_squad_id
      ORDER BY sm.position ASC
    LOOP
      v_position := v_position + 1;
      v_ign := COALESCE(v_member.p_ign, v_member.sm_ign, 'Unknown');
      v_mlbb := COALESCE(v_member.p_mlbb_id, v_member.sm_mlbb_id, '');

      INSERT INTO tournament_squad_members (
        tournament_squad_id, ign, mlbb_id, role, position, user_id, member_status
      ) VALUES (
        v_reg.tournament_squad_id,
        v_ign,
        v_mlbb,
        CASE WHEN v_position <= 5 THEN 'main'::squad_member_role ELSE 'substitute'::squad_member_role END,
        v_position,
        v_member.sm_user_id,
        'active'
      );
    END LOOP;

    UPDATE tournament_registrations
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
        WHERE tsm.tournament_squad_id = v_reg.tournament_squad_id
          AND tsm.member_status = 'active'
      )
    WHERE id = v_reg.reg_id;
  END LOOP;
END;
$$;
