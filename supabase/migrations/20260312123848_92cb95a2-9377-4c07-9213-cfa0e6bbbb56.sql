
CREATE OR REPLACE FUNCTION public.rpc_wild_card_add(
  p_tournament_id uuid,
  p_squad_id uuid,
  p_match_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_tournament RECORD;
  v_match RECORD;
  v_tournament_squad_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  IF v_tournament IS NULL THEN RAISE EXCEPTION 'Tournament not found'; END IF;
  IF v_tournament.host_id != v_user_id AND NOT public.has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Only the tournament host can add wild card squads';
  END IF;

  -- Validate the match is a LB Round 1 BYE
  SELECT * INTO v_match FROM tournament_matches WHERE id = p_match_id AND tournament_id = p_tournament_id;
  IF v_match IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.bracket_type != 'losers' THEN RAISE EXCEPTION 'Wild card can only be added to Lower Bracket matches'; END IF;
  IF v_match.status != 'pending' AND v_match.status != 'completed' THEN RAISE EXCEPTION 'Match is not available for wild card'; END IF;

  -- Must be a BYE match (one side empty or completed with one side)
  IF v_match.squad_a_id IS NOT NULL AND v_match.squad_b_id IS NOT NULL THEN
    RAISE EXCEPTION 'This match already has two teams — not a BYE';
  END IF;

  -- Check squad not already registered
  IF EXISTS (
    SELECT 1 FROM tournament_registrations tr
    JOIN tournament_squads ts ON ts.id = tr.tournament_squad_id
    WHERE tr.tournament_id = p_tournament_id
      AND ts.existing_squad_id = p_squad_id
      AND tr.status != 'withdrawn'
  ) THEN
    RAISE EXCEPTION 'This squad is already registered for this tournament';
  END IF;

  -- Use rpc_host_add_squad to create the tournament squad + registration
  v_tournament_squad_id := public.rpc_host_add_squad(p_tournament_id, p_squad_id);

  -- Now fill the BYE match with the new squad
  IF v_match.squad_a_id IS NULL AND v_match.squad_b_id IS NOT NULL THEN
    UPDATE tournament_matches
    SET squad_a_id = v_tournament_squad_id,
        status = 'pending',
        winner_id = NULL,
        completed_at = NULL
    WHERE id = p_match_id;
  ELSIF v_match.squad_b_id IS NULL AND v_match.squad_a_id IS NOT NULL THEN
    UPDATE tournament_matches
    SET squad_b_id = v_tournament_squad_id,
        status = 'pending',
        winner_id = NULL,
        completed_at = NULL
    WHERE id = p_match_id;
  ELSIF v_match.squad_a_id IS NULL AND v_match.squad_b_id IS NULL THEN
    -- Both sides empty — put wild card in squad_a
    UPDATE tournament_matches
    SET squad_a_id = v_tournament_squad_id,
        status = 'pending',
        winner_id = NULL,
        completed_at = NULL
    WHERE id = p_match_id;
  END IF;

  -- Audit log
  INSERT INTO tournament_audit_log (tournament_id, user_id, action, details)
  VALUES (p_tournament_id, v_user_id, 'wild_card_added',
    jsonb_build_object(
      'squad_id', p_squad_id,
      'tournament_squad_id', v_tournament_squad_id,
      'match_id', p_match_id,
      'bracket_type', v_match.bracket_type,
      'round', v_match.round
    )
  );

  RETURN v_tournament_squad_id;
END;
$function$;
