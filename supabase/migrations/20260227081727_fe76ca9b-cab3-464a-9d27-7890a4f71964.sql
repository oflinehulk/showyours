
-- Clear old data
DELETE FROM public.squad_availability;

-- Add match_id column
ALTER TABLE public.squad_availability
  ADD COLUMN match_id UUID NOT NULL REFERENCES public.tournament_matches(id) ON DELETE CASCADE;

-- Drop old unique constraint and create new one
ALTER TABLE public.squad_availability
  DROP CONSTRAINT squad_availability_tournament_id_tournament_squad_id_availa_key;

ALTER TABLE public.squad_availability
  ADD CONSTRAINT squad_availability_unique_per_match
  UNIQUE (tournament_id, tournament_squad_id, match_id, available_date, slot_time);

-- Rewrite rpc_get_scheduling_context
CREATE OR REPLACE FUNCTION public.rpc_get_scheduling_context(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rec RECORD;
  v_matches JSONB;
  v_submitted_at TIMESTAMPTZ;
BEGIN
  SELECT st.tournament_id, st.tournament_squad_id, st.expires_at,
         ts.name AS squad_name, ts.logo_url AS squad_logo, t.name AS tournament_name
  INTO v_rec
  FROM scheduling_tokens st
  JOIN tournament_squads ts ON ts.id = st.tournament_squad_id
  JOIN tournaments t ON t.id = st.tournament_id
  WHERE st.token = p_token;
  IF v_rec IS NULL THEN RAISE EXCEPTION 'Invalid scheduling link'; END IF;
  IF v_rec.expires_at IS NOT NULL AND v_rec.expires_at < now() THEN RAISE EXCEPTION 'This scheduling link has expired'; END IF;

  SELECT COALESCE(jsonb_agg(match_row ORDER BY match_row->>'round', match_row->>'match_number'), '[]'::jsonb)
  INTO v_matches
  FROM (
    SELECT jsonb_build_object(
      'id', m.id, 'round', m.round, 'match_number', m.match_number,
      'group_id', m.group_id, 'scheduled_time', m.scheduled_time, 'status', m.status,
      'opponent_name', CASE WHEN m.squad_a_id = v_rec.tournament_squad_id THEN opp_b.name ELSE opp_a.name END,
      'opponent_id', CASE WHEN m.squad_a_id = v_rec.tournament_squad_id THEN m.squad_b_id ELSE m.squad_a_id END,
      'my_slots', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('date', sa.available_date::TEXT, 'time', to_char(sa.slot_time, 'HH24:MI')))
        FROM squad_availability sa WHERE sa.match_id = m.id AND sa.tournament_squad_id = v_rec.tournament_squad_id
      ), '[]'::jsonb),
      'opponent_slots', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('date', sa2.available_date::TEXT, 'time', to_char(sa2.slot_time, 'HH24:MI')))
        FROM squad_availability sa2 WHERE sa2.match_id = m.id
          AND sa2.tournament_squad_id = CASE WHEN m.squad_a_id = v_rec.tournament_squad_id THEN m.squad_b_id ELSE m.squad_a_id END
      ), '[]'::jsonb)
    ) AS match_row
    FROM tournament_matches m
    LEFT JOIN tournament_squads opp_a ON opp_a.id = m.squad_a_id
    LEFT JOIN tournament_squads opp_b ON opp_b.id = m.squad_b_id
    WHERE m.tournament_id = v_rec.tournament_id
      AND (m.squad_a_id = v_rec.tournament_squad_id OR m.squad_b_id = v_rec.tournament_squad_id)
      AND m.status IN ('pending', 'ongoing')
  ) sub;

  SELECT ss.submitted_at INTO v_submitted_at FROM scheduling_submissions ss
  WHERE ss.tournament_id = v_rec.tournament_id AND ss.tournament_squad_id = v_rec.tournament_squad_id;

  RETURN jsonb_build_object(
    'tournament_id', v_rec.tournament_id, 'tournament_name', v_rec.tournament_name,
    'squad_id', v_rec.tournament_squad_id, 'squad_name', v_rec.squad_name,
    'squad_logo', v_rec.squad_logo, 'matches', v_matches, 'submitted_at', v_submitted_at
  );
END;
$$;

-- Drop old function and recreate with renamed parameter
DROP FUNCTION IF EXISTS public.rpc_submit_availability(text, jsonb);

CREATE FUNCTION public.rpc_submit_availability(p_token TEXT, p_match_slots JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_token_record RECORD;
  v_match_entry JSONB;
  v_slot JSONB;
  v_match_id UUID;
BEGIN
  SELECT st.*, ts.name AS squad_name INTO v_token_record
  FROM scheduling_tokens st JOIN tournament_squads ts ON ts.id = st.tournament_squad_id
  WHERE st.token = p_token;
  IF v_token_record IS NULL THEN RAISE EXCEPTION 'Invalid scheduling link'; END IF;
  IF v_token_record.expires_at IS NOT NULL AND v_token_record.expires_at < now() THEN RAISE EXCEPTION 'This scheduling link has expired'; END IF;

  DELETE FROM squad_availability WHERE tournament_id = v_token_record.tournament_id AND tournament_squad_id = v_token_record.tournament_squad_id;

  FOR v_match_entry IN SELECT * FROM jsonb_array_elements(p_match_slots)
  LOOP
    v_match_id := (v_match_entry->>'match_id')::UUID;
    FOR v_slot IN SELECT * FROM jsonb_array_elements(v_match_entry->'slots')
    LOOP
      INSERT INTO squad_availability (tournament_id, tournament_squad_id, match_id, available_date, slot_time)
      VALUES (v_token_record.tournament_id, v_token_record.tournament_squad_id, v_match_id, (v_slot->>'date')::DATE, (v_slot->>'time')::TIME);
    END LOOP;
  END LOOP;

  INSERT INTO scheduling_submissions (tournament_id, tournament_squad_id, submitted_at, updated_at)
  VALUES (v_token_record.tournament_id, v_token_record.tournament_squad_id, now(), now())
  ON CONFLICT (tournament_id, tournament_squad_id) DO UPDATE SET updated_at = now();

  RETURN jsonb_build_object('success', true, 'squad_name', v_token_record.squad_name);
END;
$$;
