-- 1. Create a unique index on normalized MLBB ID in profiles table
-- This is the HARD BLOCK - no two profiles can share the same normalized MLBB ID
CREATE UNIQUE INDEX unique_profiles_mlbb_id_normalized
ON public.profiles (normalize_mlbb_id(mlbb_id))
WHERE mlbb_id IS NOT NULL AND btrim(mlbb_id) <> '';

-- 2. Create trigger to auto-normalize MLBB ID on profile insert/update
CREATE OR REPLACE FUNCTION public.profiles_normalize_mlbb_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.mlbb_id IS NOT NULL AND btrim(NEW.mlbb_id) <> '' THEN
    NEW.mlbb_id := public.normalize_mlbb_id(NEW.mlbb_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_normalize_mlbb_id
BEFORE INSERT OR UPDATE OF mlbb_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.profiles_normalize_mlbb_id();