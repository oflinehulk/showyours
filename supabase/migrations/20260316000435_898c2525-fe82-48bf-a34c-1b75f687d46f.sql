
-- Fix rpc_delete_tournament_cascade to collect squad IDs before deleting registrations
CREATE OR REPLACE FUNCTION public.rpc_delete_tournament_cascade(p_tournament_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_tournament RECORD;
  v_total INT := 0;
  v_count INT;
  v_squad_ids UUID[];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  IF v_tournament IS NULL THEN RAISE EXCEPTION 'Tournament not found'; END IF;
  IF v_tournament.host_id != v_user_id AND NOT public.has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Only the tournament host can delete the tournament';
  END IF;

  -- Collect squad IDs before deleting registrations
  SELECT ARRAY_AGG(tournament_squad_id) INTO v_squad_ids
  FROM tournament_registrations WHERE tournament_id = p_tournament_id;

  -- Delete match_drafts
  DELETE FROM match_drafts WHERE tournament_id = p_tournament_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- Delete squad_availability
  DELETE FROM squad_availability WHERE tournament_id = p_tournament_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- Delete scheduling_submissions
  DELETE FROM scheduling_submissions WHERE tournament_id = p_tournament_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- Delete scheduling_tokens
  DELETE FROM scheduling_tokens WHERE tournament_id = p_tournament_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- Delete tournament_matches
  DELETE FROM tournament_matches WHERE tournament_id = p_tournament_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- Delete roster_changes
  DELETE FROM roster_changes WHERE tournament_id = p_tournament_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- Delete tournament_invitations
  DELETE FROM tournament_invitations WHERE tournament_id = p_tournament_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- Delete group_draws
  DELETE FROM group_draws WHERE tournament_id = p_tournament_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- Delete tournament_group_teams (via groups)
  DELETE FROM tournament_group_teams WHERE group_id IN (
    SELECT id FROM tournament_groups WHERE tournament_id = p_tournament_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- Delete tournament_groups
  DELETE FROM tournament_groups WHERE tournament_id = p_tournament_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- Delete tournament_stages
  DELETE FROM tournament_stages WHERE tournament_id = p_tournament_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- Delete tournament_squad_members
  IF v_squad_ids IS NOT NULL THEN
    DELETE FROM tournament_squad_members WHERE tournament_squad_id = ANY(v_squad_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;
  END IF;

  -- Delete tournament_registrations
  DELETE FROM tournament_registrations WHERE tournament_id = p_tournament_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- Delete tournament_squads
  IF v_squad_ids IS NOT NULL THEN
    DELETE FROM tournament_squads WHERE id = ANY(v_squad_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;
  END IF;

  -- Delete audit log
  DELETE FROM tournament_audit_log WHERE tournament_id = p_tournament_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- Delete notifications
  DELETE FROM notifications WHERE tournament_id = p_tournament_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- Delete the tournament itself
  DELETE FROM tournaments WHERE id = p_tournament_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  RETURN v_total;
END;
$function$;
