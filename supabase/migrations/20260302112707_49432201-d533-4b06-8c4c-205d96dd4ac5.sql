
-- ============================================================
-- 1. RPC: rpc_batch_seed_registrations
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_batch_seed_registrations(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_host_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT host_id INTO v_host_id FROM tournaments WHERE id = p_tournament_id;
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;
  IF v_host_id != v_user_id AND NOT public.has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Only the tournament host can seed registrations';
  END IF;

  WITH ordered_regs AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY registered_at ASC) AS seed_num
    FROM tournament_registrations
    WHERE tournament_id = p_tournament_id
      AND status = 'approved'
  )
  UPDATE tournament_registrations tr
  SET seed = ordered_regs.seed_num
  FROM ordered_regs
  WHERE tr.id = ordered_regs.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_batch_seed_registrations(uuid) TO authenticated;

-- ============================================================
-- 2. RPC: rpc_withdraw_squad_with_forfeits
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_withdraw_squad_with_forfeits(
  p_registration_id uuid,
  p_squad_id uuid,
  p_tournament_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_tournament RECORD;
  v_squad_leader_id UUID;
  match_row RECORD;
  opponent uuid;
  wins_needed int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  IF v_tournament IS NULL THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  SELECT leader_id INTO v_squad_leader_id FROM tournament_squads WHERE id = p_squad_id;

  IF v_user_id != v_tournament.host_id
     AND v_user_id != v_squad_leader_id
     AND NOT public.has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Only the tournament host or squad leader can withdraw';
  END IF;

  FOR match_row IN
    SELECT *
    FROM tournament_matches
    WHERE tournament_id = p_tournament_id
      AND status IN ('pending', 'ongoing')
      AND (squad_a_id = p_squad_id OR squad_b_id = p_squad_id)
  LOOP
    IF match_row.squad_a_id = p_squad_id THEN
      opponent := match_row.squad_b_id;
    ELSE
      opponent := match_row.squad_a_id;
    END IF;

    IF opponent IS NULL THEN
      CONTINUE;
    END IF;

    wins_needed := CEIL(COALESCE(match_row.best_of, 1)::numeric / 2);

    UPDATE tournament_matches
    SET winner_id = opponent,
        status = 'completed',
        is_forfeit = true,
        squad_a_score = CASE WHEN opponent = match_row.squad_a_id THEN wins_needed ELSE 0 END,
        squad_b_score = CASE WHEN opponent = match_row.squad_b_id THEN wins_needed ELSE 0 END,
        completed_at = NOW()
    WHERE id = match_row.id;
  END LOOP;

  UPDATE tournament_registrations
  SET status = 'withdrawn'
  WHERE id = p_registration_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_withdraw_squad_with_forfeits(uuid, uuid, uuid) TO authenticated;

-- ============================================================
-- 3. Database Indexes
-- ============================================================

-- Tournament matches
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_round
  ON tournament_matches (tournament_id, round, match_number);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_status_scheduled
  ON tournament_matches (status, scheduled_time)
  WHERE status IN ('pending', 'ongoing');

CREATE INDEX IF NOT EXISTS idx_tournament_matches_stage
  ON tournament_matches (stage_id, round, match_number)
  WHERE stage_id IS NOT NULL;

-- Tournament registrations
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament_status
  ON tournament_registrations (tournament_id, status, registered_at);

-- Tournament stages & groups
CREATE INDEX IF NOT EXISTS idx_tournament_stages_tournament
  ON tournament_stages (tournament_id, stage_number);

CREATE INDEX IF NOT EXISTS idx_tournament_groups_stage
  ON tournament_groups (stage_id, label);

CREATE INDEX IF NOT EXISTS idx_tournament_group_teams_group
  ON tournament_group_teams (group_id);

-- Roster changes
CREATE INDEX IF NOT EXISTS idx_roster_changes_squad_tournament
  ON roster_changes (tournament_squad_id, tournament_id, changed_at);

CREATE INDEX IF NOT EXISTS idx_roster_changes_tournament
  ON roster_changes (tournament_id, changed_at);

-- Tournament squad members
CREATE INDEX IF NOT EXISTS idx_tournament_squad_members_mlbb
  ON tournament_squad_members (tournament_squad_id, mlbb_id, member_status);

-- Squad members
CREATE INDEX IF NOT EXISTS idx_squad_members_squad_position
  ON squad_members (squad_id, position);

CREATE INDEX IF NOT EXISTS idx_squad_members_user
  ON squad_members (user_id);

-- Squad applications
CREATE INDEX IF NOT EXISTS idx_squad_applications_squad_status
  ON squad_applications (squad_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_squad_applications_user
  ON squad_applications (user_id, created_at);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications (user_id, read, created_at DESC);

-- ============================================================
-- 4. Trigram & profile search indexes
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_profiles_ign_trgm
  ON profiles USING gin (ign gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_mlbb_id
  ON profiles (mlbb_id)
  WHERE mlbb_id IS NOT NULL;
