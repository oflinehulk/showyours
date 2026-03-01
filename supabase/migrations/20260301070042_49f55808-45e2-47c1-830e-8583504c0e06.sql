
CREATE OR REPLACE FUNCTION public.atomic_replace_tournament_matches(
  p_tournament_id uuid,
  p_new_matches jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_host_id UUID;
  v_match JSONB;
  v_count INTEGER := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT host_id INTO v_host_id FROM tournaments WHERE id = p_tournament_id;
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;
  IF v_host_id != v_user_id AND NOT public.has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Only the tournament host can replace matches';
  END IF;

  DELETE FROM tournament_matches WHERE tournament_id = p_tournament_id;

  FOR v_match IN SELECT * FROM jsonb_array_elements(p_new_matches)
  LOOP
    INSERT INTO tournament_matches (
      tournament_id, round, match_number, squad_a_id, squad_b_id,
      status, best_of, bracket_type, stage_id, group_id,
      scheduled_time, toss_winner, blue_side_team, red_side_team, toss_completed_at
    ) VALUES (
      p_tournament_id,
      (v_match->>'round')::integer,
      (v_match->>'match_number')::integer,
      NULLIF(v_match->>'squad_a_id', '')::uuid,
      NULLIF(v_match->>'squad_b_id', '')::uuid,
      COALESCE((v_match->>'status')::match_status, 'pending'),
      COALESCE((v_match->>'best_of')::integer, 1),
      v_match->>'bracket_type',
      NULLIF(v_match->>'stage_id', '')::uuid,
      NULLIF(v_match->>'group_id', '')::uuid,
      CASE WHEN v_match->>'scheduled_time' IS NOT NULL AND v_match->>'scheduled_time' != '' THEN (v_match->>'scheduled_time')::timestamptz ELSE NULL END,
      NULLIF(v_match->>'toss_winner', '')::uuid,
      NULLIF(v_match->>'blue_side_team', '')::uuid,
      NULLIF(v_match->>'red_side_team', '')::uuid,
      CASE WHEN v_match->>'toss_completed_at' IS NOT NULL AND v_match->>'toss_completed_at' != '' THEN (v_match->>'toss_completed_at')::timestamptz ELSE NULL END
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
