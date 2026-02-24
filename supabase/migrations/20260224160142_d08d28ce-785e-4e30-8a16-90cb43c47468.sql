-- 1) Normalize MLBB IDs everywhere (extract leading digits)
CREATE OR REPLACE FUNCTION public.normalize_mlbb_id(p_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF((regexp_match(trim(coalesce(p_input, '')), '^([0-9]+)'))[1], '');
$$;

-- 2) Ensure squad_members MLBB IDs are normalized before write
CREATE OR REPLACE FUNCTION public.squad_members_normalize_mlbb_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.mlbb_id IS NOT NULL AND trim(NEW.mlbb_id) <> '' THEN
    NEW.mlbb_id := public.normalize_mlbb_id(NEW.mlbb_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_squad_members_normalize_mlbb_id ON public.squad_members;
CREATE TRIGGER trg_squad_members_normalize_mlbb_id
BEFORE INSERT OR UPDATE OF mlbb_id ON public.squad_members
FOR EACH ROW
EXECUTE FUNCTION public.squad_members_normalize_mlbb_id();

-- 3) Ensure the existing validate_squad_member() actually runs
DROP TRIGGER IF EXISTS trg_validate_squad_member ON public.squad_members;
CREATE TRIGGER trg_validate_squad_member
BEFORE INSERT OR UPDATE ON public.squad_members
FOR EACH ROW
EXECUTE FUNCTION public.validate_squad_member();

-- 4) Enforce global uniqueness by normalized MLBB ID (ignore NULL/empty)
CREATE UNIQUE INDEX IF NOT EXISTS unique_squad_members_mlbb_id_normalized
ON public.squad_members ((public.normalize_mlbb_id(mlbb_id)))
WHERE mlbb_id IS NOT NULL AND trim(mlbb_id) <> '';

-- 5) Harden tournament duplicate check: normalize + enforce via trigger
CREATE OR REPLACE FUNCTION public.check_duplicate_player_in_tournament()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament_id uuid;
  v_duplicate_squad text;
BEGIN
  -- Normalize MLBB ID on write
  NEW.mlbb_id := public.normalize_mlbb_id(NEW.mlbb_id);

  IF NEW.member_status != 'active' THEN
    RETURN NEW;
  END IF;

  SELECT tr.tournament_id
  INTO v_tournament_id
  FROM public.tournament_registrations tr
  WHERE tr.tournament_squad_id = NEW.tournament_squad_id
  LIMIT 1;

  IF v_tournament_id IS NULL OR NEW.mlbb_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT ts.name
  INTO v_duplicate_squad
  FROM public.tournament_squad_members tsm
  JOIN public.tournament_registrations tr ON tr.tournament_squad_id = tsm.tournament_squad_id
  JOIN public.tournament_squads ts ON ts.id = tsm.tournament_squad_id
  WHERE tr.tournament_id = v_tournament_id
    AND tsm.member_status = 'active'
    AND tsm.tournament_squad_id != NEW.tournament_squad_id
    AND public.normalize_mlbb_id(tsm.mlbb_id) = NEW.mlbb_id
  LIMIT 1;

  IF v_duplicate_squad IS NOT NULL THEN
    RAISE EXCEPTION 'Player with MLBB ID "%" is already registered in squad "%" for this tournament', NEW.mlbb_id, v_duplicate_squad;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_duplicate_player_in_tournament ON public.tournament_squad_members;
CREATE TRIGGER trg_check_duplicate_player_in_tournament
BEFORE INSERT OR UPDATE OF mlbb_id, member_status ON public.tournament_squad_members
FOR EACH ROW
EXECUTE FUNCTION public.check_duplicate_player_in_tournament();
