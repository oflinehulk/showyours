
-- Add new columns to tournament_stages
ALTER TABLE public.tournament_stages
  ADD COLUMN advance_to_lower_per_group INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN lb_initial_rounds INTEGER NOT NULL DEFAULT 0;

-- Drop existing bracket_type constraint and add expanded one
ALTER TABLE public.tournament_matches
  DROP CONSTRAINT IF EXISTS tournament_matches_bracket_type_check;

ALTER TABLE public.tournament_matches
  ADD CONSTRAINT tournament_matches_bracket_type_check
  CHECK (bracket_type IN ('winners', 'losers', 'finals', 'semi_finals'));
