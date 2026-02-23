-- Phase 3: Notifications, Seeding, Check-in/Forfeit, Dispute, Withdrawal, Audit Log, Prize Tiers

-- ==========================================
-- 3.1 In-app Notifications
-- ==========================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read) WHERE read = false;

-- Trigger: notify squad leader when registration approved/rejected
CREATE OR REPLACE FUNCTION public.notify_on_registration_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leader_id UUID;
  v_tournament_name TEXT;
  v_squad_name TEXT;
BEGIN
  IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
    SELECT ts.leader_id, ts.name INTO v_leader_id, v_squad_name
    FROM tournament_squads ts
    WHERE ts.id = NEW.tournament_squad_id;

    SELECT t.name INTO v_tournament_name
    FROM tournaments t
    WHERE t.id = NEW.tournament_id;

    INSERT INTO notifications (user_id, type, title, body, tournament_id)
    VALUES (
      v_leader_id,
      'registration_' || NEW.status,
      CASE WHEN NEW.status = 'approved' THEN 'Registration Approved' ELSE 'Registration Rejected' END,
      v_squad_name || ' has been ' || NEW.status || ' for ' || v_tournament_name,
      NEW.tournament_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_registration_status ON public.tournament_registrations;
CREATE TRIGGER notify_registration_status
  AFTER UPDATE ON public.tournament_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_registration_status_change();

-- Trigger: notify squad leader when roster change approved/rejected
CREATE OR REPLACE FUNCTION public.notify_on_roster_change_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leader_id UUID;
  v_tournament_name TEXT;
BEGIN
  IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
    SELECT ts.leader_id INTO v_leader_id
    FROM tournament_squads ts
    WHERE ts.id = NEW.tournament_squad_id;

    SELECT t.name INTO v_tournament_name
    FROM tournaments t
    WHERE t.id = NEW.tournament_id;

    INSERT INTO notifications (user_id, type, title, body, tournament_id)
    VALUES (
      v_leader_id,
      'roster_change_' || NEW.status,
      CASE WHEN NEW.status = 'approved' THEN 'Roster Change Approved' ELSE 'Roster Change Rejected' END,
      NEW.player_out_ign || ' → ' || NEW.player_in_ign || ' (' || NEW.status || ') for ' || v_tournament_name,
      NEW.tournament_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_roster_change_status ON public.roster_changes;
CREATE TRIGGER notify_roster_change_status
  AFTER UPDATE ON public.roster_changes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_roster_change_status();

-- Trigger: notify all squad leaders when tournament is cancelled
CREATE OR REPLACE FUNCTION public.notify_on_tournament_cancelled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    INSERT INTO notifications (user_id, type, title, body, tournament_id)
    SELECT DISTINCT ts.leader_id, 'tournament_cancelled', 'Tournament Cancelled',
      NEW.name || ' has been cancelled.',
      NEW.id
    FROM tournament_registrations tr
    JOIN tournament_squads ts ON ts.id = tr.tournament_squad_id
    WHERE tr.tournament_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_tournament_cancelled ON public.tournaments;
CREATE TRIGGER notify_tournament_cancelled
  AFTER UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_tournament_cancelled();

-- ==========================================
-- 3.3 Seeding
-- ==========================================

ALTER TABLE public.tournament_registrations
ADD COLUMN IF NOT EXISTS seed INTEGER;

-- ==========================================
-- 3.4 Check-in & Forfeit
-- ==========================================

ALTER TABLE public.tournament_matches
ADD COLUMN IF NOT EXISTS squad_a_checked_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS squad_b_checked_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_forfeit BOOLEAN DEFAULT false;

-- ==========================================
-- 3.5 Dispute Resolution
-- ==========================================

ALTER TABLE public.tournament_matches
ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
ADD COLUMN IF NOT EXISTS dispute_screenshot TEXT,
ADD COLUMN IF NOT EXISTS dispute_raised_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS dispute_resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS dispute_resolution_notes TEXT;

-- ==========================================
-- 3.6 Squad Withdrawal (add 'withdrawn' status)
-- ==========================================

ALTER TABLE public.tournament_registrations
DROP CONSTRAINT IF EXISTS tournament_registrations_status_check;

ALTER TABLE public.tournament_registrations
ADD CONSTRAINT tournament_registrations_status_check
CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn'));

-- ==========================================
-- Phase 4.1 Structured Prize Tiers
-- ==========================================

ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS prize_tiers JSONB DEFAULT '[]'::jsonb;

-- ==========================================
-- Phase 4.2 Audit Log
-- ==========================================

CREATE TABLE public.tournament_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_audit_log ENABLE ROW LEVEL SECURITY;

-- Hosts can read audit log for their tournaments
CREATE POLICY "Hosts can read tournament audit log"
ON public.tournament_audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_id AND t.host_id = auth.uid()
  )
);

