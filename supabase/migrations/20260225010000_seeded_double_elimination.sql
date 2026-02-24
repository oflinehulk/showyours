-- ============================================================
-- Seeded Double Elimination Support
-- ============================================================

-- 1. Add advance_to_lower_per_group to tournament_stages
--    Controls how many bottom teams per group go directly to LB (0 = standard DE)
ALTER TABLE public.tournament_stages
  ADD COLUMN IF NOT EXISTS advance_to_lower_per_group INTEGER NOT NULL DEFAULT 0;

-- 2. Add lb_initial_rounds to tournament_stages
--    Stores precomputed "k" value (number of initial LB-only rounds
--    before WB dropdowns merge in). Set at bracket generation time.
ALTER TABLE public.tournament_stages
  ADD COLUMN IF NOT EXISTS lb_initial_rounds INTEGER NOT NULL DEFAULT 0;

-- 3. Expand bracket_type CHECK to include 'semi_finals'
ALTER TABLE public.tournament_matches
  DROP CONSTRAINT IF EXISTS tournament_matches_bracket_type_check;

ALTER TABLE public.tournament_matches
  ADD CONSTRAINT tournament_matches_bracket_type_check
  CHECK (bracket_type IN ('winners', 'losers', 'finals', 'semi_finals'));
