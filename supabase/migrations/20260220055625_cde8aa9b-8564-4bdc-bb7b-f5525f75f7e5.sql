
-- 1. Attach the roster lock trigger (function exists but trigger was never created)
CREATE TRIGGER lock_rosters_on_status_change
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.lock_tournament_rosters();

-- 2. Unique constraint on registrations to prevent same squad registering twice for same tournament
CREATE UNIQUE INDEX idx_unique_squad_tournament_registration 
  ON public.tournament_registrations (tournament_id, tournament_squad_id);

-- 3. Unique constraint on tournament_invitations to prevent duplicate invites
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_tournament_invitation
  ON public.tournament_invitations (tournament_id, squad_id);
