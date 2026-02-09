-- Tournament roster snapshot system
-- 1. Add roster_locked flag to tournament_registrations 
-- 2. Create roster_changes table for tracking approved changes after lock
-- 3. Add trigger to auto-lock rosters when registration closes

-- Add roster_locked column to tournament_registrations
ALTER TABLE public.tournament_registrations 
ADD COLUMN IF NOT EXISTS roster_locked boolean DEFAULT false;

-- Add roster_locked_at timestamp
ALTER TABLE public.tournament_registrations 
ADD COLUMN IF NOT EXISTS roster_locked_at timestamp with time zone;

-- Add snapshot of roster at registration time
ALTER TABLE public.tournament_registrations 
ADD COLUMN IF NOT EXISTS roster_snapshot jsonb DEFAULT '[]'::jsonb;

-- roster_changes table already exists, update it to have better structure if needed
-- Add approval columns
ALTER TABLE public.roster_changes 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

ALTER TABLE public.roster_changes 
ADD COLUMN IF NOT EXISTS approved_by uuid;

ALTER TABLE public.roster_changes 
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

ALTER TABLE public.roster_changes 
ADD COLUMN IF NOT EXISTS reason text;

-- Add RLS for roster_changes updates (hosts can approve)
DROP POLICY IF EXISTS "Hosts can update roster changes" ON public.roster_changes;
CREATE POLICY "Hosts can update roster changes" 
ON public.roster_changes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM tournaments t 
    WHERE t.id = roster_changes.tournament_id 
    AND t.host_id = auth.uid()
  )
);

-- Create function to lock rosters when registration closes
CREATE OR REPLACE FUNCTION public.lock_tournament_rosters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When tournament status changes to registration_closed or beyond
  IF NEW.status IN ('registration_closed', 'bracket_generated', 'ongoing') 
     AND OLD.status = 'registration_open' THEN
    
    -- Lock all registrations and create roster snapshots
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
      )
    WHERE tr.tournament_id = NEW.id
      AND tr.roster_locked = false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on tournaments table
DROP TRIGGER IF EXISTS lock_rosters_on_registration_close ON public.tournaments;
CREATE TRIGGER lock_rosters_on_registration_close
  AFTER UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.lock_tournament_rosters();