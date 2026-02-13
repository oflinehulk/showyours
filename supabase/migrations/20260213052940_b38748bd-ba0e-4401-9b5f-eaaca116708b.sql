
-- Make profile_id and user_id nullable for manual (non-registered) members
ALTER TABLE public.squad_members ALTER COLUMN profile_id DROP NOT NULL;
ALTER TABLE public.squad_members ALTER COLUMN user_id DROP NOT NULL;

-- Add columns for manual member info
ALTER TABLE public.squad_members ADD COLUMN IF NOT EXISTS ign text;
ALTER TABLE public.squad_members ADD COLUMN IF NOT EXISTS mlbb_id text;
ALTER TABLE public.squad_members ADD COLUMN IF NOT EXISTS whatsapp text;

-- Add constraint: manual members must have ign
-- If profile_id is null (manual member), ign must be set
CREATE OR REPLACE FUNCTION public.validate_squad_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Manual member (no profile): must have IGN
  IF NEW.profile_id IS NULL AND (NEW.ign IS NULL OR NEW.ign = '') THEN
    RAISE EXCEPTION 'Manual members must have an IGN';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_squad_member_trigger
BEFORE INSERT OR UPDATE ON public.squad_members
FOR EACH ROW
EXECUTE FUNCTION public.validate_squad_member();
