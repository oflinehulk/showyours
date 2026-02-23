-- Phase 1.1: Make roster changes actually apply when approved
-- Adds member_status column, trigger to swap players, and refresh snapshot

-- 1. Add member_status to tournament_squad_members
ALTER TABLE public.tournament_squad_members
ADD COLUMN IF NOT EXISTS member_status TEXT NOT NULL DEFAULT 'active'
CHECK (member_status IN ('active', 'inactive'));

-- 2. Create function to apply roster change when approved
CREATE OR REPLACE FUNCTION public.apply_roster_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_member_id UUID;
  v_old_position INTEGER;
  v_old_role squad_member_role;
  v_squad_id UUID;
  v_tournament_id UUID;
BEGIN
  -- Only fire when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN

    v_squad_id := NEW.tournament_squad_id;
    v_tournament_id := NEW.tournament_id;

    -- Find the outgoing player by IGN in this squad (must be active)
    SELECT id, position, role INTO v_old_member_id, v_old_position, v_old_role
    FROM tournament_squad_members
    WHERE tournament_squad_id = v_squad_id
      AND ign = NEW.player_out_ign
      AND member_status = 'active'
    LIMIT 1;

    IF v_old_member_id IS NULL THEN
      RAISE EXCEPTION 'Player "%" not found as active member in this squad', NEW.player_out_ign;
    END IF;

    -- Mark old player as inactive
    UPDATE tournament_squad_members
    SET member_status = 'inactive'
    WHERE id = v_old_member_id;

    -- Insert new player with same position and role
    INSERT INTO tournament_squad_members (
      tournament_squad_id, ign, mlbb_id, role, position, member_status
    ) VALUES (
      v_squad_id, NEW.player_in_ign, NEW.player_in_mlbb_id, v_old_role, v_old_position, 'active'
    );

    -- Refresh the roster snapshot in tournament_registrations
    UPDATE tournament_registrations
    SET roster_snapshot = (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', tsm.id,
          'ign', tsm.ign,
          'mlbb_id', tsm.mlbb_id,
          'role', tsm.role,
          'position', tsm.position
        )
      )
      FROM tournament_squad_members tsm
      WHERE tsm.tournament_squad_id = v_squad_id
        AND tsm.member_status = 'active'
    )
    WHERE tournament_id = v_tournament_id
      AND tournament_squad_id = v_squad_id;

  END IF;

  RETURN NEW;
END;
$$;

-- 3. Create trigger on roster_changes
DROP TRIGGER IF EXISTS apply_roster_change_on_approval ON public.roster_changes;
CREATE TRIGGER apply_roster_change_on_approval
  AFTER UPDATE ON public.roster_changes
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_roster_change();

-- 4. Update the lock_tournament_rosters function to only snapshot active members
CREATE OR REPLACE FUNCTION public.lock_tournament_rosters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('registration_closed', 'bracket_generated', 'ongoing')
     AND OLD.status = 'registration_open' THEN

    UPDATE tournament_registrations tr
    SET
      roster_locked = true,
      roster_locked_at = now(),
      roster_snapshot = (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', tsm.id,
            'ign', tsm.ign,
            'mlbb_id', tsm.mlbb_id,
            'role', tsm.role,
            'position', tsm.position
          )
        )
        FROM tournament_squad_members tsm
        WHERE tsm.tournament_squad_id = tr.tournament_squad_id
          AND tsm.member_status = 'active'
      )
    WHERE tr.tournament_id = NEW.id
      AND tr.roster_locked = false;
  END IF;

  RETURN NEW;
END;
$$;
