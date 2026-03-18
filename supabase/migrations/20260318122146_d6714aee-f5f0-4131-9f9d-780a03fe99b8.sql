CREATE OR REPLACE FUNCTION public.rpc_advance_match_winner(
  p_match_id uuid,
  p_winner_id uuid,
  p_squad_a_score int,
  p_squad_b_score int,
  p_screenshot_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_match RECORD;
  v_tournament RECORD;
  v_k INT;
  v_loser_id UUID;
  v_next_match RECORD;
  v_slot TEXT;
  v_lb_round INT;
  v_next_mn INT;
  v_offset INT;
  v_placed_match_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_match FROM tournament_matches WHERE id = p_match_id FOR UPDATE;
  IF v_match IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.status NOT IN ('pending', 'ongoing') THEN
    RAISE EXCEPTION 'Match is already % and cannot be updated', v_match.status;
  END IF;

  SELECT * INTO v_tournament FROM tournaments WHERE id = v_match.tournament_id;
  IF v_tournament.host_id != v_user_id AND NOT public.has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Only the tournament host can advance match results';
  END IF;

  IF p_winner_id != v_match.squad_a_id AND p_winner_id != v_match.squad_b_id THEN
    RAISE EXCEPTION 'Winner must be one of the match teams';
  END IF;

  UPDATE tournament_matches SET
    status = 'completed',
    winner_id = p_winner_id,
    squad_a_score = p_squad_a_score,
    squad_b_score = p_squad_b_score,
    completed_at = now(),
    result_screenshot = COALESCE(p_screenshot_url, result_screenshot)
  WHERE id = p_match_id;

  v_loser_id := CASE WHEN p_winner_id = v_match.squad_a_id THEN v_match.squad_b_id ELSE v_match.squad_a_id END;

  v_k := 0;
  IF v_match.stage_id IS NOT NULL THEN
    SELECT COALESCE(lb_initial_rounds, 0) INTO v_k FROM tournament_stages WHERE id = v_match.stage_id;
  END IF;

  IF v_match.bracket_type = 'winners' THEN
    v_next_mn := CEIL(v_match.match_number::numeric / 2);
    v_slot := CASE WHEN v_match.match_number % 2 = 1 THEN 'squad_a_id' ELSE 'squad_b_id' END;

    SELECT * INTO v_next_match FROM tournament_matches
    WHERE tournament_id = v_match.tournament_id
      AND round = v_match.round + 1
      AND match_number = v_next_mn
      AND bracket_type IN ('winners', 'finals')
      AND (v_match.stage_id IS NULL OR stage_id = v_match.stage_id)
    LIMIT 1;

    IF FOUND THEN
      IF v_slot = 'squad_a_id' THEN
        UPDATE tournament_matches SET squad_a_id = p_winner_id WHERE id = v_next_match.id;
      ELSE
        UPDATE tournament_matches SET squad_b_id = p_winner_id WHERE id = v_next_match.id;
      END IF;
      PERFORM _check_and_complete_bye(v_match.tournament_id, v_next_match.id);
    ELSE
      UPDATE tournament_matches SET squad_a_id = p_winner_id
      WHERE tournament_id = v_match.tournament_id AND bracket_type = 'finals' AND match_number = 1
        AND (v_match.stage_id IS NULL OR stage_id = v_match.stage_id);
    END IF;

    IF v_loser_id IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM tournament_matches WHERE tournament_id = v_match.tournament_id AND bracket_type = 'losers' LIMIT 1) THEN
        IF v_k > 0 THEN
          SELECT * INTO v_next_match FROM tournament_matches
          WHERE tournament_id = v_match.tournament_id
            AND round = v_match.round + 1
            AND match_number = CEIL(v_match.match_number::numeric / 2)
            AND bracket_type = 'winners'
            AND (v_match.stage_id IS NULL OR stage_id = v_match.stage_id)
          LIMIT 1;

          IF NOT FOUND THEN
            UPDATE tournament_matches SET squad_a_id = v_loser_id
            WHERE tournament_id = v_match.tournament_id AND bracket_type = 'semi_finals' AND match_number = 1
              AND (v_match.stage_id IS NULL OR stage_id = v_match.stage_id);
          ELSE
            v_lb_round := v_k + 2 * v_match.round - 1;
            SELECT * INTO v_next_match FROM tournament_matches
            WHERE tournament_id = v_match.tournament_id AND bracket_type = 'losers'
              AND round = v_lb_round AND match_number = v_match.match_number
              AND (v_match.stage_id IS NULL OR stage_id = v_match.stage_id)
            LIMIT 1;
            IF FOUND THEN
              UPDATE tournament_matches SET squad_b_id = v_loser_id WHERE id = v_next_match.id;
              PERFORM _check_and_complete_bye(v_match.tournament_id, v_next_match.id);
            END IF;
          END IF;
        ELSE
          IF v_match.round = 1 THEN
            v_next_mn := CEIL(v_match.match_number::numeric / 2);
            v_slot := CASE WHEN v_match.match_number % 2 = 1 THEN 'squad_a_id' ELSE 'squad_b_id' END;
            SELECT * INTO v_next_match FROM tournament_matches
            WHERE tournament_id = v_match.tournament_id AND bracket_type = 'losers'
              AND round = 1 AND match_number = v_next_mn
              AND (v_match.stage_id IS NULL OR stage_id = v_match.stage_id)
            LIMIT 1;
            IF FOUND THEN
              IF v_slot = 'squad_a_id' THEN
                UPDATE tournament_matches SET squad_a_id = v_loser_id WHERE id = v_next_match.id;
              ELSE
                UPDATE tournament_matches SET squad_b_id = v_loser_id WHERE id = v_next_match.id;
              END IF;
              PERFORM _check_and_complete_bye(v_match.tournament_id, v_next_match.id);
            END IF;
          ELSE
            v_lb_round := 2 * (v_match.round - 1);
            SELECT * INTO v_next_match FROM tournament_matches
            WHERE tournament_id = v_match.tournament_id AND bracket_type = 'losers'
              AND round = v_lb_round AND match_number = v_match.match_number
              AND (v_match.stage_id IS NULL OR stage_id = v_match.stage_id)
            LIMIT 1;
            IF FOUND THEN
              UPDATE tournament_matches SET squad_b_id = v_loser_id WHERE id = v_next_match.id;
              PERFORM _check_and_complete_bye(v_match.tournament_id, v_next_match.id);
            END IF;
          END IF;
        END IF;
      END IF;
    END IF;

  ELSIF v_match.bracket_type = 'semi_finals' THEN
    UPDATE tournament_matches SET squad_b_id = p_winner_id
    WHERE tournament_id = v_match.tournament_id AND bracket_type = 'finals' AND match_number = 1
      AND (v_match.stage_id IS NULL OR stage_id = v_match.stage_id);

  ELSIF v_match.bracket_type = 'losers' THEN
    IF v_k > 0 THEN
      v_offset := v_match.round - v_k;
      IF v_match.round < v_k THEN
        v_next_mn := CEIL(v_match.match_number::numeric / 2);
        v_slot := CASE WHEN v_match.match_number % 2 = 1 THEN 'squad_a_id' ELSE 'squad_b_id' END;
        SELECT * INTO v_next_match FROM tournament_matches
        WHERE tournament_id = v_match.tournament_id AND bracket_type = 'losers'
          AND round = v_match.round + 1 AND match_number = v_next_mn
          AND (v_match.stage_id IS NULL OR stage_id = v_match.stage_id)
        LIMIT 1;
        IF FOUND THEN
          IF v_slot = 'squad_a_id' THEN
            UPDATE tournament_matches SET squad_a_id = p_winner_id WHERE id = v_next_match.id;
          ELSE
            UPDATE tournament_matches SET squad_b_id = p_winner_id WHERE id = v_next_match.id;
          END IF;
          PERFORM _check_and_complete_bye(v_match.tournament_id, v_next_match.id);
        END IF;
      ELSIF v_match.round = v_k OR v_offset % 2 = 0 THEN
        SELECT * INTO v_next_match FROM tournament_matches
        WHERE tournament_id = v_match.tournament_id AND bracket_type = 'losers'
          AND round = v_match.round + 1 AND match_number = v_match.match_number
          AND (v_match.stage_id IS NULL OR stage_id = v_match.stage_id)
        LIMIT 1;
        IF FOUND THEN
          UPDATE tournament_matches SET squad_a_id = p_winner_id WHERE id = v_next_match.id;
          PERFORM _check_and_complete_bye(v_match.tournament_id, v_next_match.id);
        ELSE
          SELECT * INTO v_next_match FROM tournament_matches
          WHERE tournament_id = v_match.tournament_id AND bracket_type = 'semi_finals' AND match_number = 1
            AND (v_match.stage_id IS NULL OR stage_id = v_match.stage_id)
          LIMIT 1;
          IF FOUND THEN
            UPDATE tournament_matches SET squad_b_id = p_winner_id WHERE id = v_next_match.id;
          ELSE
            UPDATE tournament_matches SET squad_b_id = p_winner_id
            WHERE tournament_id = v_match.tournament_id AND bracket_type = 'finals' AND match_number = 1
              AND (v_match.stage_id IS NULL OR stage_id = v_match.stage_id);
          END IF;
        END IF;
      ELSE
        v_next_mn := CEIL(v_match.match_number::numeric / 2);
        v_slot := CASE WHEN v_match.match_number % 2 = 1 THEN 'squad_a_id' ELSE 'squad_b_id' END;
        SELECT * INTO v_next_match FROM tournament_matches
        WHERE tournament_id = v_match.tournament_id AND bracket_type = 'losers'
          AND round = v_match.round + 1 AND match_number = v_next_mn
          AND (v_match.stage_id IS NULL OR stage_id = v_match.stage_id)
        LIMIT 1;
        IF FOUND THEN
          IF v_slot = 'squad_a_id' THEN
            UPDATE tournament_matches SET squad_a_id = p_winner_id WHERE id = v_next_match.id;
          ELSE
            UPDATE tournament_matches SET squad_b_id = p_winner_id WHERE id = v_next_match.id;
          END IF;
          PERFORM _check_and_complete_bye(v_match.tournament_id, v_next_match.id);
        ELSE
          SELECT * INTO v_next_match FROM tournament_matches
          WHERE tournament_id = v_match.tournament_id AND bracket_type = 'semi_finals' AND match_number = 1
            AND (v_match.stage_id IS NULL OR stage_id = v_match.stage_id)
          LIMIT 1;
          IF FOUND THEN
            UPDATE tournament_matches SET squad_b_id = p_winner_id WHERE id = v_next_match.id;
          ELSE
            UPDATE tournament_matches SET squad_b_id = p_winner_id
            WHERE tournament_id = v_match.tournament_id AND bracket_type = 'finals' AND match_number = 1
              AND (v_match.stage_id IS NULL OR stage_id = v_match.stage_id);
          END IF;
        END IF;
      END IF;
    ELSE
      IF v_match.round % 2 = 1 THEN
        SELECT * INTO v_next_match FROM tournament_matches
        WHERE tournament_id = v_match.tournament_id AND bracket_type = 'losers'
          AND round = v_match.round + 1 AND match_number = v_match.match_number
          AND (v_match.stage_id IS NULL OR stage_id = v_match.stage_id)
        LIMIT 1;
        IF FOUND THEN
          UPDATE tournament_matches SET squad_a_id = p_winner_id WHERE id = v_next_match.id;
          PERFORM _check_and_complete_bye(v_match.tournament_id, v_next_match.id);
        ELSE
          UPDATE tournament_matches SET squad_b_id = p_winner_id
          WHERE tournament_id = v_match.tournament_id AND bracket_type = 'finals' AND match_number = 1
            AND (v_match.stage_id IS NULL OR stage_id = v_match.stage_id);
        END IF;
      ELSE
        v_next_mn := CEIL(v_match.match_number::numeric / 2);
        v_slot := CASE WHEN v_match.match_number % 2 = 1 THEN 'squad_a_id' ELSE 'squad_b_id' END;
        SELECT * INTO v_next_match FROM tournament_matches
        WHERE tournament_id = v_match.tournament_id AND bracket_type = 'losers'
          AND round = v_match.round + 1 AND match_number = v_next_mn
          AND (v_match.stage_id IS NULL OR stage_id = v_match.stage_id)
        LIMIT 1;
        IF FOUND THEN
          IF v_slot = 'squad_a_id' THEN
            UPDATE tournament_matches SET squad_a_id = p_winner_id WHERE id = v_next_match.id;
          ELSE
            UPDATE tournament_matches SET squad_b_id = p_winner_id WHERE id = v_next_match.id;
          END IF;
          PERFORM _check_and_complete_bye(v_match.tournament_id, v_next_match.id);
        ELSE
          UPDATE tournament_matches SET squad_b_id = p_winner_id
          WHERE tournament_id = v_match.tournament_id AND bracket_type = 'finals' AND match_number = 1
            AND (v_match.stage_id IS NULL OR stage_id = v_match.stage_id);
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'match_id', p_match_id,
    'winner_id', p_winner_id,
    'squad_a_score', p_squad_a_score,
    'squad_b_score', p_squad_b_score
  );
END;
$function$