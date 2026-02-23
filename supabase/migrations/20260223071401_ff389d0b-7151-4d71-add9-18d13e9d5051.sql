
-- Migration 1: Roster change application
ALTER TABLE public.tournament_squad_members
ADD COLUMN IF NOT EXISTS member_status TEXT NOT NULL DEFAULT 'active'
CHECK (member_status IN ('active', 'inactive'));

CREATE OR REPLACE FUNCTION public.apply_roster_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_old_member_id UUID; v_old_position INTEGER; v_old_role squad_member_role;
  v_squad_id UUID; v_tournament_id UUID;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    v_squad_id := NEW.tournament_squad_id; v_tournament_id := NEW.tournament_id;
    SELECT id, position, role INTO v_old_member_id, v_old_position, v_old_role
    FROM tournament_squad_members WHERE tournament_squad_id = v_squad_id AND ign = NEW.player_out_ign AND member_status = 'active' LIMIT 1;
    IF v_old_member_id IS NULL THEN RAISE EXCEPTION 'Player "%" not found as active member', NEW.player_out_ign; END IF;
    UPDATE tournament_squad_members SET member_status = 'inactive' WHERE id = v_old_member_id;
    INSERT INTO tournament_squad_members (tournament_squad_id, ign, mlbb_id, role, position, member_status)
    VALUES (v_squad_id, NEW.player_in_ign, NEW.player_in_mlbb_id, v_old_role, v_old_position, 'active');
    UPDATE tournament_registrations SET roster_snapshot = (
      SELECT jsonb_agg(jsonb_build_object('id', tsm.id, 'ign', tsm.ign, 'mlbb_id', tsm.mlbb_id, 'role', tsm.role, 'position', tsm.position))
      FROM tournament_squad_members tsm WHERE tsm.tournament_squad_id = v_squad_id AND tsm.member_status = 'active'
    ) WHERE tournament_id = v_tournament_id AND tournament_squad_id = v_squad_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS apply_roster_change_on_approval ON public.roster_changes;
CREATE TRIGGER apply_roster_change_on_approval AFTER UPDATE ON public.roster_changes FOR EACH ROW EXECUTE FUNCTION public.apply_roster_change();

CREATE OR REPLACE FUNCTION public.lock_tournament_rosters()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('registration_closed', 'bracket_generated', 'ongoing') AND OLD.status = 'registration_open' THEN
    UPDATE tournament_registrations tr SET roster_locked = true, roster_locked_at = now(),
      roster_snapshot = (SELECT jsonb_agg(jsonb_build_object('id', tsm.id, 'ign', tsm.ign, 'mlbb_id', tsm.mlbb_id, 'role', tsm.role, 'position', tsm.position))
        FROM tournament_squad_members tsm WHERE tsm.tournament_squad_id = tr.tournament_squad_id AND tsm.member_status = 'active')
    WHERE tr.tournament_id = NEW.id AND tr.roster_locked = false;
  END IF;
  RETURN NEW;
END; $$;

