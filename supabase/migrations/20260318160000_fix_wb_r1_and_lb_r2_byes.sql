-- Fix stuck WB R1 bye matches (6 matches with squad_a only, never auto-completed)
UPDATE tournament_matches
SET status     = 'completed',
    winner_id  = squad_a_id,
    squad_a_score = 2,
    squad_b_score = 0,
    completed_at  = now()
WHERE tournament_id = 'ea06661a-9d88-499a-981e-39a8f003ac20'
  AND bracket_type  = 'winners'
  AND round         = 1
  AND status        = 'pending'
  AND squad_a_id IS NOT NULL
  AND squad_b_id IS NULL;

-- Fix stuck LB R2 bye matches (6 matches where WB R1 bye produced no loser)
UPDATE tournament_matches
SET status     = 'completed',
    winner_id  = squad_a_id,
    squad_a_score = 2,
    squad_b_score = 0,
    completed_at  = now()
WHERE tournament_id = 'ea06661a-9d88-499a-981e-39a8f003ac20'
  AND bracket_type  = 'losers'
  AND round         = 2
  AND status        = 'pending'
  AND squad_a_id IS NOT NULL
  AND squad_b_id IS NULL;

-- Advance LB R2 bye winners into LB R3
-- With k=1, LB R2 is a mixed round (offset=1). Mixed→pure uses SE halving:
--   nextMatch = ceil(match_number / 2), slot = squad_a (odd match_number)
-- R2.1  → R3.1.squad_a
-- R2.5  → R3.3.squad_a
-- R2.7  → R3.4.squad_a
-- R2.9  → R3.5.squad_a
-- R2.13 → R3.7.squad_a
-- R2.15 → R3.8.squad_a

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
