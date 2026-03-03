
-- Trigger function to keep squads.member_count in sync
CREATE OR REPLACE FUNCTION public.sync_squad_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Handle INSERT or UPDATE (new squad_id)
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE squads
    SET member_count = (SELECT COUNT(*) FROM squad_members WHERE squad_id = NEW.squad_id)
    WHERE id = NEW.squad_id;
  END IF;

  -- Handle DELETE or UPDATE where squad_id changed
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.squad_id IS DISTINCT FROM NEW.squad_id) THEN
    UPDATE squads
    SET member_count = (SELECT COUNT(*) FROM squad_members WHERE squad_id = OLD.squad_id)
    WHERE id = OLD.squad_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Attach trigger
CREATE TRIGGER trg_sync_squad_member_count
AFTER INSERT OR DELETE OR UPDATE ON squad_members
FOR EACH ROW
EXECUTE FUNCTION sync_squad_member_count();

-- Backfill existing counts
UPDATE squads s
SET member_count = (SELECT COUNT(*) FROM squad_members sm WHERE sm.squad_id = s.id);
