
CREATE OR REPLACE FUNCTION public.rpc_get_scheduling_context(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rec RECORD;
  v_matches JSONB;
  v_submitted_at TIMESTAMPTZ;
  v_booked_slots JSONB;
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

  -- Collect all booked (scheduled) match times in this tournament
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'match_id', bm.id,
    'scheduled_time', bm.scheduled_time,
    'squad_a_name', ba.name,
    'squad_b_name', bb.name
  )), '[]'::jsonb)
  INTO v_booked_slots
  FROM tournament_matches bm
  LEFT JOIN tournament_squads ba ON ba.id = bm.squad_a_id
  LEFT JOIN tournament_squads bb ON bb.id = bm.squad_b_id
  WHERE bm.tournament_id = v_rec.tournament_id
    AND bm.scheduled_time IS NOT NULL;

  SELECT ss.submitted_at INTO v_submitted_at FROM scheduling_submissions ss
  WHERE ss.tournament_id = v_rec.tournament_id AND ss.tournament_squad_id = v_rec.tournament_squad_id;

  RETURN jsonb_build_object(
    'tournament_id', v_rec.tournament_id, 'tournament_name', v_rec.tournament_name,
    'squad_id', v_rec.tournament_squad_id, 'squad_name', v_rec.squad_name,
    'squad_logo', v_rec.squad_logo, 'matches', v_matches, 'submitted_at', v_submitted_at,
    'booked_slots', v_booked_slots
  );
END;
$function$;