-- Admins can read all audit logs
CREATE POLICY "Admins can read all audit logs"
ON public.tournament_audit_log FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- System can insert audit logs (SECURITY DEFINER functions)
CREATE POLICY "System can insert audit logs"
ON public.tournament_audit_log FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_audit_log_tournament ON public.tournament_audit_log (tournament_id, created_at DESC);

-- Audit trigger for registration status changes
CREATE OR REPLACE FUNCTION public.audit_registration_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_squad_name TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT ts.name INTO v_squad_name
    FROM tournament_squads ts WHERE ts.id = NEW.tournament_squad_id;

    INSERT INTO tournament_audit_log (tournament_id, user_id, action, details)
    VALUES (
      NEW.tournament_id,
      auth.uid(),
      'registration_' || NEW.status,
      jsonb_build_object('squad_name', v_squad_name, 'old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_registration_change ON public.tournament_registrations;
CREATE TRIGGER audit_registration_change
  AFTER UPDATE ON public.tournament_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_registration_change();

-- Audit trigger for roster changes
CREATE OR REPLACE FUNCTION public.audit_roster_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO tournament_audit_log (tournament_id, user_id, action, details)
    VALUES (
      NEW.tournament_id,
      auth.uid(),
      'roster_change_' || NEW.status,
      jsonb_build_object(
        'player_out', NEW.player_out_ign,
        'player_in', NEW.player_in_ign,
        'player_in_mlbb_id', NEW.player_in_mlbb_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_roster_change ON public.roster_changes;
CREATE TRIGGER audit_roster_change
  AFTER UPDATE ON public.roster_changes
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_roster_change();

-- Audit trigger for match results
CREATE OR REPLACE FUNCTION public.audit_match_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO tournament_audit_log (tournament_id, user_id, action, details)
    VALUES (
      NEW.tournament_id,
      auth.uid(),
      'match_result_entered',
      jsonb_build_object(
        'match_id', NEW.id,
        'round', NEW.round,
        'match_number', NEW.match_number,
        'squad_a_score', NEW.squad_a_score,
        'squad_b_score', NEW.squad_b_score,
        'winner_id', NEW.winner_id
      )
    );
  END IF;

  -- Audit dispute
  IF NEW.status = 'disputed' AND OLD.status != 'disputed' THEN
    INSERT INTO tournament_audit_log (tournament_id, user_id, action, details)
    VALUES (
      NEW.tournament_id,
      auth.uid(),
      'dispute_raised',
      jsonb_build_object('match_id', NEW.id, 'reason', NEW.dispute_reason)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_match_result ON public.tournament_matches;
CREATE TRIGGER audit_match_result
  AFTER UPDATE ON public.tournament_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_match_result();

-- Audit trigger for tournament status changes
CREATE OR REPLACE FUNCTION public.audit_tournament_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO tournament_audit_log (tournament_id, user_id, action, details)
    VALUES (
      NEW.id,
      auth.uid(),
      'status_changed',
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_tournament_status ON public.tournaments;
CREATE TRIGGER audit_tournament_status
  AFTER UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_tournament_status_change();
