
-- 1. Fix 6 stuck WB R1 bye matches
UPDATE tournament_matches
SET status = 'completed',
    winner_id = squad_a_id,
    squad_a_score = 2,
    squad_b_score = 0,
    completed_at = now()
WHERE tournament_id = 'ea06661a-9d88-499a-981e-39a8f003ac20'
  AND bracket_type = 'winners'
  AND round = 1
  AND status = 'pending'
  AND squad_a_id IS NOT NULL
  AND squad_b_id IS NULL;

-- 2. Fix 6 stuck LB R2 bye matches
UPDATE tournament_matches
SET status = 'completed',
    winner_id = squad_a_id,
    squad_a_score = 2,
    squad_b_score = 0,
    completed_at = now()
WHERE tournament_id = 'ea06661a-9d88-499a-981e-39a8f003ac20'
  AND bracket_type = 'losers'
  AND round = 2
  AND status = 'pending'
  AND squad_a_id IS NOT NULL
  AND squad_b_id IS NULL;

-- 3. Advance LB R2 bye winners to LB R3
UPDATE tournament_matches AS dest
SET squad_a_id = src.squad_a_id
FROM tournament_matches AS src
WHERE src.tournament_id  = 'ea06661a-9d88-499a-981e-39a8f003ac20'
  AND src.bracket_type   = 'losers'
  AND src.round          = 2
  AND src.squad_a_id IS NOT NULL
  AND src.squad_b_id IS NULL
  AND dest.tournament_id = 'ea06661a-9d88-499a-981e-39a8f003ac20'
  AND dest.bracket_type  = 'losers'
  AND dest.round         = 3
  AND dest.match_number  = CEIL(src.match_number::numeric / 2)
  AND dest.squad_a_id IS NULL;