-- Migration 2: Score validation and duplicate prevention
ALTER TABLE public.tournament_matches DROP CONSTRAINT IF EXISTS valid_match_scores;
ALTER TABLE public.tournament_matches ADD CONSTRAINT valid_match_scores CHECK (
  squad_a_score >= 0 AND squad_b_score >= 0 AND (
    (status IN ('pending', 'ongoing') AND squad_a_score = 0 AND squad_b_score = 0) OR
    (status IN ('completed', 'disputed') AND (
      (best_of = 1 AND ((squad_a_score = 1 AND squad_b_score = 0) OR (squad_a_score = 0 AND squad_b_score = 1))) OR
      (best_of = 3 AND ((squad_a_score = 2 AND squad_b_score IN (0, 1)) OR (squad_a_score IN (0, 1) AND squad_b_score = 2))) OR
      (best_of = 5 AND ((squad_a_score = 3 AND squad_b_score IN (0, 1, 2)) OR (squad_a_score IN (0, 1, 2) AND squad_b_score = 3)))
    ))
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_player_per_tournament ON public.tournament_squad_members (mlbb_id, tournament_squad_id) WHERE member_status = 'active';

CREATE OR REPLACE FUNCTION public.check_duplicate_player_in_tournament()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_tournament_id UUID; v_duplicate_squad TEXT;
BEGIN
  IF NEW.member_status != 'active' THEN RETURN NEW; END IF;
  SELECT tr.tournament_id INTO v_tournament_id FROM tournament_registrations tr WHERE tr.tournament_squad_id = NEW.tournament_squad_id LIMIT 1;
  IF v_tournament_id IS NULL THEN RETURN NEW; END IF;
  SELECT ts.name INTO v_duplicate_squad FROM tournament_squad_members tsm
    JOIN tournament_registrations tr ON tr.tournament_squad_id = tsm.tournament_squad_id
    JOIN tournament_squads ts ON ts.id = tsm.tournament_squad_id
    WHERE tr.tournament_id = v_tournament_id AND tsm.mlbb_id = NEW.mlbb_id AND tsm.member_status = 'active' AND tsm.tournament_squad_id != NEW.tournament_squad_id LIMIT 1;
  IF v_duplicate_squad IS NOT NULL THEN
    RAISE EXCEPTION 'Player with MLBB ID "%" is already registered in squad "%" for this tournament', NEW.mlbb_id, v_duplicate_squad;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS check_duplicate_player ON public.tournament_squad_members;
CREATE TRIGGER check_duplicate_player BEFORE INSERT OR UPDATE ON public.tournament_squad_members FOR EACH ROW EXECUTE FUNCTION public.check_duplicate_player_in_tournament();

-- Migration 3: Status validation and RPC
CREATE OR REPLACE FUNCTION public.validate_tournament_status_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_approved_count INTEGER; v_match_count INTEGER; v_completed_match_count INTEGER;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;
  CASE OLD.status
    WHEN 'registration_open' THEN IF NEW.status NOT IN ('registration_closed') THEN RAISE EXCEPTION 'Cannot transition from registration_open to %', NEW.status; END IF;
    WHEN 'registration_closed' THEN
      IF NEW.status NOT IN ('bracket_generated') THEN RAISE EXCEPTION 'Cannot transition from registration_closed to %', NEW.status; END IF;
      SELECT COUNT(*) INTO v_approved_count FROM tournament_registrations WHERE tournament_id = NEW.id AND status = 'approved';
      IF v_approved_count < 2 THEN RAISE EXCEPTION 'Need at least 2 approved squads (currently %)', v_approved_count; END IF;
    WHEN 'bracket_generated' THEN IF NEW.status NOT IN ('ongoing') THEN RAISE EXCEPTION 'Cannot transition from bracket_generated to %', NEW.status; END IF;
    WHEN 'ongoing' THEN
      IF NEW.status NOT IN ('completed') THEN RAISE EXCEPTION 'Cannot transition from ongoing to %', NEW.status; END IF;
      SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed') INTO v_match_count, v_completed_match_count FROM tournament_matches WHERE tournament_id = NEW.id;
      IF v_match_count > 0 AND v_completed_match_count < v_match_count THEN RAISE EXCEPTION 'All matches must be completed (% of % done)', v_completed_match_count, v_match_count; END IF;
    WHEN 'completed' THEN RAISE EXCEPTION 'Cannot change status of a completed tournament';
    WHEN 'cancelled' THEN RAISE EXCEPTION 'Cannot change status of a cancelled tournament';
  END CASE;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS validate_tournament_status ON public.tournaments;
CREATE TRIGGER validate_tournament_status BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.validate_tournament_status_transition();

CREATE OR REPLACE FUNCTION public.rpc_register_for_tournament(p_tournament_id UUID, p_squad_name TEXT, p_existing_squad_id UUID, p_logo_url TEXT, p_members JSONB)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_id UUID; v_tournament RECORD; v_approved_count INTEGER; v_squad_id UUID; v_member JSONB;
BEGIN
  v_user_id := auth.uid(); IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id FOR UPDATE;
  IF v_tournament IS NULL THEN RAISE EXCEPTION 'Tournament not found'; END IF;
  IF v_tournament.status != 'registration_open' THEN RAISE EXCEPTION 'Registration is not open'; END IF;
  SELECT COUNT(*) INTO v_approved_count FROM tournament_registrations WHERE tournament_id = p_tournament_id AND status = 'approved';
  IF v_approved_count >= v_tournament.max_squads THEN RAISE EXCEPTION 'Tournament is full'; END IF;
  IF EXISTS (SELECT 1 FROM tournament_registrations tr JOIN tournament_squads ts ON ts.id = tr.tournament_squad_id WHERE tr.tournament_id = p_tournament_id AND ts.existing_squad_id = p_existing_squad_id) THEN
    RAISE EXCEPTION 'This squad is already registered';
  END IF;
  INSERT INTO tournament_squads (name, leader_id, existing_squad_id, logo_url) VALUES (p_squad_name, v_user_id, p_existing_squad_id, p_logo_url) RETURNING id INTO v_squad_id;
  FOR v_member IN SELECT * FROM jsonb_array_elements(p_members) LOOP
    INSERT INTO tournament_squad_members (tournament_squad_id, ign, mlbb_id, role, position, user_id, member_status)
    VALUES (v_squad_id, v_member->>'ign', v_member->>'mlbb_id', (v_member->>'role')::squad_member_role, (v_member->>'position')::integer,
      CASE WHEN v_member->>'user_id' = '' OR v_member->>'user_id' IS NULL THEN NULL ELSE (v_member->>'user_id')::uuid END, 'active');
  END LOOP;
  INSERT INTO tournament_registrations (tournament_id, tournament_squad_id) VALUES (p_tournament_id, v_squad_id);
  RETURN v_squad_id;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_approve_roster_change(p_change_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_id UUID; v_change RECORD; v_tournament RECORD;
BEGIN
  v_user_id := auth.uid(); IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_change FROM roster_changes WHERE id = p_change_id FOR UPDATE;
  IF v_change IS NULL THEN RAISE EXCEPTION 'Roster change not found'; END IF;
  IF v_change.status != 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;
  SELECT * INTO v_tournament FROM tournaments WHERE id = v_change.tournament_id;
  IF v_tournament.host_id != v_user_id THEN RAISE EXCEPTION 'Only host can approve'; END IF;
  IF (SELECT COUNT(*) FROM roster_changes WHERE tournament_squad_id = v_change.tournament_squad_id AND tournament_id = v_change.tournament_id AND status = 'approved') >= 2 THEN
    RAISE EXCEPTION 'Max roster changes (2) reached';
  END IF;
  UPDATE roster_changes SET status = 'approved', approved_by = v_user_id, approved_at = now() WHERE id = p_change_id;
END; $$;

-- Migration 4: Phase 3 & 4 features
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, title TEXT NOT NULL, body TEXT,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can read own notifications') THEN
    CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can update own notifications') THEN
    CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, read) WHERE read = false;

CREATE OR REPLACE FUNCTION public.notify_on_registration_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_leader_id UUID; v_tournament_name TEXT; v_squad_name TEXT;
BEGIN
  IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
    SELECT ts.leader_id, ts.name INTO v_leader_id, v_squad_name FROM tournament_squads ts WHERE ts.id = NEW.tournament_squad_id;
    SELECT t.name INTO v_tournament_name FROM tournaments t WHERE t.id = NEW.tournament_id;
    INSERT INTO notifications (user_id, type, title, body, tournament_id) VALUES (v_leader_id, 'registration_' || NEW.status,
      CASE WHEN NEW.status = 'approved' THEN 'Registration Approved' ELSE 'Registration Rejected' END,
      v_squad_name || ' has been ' || NEW.status || ' for ' || v_tournament_name, NEW.tournament_id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS notify_registration_status ON public.tournament_registrations;
CREATE TRIGGER notify_registration_status AFTER UPDATE ON public.tournament_registrations FOR EACH ROW EXECUTE FUNCTION public.notify_on_registration_status_change();

CREATE OR REPLACE FUNCTION public.notify_on_roster_change_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_leader_id UUID; v_tournament_name TEXT;
BEGIN
  IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
    SELECT ts.leader_id INTO v_leader_id FROM tournament_squads ts WHERE ts.id = NEW.tournament_squad_id;
    SELECT t.name INTO v_tournament_name FROM tournaments t WHERE t.id = NEW.tournament_id;
    INSERT INTO notifications (user_id, type, title, body, tournament_id) VALUES (v_leader_id, 'roster_change_' || NEW.status,
      CASE WHEN NEW.status = 'approved' THEN 'Roster Change Approved' ELSE 'Roster Change Rejected' END,
      NEW.player_out_ign || ' → ' || NEW.player_in_ign || ' (' || NEW.status || ') for ' || v_tournament_name, NEW.tournament_id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS notify_roster_change_status ON public.roster_changes;
CREATE TRIGGER notify_roster_change_status AFTER UPDATE ON public.roster_changes FOR EACH ROW EXECUTE FUNCTION public.notify_on_roster_change_status();

CREATE OR REPLACE FUNCTION public.notify_on_tournament_cancelled()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    INSERT INTO notifications (user_id, type, title, body, tournament_id)
    SELECT DISTINCT ts.leader_id, 'tournament_cancelled', 'Tournament Cancelled', NEW.name || ' has been cancelled.', NEW.id
    FROM tournament_registrations tr JOIN tournament_squads ts ON ts.id = tr.tournament_squad_id WHERE tr.tournament_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS notify_tournament_cancelled ON public.tournaments;
CREATE TRIGGER notify_tournament_cancelled AFTER UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.notify_on_tournament_cancelled();

-- Seeding
ALTER TABLE public.tournament_registrations ADD COLUMN IF NOT EXISTS seed INTEGER;

-- Check-in & Forfeit
ALTER TABLE public.tournament_matches
ADD COLUMN IF NOT EXISTS squad_a_checked_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS squad_b_checked_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_forfeit BOOLEAN DEFAULT false;

-- Dispute Resolution
ALTER TABLE public.tournament_matches
ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
ADD COLUMN IF NOT EXISTS dispute_screenshot TEXT,
ADD COLUMN IF NOT EXISTS dispute_raised_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS dispute_resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS dispute_resolution_notes TEXT;

-- Squad Withdrawal
ALTER TABLE public.tournament_registrations DROP CONSTRAINT IF EXISTS tournament_registrations_status_check;
ALTER TABLE public.tournament_registrations ADD CONSTRAINT tournament_registrations_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn'));

-- Prize Tiers
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS prize_tiers JSONB DEFAULT '[]'::jsonb;

-- Audit Log
CREATE TABLE IF NOT EXISTS public.tournament_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tournament_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tournament_audit_log' AND policyname = 'Hosts can read tournament audit log') THEN
    CREATE POLICY "Hosts can read tournament audit log" ON public.tournament_audit_log FOR SELECT USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.host_id = auth.uid()));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tournament_audit_log' AND policyname = 'Admins can read all audit logs') THEN
    CREATE POLICY "Admins can read all audit logs" ON public.tournament_audit_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tournament_audit_log' AND policyname = 'System can insert audit logs') THEN
    CREATE POLICY "System can insert audit logs" ON public.tournament_audit_log FOR INSERT WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_log_tournament ON public.tournament_audit_log (tournament_id, created_at DESC);

-- Audit triggers
CREATE OR REPLACE FUNCTION public.audit_registration_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_squad_name TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT ts.name INTO v_squad_name FROM tournament_squads ts WHERE ts.id = NEW.tournament_squad_id;
    INSERT INTO tournament_audit_log (tournament_id, user_id, action, details) VALUES (NEW.tournament_id, auth.uid(), 'registration_' || NEW.status, jsonb_build_object('squad_name', v_squad_name, 'old_status', OLD.status, 'new_status', NEW.status));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS audit_registration_change ON public.tournament_registrations;
CREATE TRIGGER audit_registration_change AFTER UPDATE ON public.tournament_registrations FOR EACH ROW EXECUTE FUNCTION public.audit_registration_change();

CREATE OR REPLACE FUNCTION public.audit_roster_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO tournament_audit_log (tournament_id, user_id, action, details) VALUES (NEW.tournament_id, auth.uid(), 'roster_change_' || NEW.status, jsonb_build_object('player_out', NEW.player_out_ign, 'player_in', NEW.player_in_ign, 'player_in_mlbb_id', NEW.player_in_mlbb_id));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS audit_roster_change ON public.roster_changes;
CREATE TRIGGER audit_roster_change AFTER UPDATE ON public.roster_changes FOR EACH ROW EXECUTE FUNCTION public.audit_roster_change();

CREATE OR REPLACE FUNCTION public.audit_match_result()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO tournament_audit_log (tournament_id, user_id, action, details) VALUES (NEW.tournament_id, auth.uid(), 'match_result_entered', jsonb_build_object('match_id', NEW.id, 'round', NEW.round, 'match_number', NEW.match_number, 'squad_a_score', NEW.squad_a_score, 'squad_b_score', NEW.squad_b_score, 'winner_id', NEW.winner_id));
  END IF;
  IF NEW.status = 'disputed' AND OLD.status != 'disputed' THEN
    INSERT INTO tournament_audit_log (tournament_id, user_id, action, details) VALUES (NEW.tournament_id, auth.uid(), 'dispute_raised', jsonb_build_object('match_id', NEW.id, 'reason', NEW.dispute_reason));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS audit_match_result ON public.tournament_matches;
CREATE TRIGGER audit_match_result AFTER UPDATE ON public.tournament_matches FOR EACH ROW EXECUTE FUNCTION public.audit_match_result();

CREATE OR REPLACE FUNCTION public.audit_tournament_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO tournament_audit_log (tournament_id, user_id, action, details) VALUES (NEW.id, auth.uid(), 'status_changed', jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS audit_tournament_status ON public.tournaments;
CREATE TRIGGER audit_tournament_status AFTER UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.audit_tournament_status_change();
