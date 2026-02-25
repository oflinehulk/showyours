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
      CASE WHEN v_position <= 5 THEN 'active' ELSE 'substitute' END
    );
  END LOOP;

  INSERT INTO tournament_registrations (tournament_id, tournament_squad_id, status)
  VALUES (p_tournament_id, v_tournament_squad_id, 'approved');

  RETURN v_tournament_squad_id;
END;
$$;