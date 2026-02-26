-- Fix: null mlbb_id in tournament_squad_members during recapture/host-add
--
-- Root cause: check_duplicate_player_in_tournament() unconditionally runs
-- normalize_mlbb_id() on NEW.mlbb_id. When mlbb_id is '' (empty string,
-- used as fallback for squad members without an MLBB ID), normalize_mlbb_id
-- returns NULL (no digits to extract), which then violates the NOT NULL
-- constraint on tournament_squad_members.mlbb_id.
--
-- Fixes:
-- 1. Guard normalization in the trigger — only normalize non-empty values
-- 2. Add empty-string fallback to rpc_host_add_squad COALESCE
-- 3. Update unique index to exclude empty-string mlbb_ids

-- 1. Fix check_duplicate_player_in_tournament: guard normalization
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
  -- Only normalize MLBB ID if it has actual content (digits to extract)
  IF NEW.mlbb_id IS NOT NULL AND trim(NEW.mlbb_id) <> '' THEN
    NEW.mlbb_id := COALESCE(public.normalize_mlbb_id(NEW.mlbb_id), NEW.mlbb_id);
  END IF;

  IF NEW.member_status != 'active' THEN
    RETURN NEW;
  END IF;

  SELECT tr.tournament_id
  INTO v_tournament_id
  FROM public.tournament_registrations tr
  WHERE tr.tournament_squad_id = NEW.tournament_squad_id
  LIMIT 1;

  -- Skip duplicate check if no tournament or no meaningful mlbb_id
  IF v_tournament_id IS NULL OR NEW.mlbb_id IS NULL OR trim(NEW.mlbb_id) = '' THEN
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

-- 2. Fix rpc_host_add_squad: add empty-string fallback for mlbb_id
CREATE OR REPLACE FUNCTION public.rpc_host_add_squad(
  p_tournament_id UUID,
  p_squad_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tournament RECORD;
  v_squad RECORD;
  v_approved_count INTEGER;
  v_tournament_squad_id UUID;
  v_member RECORD;
  v_position INTEGER := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF v_tournament IS NULL THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  IF v_tournament.host_id != v_user_id THEN
    RAISE EXCEPTION 'Only the tournament host can add squads';
  END IF;

  IF v_tournament.status != 'registration_closed' THEN
    RAISE EXCEPTION 'Squads can only be added when registration is closed';
  END IF;

  SELECT COUNT(*) INTO v_approved_count
  FROM tournament_registrations
  WHERE tournament_id = p_tournament_id AND status = 'approved';

  IF v_approved_count >= v_tournament.max_squads THEN
    RAISE EXCEPTION 'Tournament is full — no more spots available';
  END IF;

  IF EXISTS (
    SELECT 1 FROM tournament_registrations tr
    JOIN tournament_squads ts ON ts.id = tr.tournament_squad_id
    WHERE tr.tournament_id = p_tournament_id
      AND ts.existing_squad_id = p_squad_id
  ) THEN
    RAISE EXCEPTION 'This squad is already registered for this tournament';
  END IF;

  SELECT * INTO v_squad
  FROM squads
  WHERE id = p_squad_id;

  IF v_squad IS NULL THEN
    RAISE EXCEPTION 'Squad not found';
  END IF;

  IF v_squad.member_count < 5 THEN
    RAISE EXCEPTION 'Squad must have at least 5 members';
  END IF;

  INSERT INTO tournament_squads (name, leader_id, existing_squad_id, logo_url)
  VALUES (v_squad.name, v_squad.owner_id, p_squad_id, v_squad.logo_url)
  RETURNING id INTO v_tournament_squad_id;

  FOR v_member IN
    SELECT sm.*, p.ign AS profile_ign, p.mlbb_id AS profile_mlbb_id
    FROM squad_members sm
    LEFT JOIN profiles p ON p.id = sm.profile_id
    WHERE sm.squad_id = p_squad_id
    ORDER BY sm.position ASC
  LOOP
    v_position := v_position + 1;

    INSERT INTO tournament_squad_members (
      tournament_squad_id, ign, mlbb_id, role, position, user_id, member_status
    ) VALUES (
      v_tournament_squad_id,
      COALESCE(v_member.profile_ign, v_member.ign),
      COALESCE(v_member.profile_mlbb_id, v_member.mlbb_id, ''),
      CASE WHEN v_position <= 5 THEN 'main'::squad_member_role ELSE 'substitute'::squad_member_role END,
      v_position,
      v_member.user_id,
      'active'
    );
  END LOOP;

  INSERT INTO tournament_registrations (tournament_id, tournament_squad_id, status)
  VALUES (p_tournament_id, v_tournament_squad_id, 'approved');

  RETURN v_tournament_squad_id;
END;
$$;

-- 3. Update unique index to exclude empty-string mlbb_ids
--    Empty strings are placeholders for members without MLBB IDs and
--    should not participate in uniqueness checks.
DROP INDEX IF EXISTS unique_active_player_per_tournament;
CREATE UNIQUE INDEX unique_active_player_per_tournament
ON public.tournament_squad_members (mlbb_id, tournament_squad_id)
WHERE member_status = 'active' AND mlbb_id <> '';
