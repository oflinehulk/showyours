CREATE OR REPLACE FUNCTION public._check_and_complete_bye(
  p_tournament_id uuid,
  p_match_id uuid,
  p_depth int DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_m RECORD;
  v_winner_id UUID;
  v_win_score INT;
  v_k INT;
  v_next RECORD;
  v_next_mn INT;
  v_slot TEXT;
  v_offset INT;
  v_lb_round INT;
  v_loser_id UUID;
BEGIN
  IF p_depth > 20 THEN RETURN; END IF;

  SELECT * INTO v_m FROM tournament_matches WHERE id = p_match_id;
  IF v_m IS NULL OR v_m.status != 'pending' THEN RETURN; END IF;

  IF v_m.squad_a_id IS NOT NULL AND v_m.squad_b_id IS NOT NULL THEN RETURN; END IF;
  IF v_m.squad_a_id IS NULL AND v_m.squad_b_id IS NULL THEN RETURN; END IF;

  v_winner_id := COALESCE(v_m.squad_a_id, v_m.squad_b_id);
  v_win_score := CEIL(COALESCE(v_m.best_of, 1)::numeric / 2);

  UPDATE tournament_matches SET
    status = 'completed',
    winner_id = v_winner_id,
    squad_a_score = CASE WHEN v_m.squad_a_id IS NOT NULL THEN v_win_score ELSE 0 END,
    squad_b_score = CASE WHEN v_m.squad_b_id IS NOT NULL THEN v_win_score ELSE 0 END,
    completed_at = now()
  WHERE id = p_match_id;

  v_k := 0;
  IF v_m.stage_id IS NOT NULL THEN
    SELECT COALESCE(lb_initial_rounds, 0) INTO v_k FROM tournament_stages WHERE id = v_m.stage_id;
  END IF;

  IF v_m.bracket_type = 'winners' THEN
    v_next_mn := CEIL(v_m.match_number::numeric / 2);
    v_slot := CASE WHEN v_m.match_number % 2 = 1 THEN 'squad_a_id' ELSE 'squad_b_id' END;

    SELECT * INTO v_next FROM tournament_matches
    WHERE tournament_id = p_tournament_id AND bracket_type IN ('winners','finals')
      AND round = v_m.round + 1 AND match_number = v_next_mn
      AND (v_m.stage_id IS NULL OR stage_id = v_m.stage_id)
    LIMIT 1;

    IF FOUND THEN
      IF v_slot = 'squad_a_id' THEN
        UPDATE tournament_matches SET squad_a_id = v_winner_id WHERE id = v_next.id;
      ELSE
        UPDATE tournament_matches SET squad_b_id = v_winner_id WHERE id = v_next.id;
      END IF;
      PERFORM _check_and_complete_bye(p_tournament_id, v_next.id, p_depth + 1);
    ELSE
      UPDATE tournament_matches SET squad_a_id = v_winner_id
      WHERE tournament_id = p_tournament_id AND bracket_type = 'finals' AND match_number = 1
        AND (v_m.stage_id IS NULL OR stage_id = v_m.stage_id);
    END IF;

    v_loser_id := CASE WHEN v_winner_id = v_m.squad_a_id THEN v_m.squad_b_id ELSE v_m.squad_a_id END;

  ELSIF v_m.bracket_type = 'semi_finals' THEN
    UPDATE tournament_matches SET squad_b_id = v_winner_id
    WHERE tournament_id = p_tournament_id AND bracket_type = 'finals' AND match_number = 1
      AND (v_m.stage_id IS NULL OR stage_id = v_m.stage_id);

  ELSIF v_m.bracket_type = 'losers' THEN
    IF v_k > 0 THEN
      v_offset := v_m.round - v_k;
      IF v_m.round < v_k THEN
        v_next_mn := CEIL(v_m.match_number::numeric / 2);
        v_slot := CASE WHEN v_m.match_number % 2 = 1 THEN 'squad_a_id' ELSE 'squad_b_id' END;
        SELECT * INTO v_next FROM tournament_matches
        WHERE tournament_id = p_tournament_id AND bracket_type = 'losers'
          AND round = v_m.round + 1 AND match_number = v_next_mn
          AND (v_m.stage_id IS NULL OR stage_id = v_m.stage_id) LIMIT 1;
        IF FOUND THEN
          IF v_slot = 'squad_a_id' THEN
            UPDATE tournament_matches SET squad_a_id = v_winner_id WHERE id = v_next.id;
          ELSE
            UPDATE tournament_matches SET squad_b_id = v_winner_id WHERE id = v_next.id;
          END IF;
          PERFORM _check_and_complete_bye(p_tournament_id, v_next.id, p_depth + 1);
        END IF;
      ELSIF v_m.round = v_k OR v_offset % 2 = 0 THEN
        SELECT * INTO v_next FROM tournament_matches
        WHERE tournament_id = p_tournament_id AND bracket_type = 'losers'
          AND round = v_m.round + 1 AND match_number = v_m.match_number
          AND (v_m.stage_id IS NULL OR stage_id = v_m.stage_id) LIMIT 1;
        IF FOUND THEN
          UPDATE tournament_matches SET squad_a_id = v_winner_id WHERE id = v_next.id;
          PERFORM _check_and_complete_bye(p_tournament_id, v_next.id, p_depth + 1);
        ELSE
          SELECT * INTO v_next FROM tournament_matches
          WHERE tournament_id = p_tournament_id AND bracket_type = 'semi_finals' AND match_number = 1
            AND (v_m.stage_id IS NULL OR stage_id = v_m.stage_id) LIMIT 1;
          IF FOUND THEN
            UPDATE tournament_matches SET squad_b_id = v_winner_id WHERE id = v_next.id;
          ELSE
            UPDATE tournament_matches SET squad_b_id = v_winner_id
            WHERE tournament_id = p_tournament_id AND bracket_type = 'finals' AND match_number = 1
              AND (v_m.stage_id IS NULL OR stage_id = v_m.stage_id);
          END IF;
        END IF;
      ELSE
        v_next_mn := CEIL(v_m.match_number::numeric / 2);
        v_slot := CASE WHEN v_m.match_number % 2 = 1 THEN 'squad_a_id' ELSE 'squad_b_id' END;
        SELECT * INTO v_next FROM tournament_matches
        WHERE tournament_id = p_tournament_id AND bracket_type = 'losers'
          AND round = v_m.round + 1 AND match_number = v_next_mn
          AND (v_m.stage_id IS NULL OR stage_id = v_m.stage_id) LIMIT 1;
        IF FOUND THEN
          IF v_slot = 'squad_a_id' THEN
            UPDATE tournament_matches SET squad_a_id = v_winner_id WHERE id = v_next.id;
          ELSE
            UPDATE tournament_matches SET squad_b_id = v_winner_id WHERE id = v_next.id;
          END IF;
          PERFORM _check_and_complete_bye(p_tournament_id, v_next.id, p_depth + 1);
        ELSE
          SELECT * INTO v_next FROM tournament_matches
          WHERE tournament_id = p_tournament_id AND bracket_type = 'semi_finals' AND match_number = 1
            AND (v_m.stage_id IS NULL OR stage_id = v_m.stage_id) LIMIT 1;
          IF FOUND THEN
            UPDATE tournament_matches SET squad_b_id = v_winner_id WHERE id = v_next.id;
          ELSE
            UPDATE tournament_matches SET squad_b_id = v_winner_id
            WHERE tournament_id = p_tournament_id AND bracket_type = 'finals' AND match_number = 1
              AND (v_m.stage_id IS NULL OR stage_id = v_m.stage_id);
          END IF;
        END IF;
      END IF;
    ELSE
      IF v_m.round % 2 = 1 THEN
        SELECT * INTO v_next FROM tournament_matches
        WHERE tournament_id = p_tournament_id AND bracket_type = 'losers'
          AND round = v_m.round + 1 AND match_number = v_m.match_number
          AND (v_m.stage_id IS NULL OR stage_id = v_m.stage_id) LIMIT 1;
        IF FOUND THEN
          UPDATE tournament_matches SET squad_a_id = v_winner_id WHERE id = v_next.id;
          PERFORM _check_and_complete_bye(p_tournament_id, v_next.id, p_depth + 1);
        ELSE
          UPDATE tournament_matches SET squad_b_id = v_winner_id
          WHERE tournament_id = p_tournament_id AND bracket_type = 'finals' AND match_number = 1
            AND (v_m.stage_id IS NULL OR stage_id = v_m.stage_id);
        END IF;
      ELSE
        v_next_mn := CEIL(v_m.match_number::numeric / 2);
        v_slot := CASE WHEN v_m.match_number % 2 = 1 THEN 'squad_a_id' ELSE 'squad_b_id' END;
        SELECT * INTO v_next FROM tournament_matches
        WHERE tournament_id = p_tournament_id AND bracket_type = 'losers'
          AND round = v_m.round + 1 AND match_number = v_next_mn
          AND (v_m.stage_id IS NULL OR stage_id = v_m.stage_id) LIMIT 1;
        IF FOUND THEN
          IF v_slot = 'squad_a_id' THEN
            UPDATE tournament_matches SET squad_a_id = v_winner_id WHERE id = v_next.id;
          ELSE
            UPDATE tournament_matches SET squad_b_id = v_winner_id WHERE id = v_next.id;
          END IF;
          PERFORM _check_and_complete_bye(p_tournament_id, v_next.id, p_depth + 1);
        ELSE
          UPDATE tournament_matches SET squad_b_id = v_winner_id
          WHERE tournament_id = p_tournament_id AND bracket_type = 'finals' AND match_number = 1
            AND (v_m.stage_id IS NULL OR stage_id = v_m.stage_id);
        END IF;
      END IF;
    END IF;
  END IF;
END;
$fn$