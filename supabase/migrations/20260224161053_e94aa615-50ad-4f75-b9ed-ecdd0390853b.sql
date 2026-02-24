-- Fix: ensure squad_members always stores a normalized MLBB ID (including for registered members)

-- 1) Harden normalization function (also fixes search_path linter warning)
CREATE OR REPLACE FUNCTION public.normalize_mlbb_id(p_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT NULLIF((regexp_match(trim(coalesce(p_input, '')), '^([0-9]+)'))[1], '');
$$;

-- 2) Copy MLBB ID from profile when profile_id is set, then normalize
CREATE OR REPLACE FUNCTION public.squad_members_normalize_mlbb_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_profile_mlbb text;
BEGIN
  IF NEW.profile_id IS NOT NULL THEN
    SELECT mlbb_id INTO v_profile_mlbb
    FROM public.profiles
    WHERE id = NEW.profile_id;

    IF v_profile_mlbb IS NOT NULL AND trim(v_profile_mlbb) <> '' THEN
      NEW.mlbb_id := v_profile_mlbb;
    END IF;
  END IF;

  IF NEW.mlbb_id IS NOT NULL AND trim(NEW.mlbb_id) <> '' THEN
    NEW.mlbb_id := public.normalize_mlbb_id(NEW.mlbb_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger already exists; ensure it's attached (idempotent)
DROP TRIGGER IF EXISTS trg_squad_members_normalize_mlbb_id ON public.squad_members;
CREATE TRIGGER trg_squad_members_normalize_mlbb_id
BEFORE INSERT OR UPDATE OF mlbb_id, profile_id ON public.squad_members
FOR EACH ROW
EXECUTE FUNCTION public.squad_members_normalize_mlbb_id();
