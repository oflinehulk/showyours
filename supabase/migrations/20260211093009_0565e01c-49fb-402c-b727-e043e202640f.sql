-- Add unique constraint to prevent duplicate registrations (same squad for same tournament)
CREATE UNIQUE INDEX IF NOT EXISTS unique_squad_per_tournament 
ON public.tournament_registrations (tournament_id, tournament_squad_id);

-- Also prevent the same existing_squad_id from registering twice for the same tournament
-- We need a unique index on (tournament_id, existing_squad_id) via tournament_squads
-- This is best handled at the application level since it spans two tables