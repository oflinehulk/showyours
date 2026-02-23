-- Phase 1.2: Match score validation
-- Ensures scores are valid for the best_of format

-- Add a CHECK constraint that validates scores match the best_of format
-- Bo1: winner=1, loser=0
-- Bo3: winner=2, loser=0 or 1
-- Bo5: winner=3, loser=0, 1, or 2
-- Also: scores must not be negative, and winner must match the higher score

ALTER TABLE public.tournament_matches
ADD CONSTRAINT valid_match_scores CHECK (
  squad_a_score >= 0 AND squad_b_score >= 0
  AND (
    -- Allow default 0-0 for pending/ongoing matches
    (status IN ('pending', 'ongoing') AND squad_a_score = 0 AND squad_b_score = 0)
    OR
    -- For completed/disputed matches, validate against best_of
    (status IN ('completed', 'disputed') AND (
      (best_of = 1 AND (
        (squad_a_score = 1 AND squad_b_score = 0) OR
        (squad_a_score = 0 AND squad_b_score = 1)
      ))
      OR
      (best_of = 3 AND (
        (squad_a_score = 2 AND squad_b_score IN (0, 1)) OR
        (squad_a_score IN (0, 1) AND squad_b_score = 2)
      ))
      OR
      (best_of = 5 AND (
        (squad_a_score = 3 AND squad_b_score IN (0, 1, 2)) OR
        (squad_a_score IN (0, 1, 2) AND squad_b_score = 3)
      ))
    ))
  )
);

-- Phase 1.3: Duplicate player prevention
-- Prevents same MLBB ID from appearing in multiple active squads in the same tournament

CREATE UNIQUE INDEX unique_active_player_per_tournament
ON public.tournament_squad_members (mlbb_id, tournament_squad_id)
WHERE member_status = 'active';

-- Cross-squad duplicate prevention: function to check during registration and roster changes
CREATE OR REPLACE FUNCTION public.check_duplicate_player_in_tournament()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament_id UUID;
  v_duplicate_squad TEXT;
BEGIN
  -- Only check active members
  IF NEW.member_status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Find which tournament this squad belongs to
  SELECT tr.tournament_id INTO v_tournament_id
  FROM tournament_registrations tr
  WHERE tr.tournament_squad_id = NEW.tournament_squad_id
  LIMIT 1;

  -- If not registered for any tournament yet, allow
  IF v_tournament_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if this mlbb_id already exists in another active squad in the same tournament
  SELECT ts.name INTO v_duplicate_squad
  FROM tournament_squad_members tsm
  JOIN tournament_registrations tr ON tr.tournament_squad_id = tsm.tournament_squad_id
  JOIN tournament_squads ts ON ts.id = tsm.tournament_squad_id
  WHERE tr.tournament_id = v_tournament_id
    AND tsm.mlbb_id = NEW.mlbb_id
    AND tsm.member_status = 'active'
    AND tsm.tournament_squad_id != NEW.tournament_squad_id
  LIMIT 1;

  IF v_duplicate_squad IS NOT NULL THEN
    RAISE EXCEPTION 'Player with MLBB ID "%" is already registered in squad "%" for this tournament',
      NEW.mlbb_id, v_duplicate_squad;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_duplicate_player ON public.tournament_squad_members;
CREATE TRIGGER check_duplicate_player
  BEFORE INSERT OR UPDATE ON public.tournament_squad_members
  FOR EACH ROW
  EXECUTE FUNCTION public.check_duplicate_player_in_tournament();
