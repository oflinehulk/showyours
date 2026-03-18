-- Fix stuck LB R1 BYE matches - use BO3 valid score (2-0)
UPDATE tournament_matches
SET status = 'completed',
    winner_id = squad_a_id,
    squad_a_score = 2,
    squad_b_score = 0,
    completed_at = now()
WHERE tournament_id = 'ea06661a-9d88-499a-981e-39a8f003ac20'
  AND bracket_type = 'losers'
  AND round = 1
  AND status = 'pending'
  AND squad_a_id IS NOT NULL
  AND squad_b_id IS NULL;