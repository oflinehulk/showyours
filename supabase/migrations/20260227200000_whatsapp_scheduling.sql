-- WhatsApp-driven match scheduling tables and functions

-- 1. scheduling_tokens: unique links for squad leaders to submit availability
CREATE TABLE public.scheduling_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  tournament_squad_id UUID NOT NULL REFERENCES public.tournament_squads(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(tournament_id, tournament_squad_id)
);

ALTER TABLE public.scheduling_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can read their tournament scheduling tokens"
  ON public.scheduling_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.host_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can create scheduling tokens"
  ON public.scheduling_tokens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.host_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can delete scheduling tokens"
  ON public.scheduling_tokens FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.host_id = auth.uid()
    )
  );

-- 2. squad_availability: time slots each squad is available
CREATE TABLE public.squad_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  tournament_squad_id UUID NOT NULL REFERENCES public.tournament_squads(id) ON DELETE CASCADE,
  available_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, tournament_squad_id, available_date, slot_time)
);

ALTER TABLE public.squad_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read squad availability"
  ON public.squad_availability FOR SELECT USING (true);

-- 3. scheduling_submissions: tracks who has submitted availability
CREATE TABLE public.scheduling_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  tournament_squad_id UUID NOT NULL REFERENCES public.tournament_squads(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, tournament_squad_id)
);

ALTER TABLE public.scheduling_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scheduling submissions"
  ON public.scheduling_submissions FOR SELECT USING (true);

-- 4. RPC: get scheduling context for the public page
CREATE OR REPLACE FUNCTION public.rpc_get_scheduling_context(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_existing_slots JSONB;
  v_matches JSONB;
  v_submitted_at TIMESTAMPTZ;
BEGIN
  -- Validate token and get context
  SELECT st.tournament_id, st.tournament_squad_id, st.expires_at,
         ts.name AS squad_name, ts.logo_url AS squad_logo,
         t.name AS tournament_name
  INTO v_rec
  FROM scheduling_tokens st
  JOIN tournament_squads ts ON ts.id = st.tournament_squad_id
  JOIN tournaments t ON t.id = st.tournament_id
  WHERE st.token = p_token;

  IF v_rec IS NULL THEN
    RAISE EXCEPTION 'Invalid scheduling link';
  END IF;

  IF v_rec.expires_at IS NOT NULL AND v_rec.expires_at < now() THEN
    RAISE EXCEPTION 'This scheduling link has expired';
  END IF;

  -- Get existing availability
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('date', sa.available_date::TEXT, 'time', to_char(sa.slot_time, 'HH24:MI'))
  ), '[]'::jsonb)
  INTO v_existing_slots
  FROM squad_availability sa
  WHERE sa.tournament_id = v_rec.tournament_id
    AND sa.tournament_squad_id = v_rec.tournament_squad_id;

  -- Get this squad's pending matches with opponent names
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'round', m.round,
      'match_number', m.match_number,
      'group_id', m.group_id,
      'scheduled_time', m.scheduled_time,
      'status', m.status,
      'opponent_name', CASE
        WHEN m.squad_a_id = v_rec.tournament_squad_id THEN opp_b.name
        ELSE opp_a.name
      END
    ) ORDER BY m.round, m.match_number
  ), '[]'::jsonb)
  INTO v_matches
  FROM tournament_matches m
  LEFT JOIN tournament_squads opp_a ON opp_a.id = m.squad_a_id
  LEFT JOIN tournament_squads opp_b ON opp_b.id = m.squad_b_id
  WHERE m.tournament_id = v_rec.tournament_id
    AND (m.squad_a_id = v_rec.tournament_squad_id OR m.squad_b_id = v_rec.tournament_squad_id)
    AND m.status IN ('pending', 'ongoing');

  -- Check if already submitted
  SELECT ss.submitted_at INTO v_submitted_at
  FROM scheduling_submissions ss
  WHERE ss.tournament_id = v_rec.tournament_id
    AND ss.tournament_squad_id = v_rec.tournament_squad_id;

  RETURN jsonb_build_object(
    'tournament_id', v_rec.tournament_id,
    'tournament_name', v_rec.tournament_name,
    'squad_id', v_rec.tournament_squad_id,
    'squad_name', v_rec.squad_name,
    'squad_logo', v_rec.squad_logo,
    'existing_slots', v_existing_slots,
    'matches', v_matches,
    'submitted_at', v_submitted_at
  );
END;
$$;

-- 5. RPC: submit availability (unauthenticated, token-validated)
CREATE OR REPLACE FUNCTION public.rpc_submit_availability(
  p_token TEXT,
  p_slots JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record RECORD;
  v_slot JSONB;
BEGIN
  -- Validate token
  SELECT st.*, ts.name AS squad_name
  INTO v_token_record
  FROM scheduling_tokens st
  JOIN tournament_squads ts ON ts.id = st.tournament_squad_id
  WHERE st.token = p_token;

  IF v_token_record IS NULL THEN
    RAISE EXCEPTION 'Invalid scheduling link';
  END IF;

  IF v_token_record.expires_at IS NOT NULL AND v_token_record.expires_at < now() THEN
    RAISE EXCEPTION 'This scheduling link has expired';
  END IF;

  -- Delete existing availability (replace on re-submit)
  DELETE FROM squad_availability
  WHERE tournament_id = v_token_record.tournament_id
    AND tournament_squad_id = v_token_record.tournament_squad_id;

  -- Insert new availability slots
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
  LOOP
    INSERT INTO squad_availability (tournament_id, tournament_squad_id, available_date, slot_time)
    VALUES (
      v_token_record.tournament_id,
      v_token_record.tournament_squad_id,
      (v_slot->>'date')::DATE,
      (v_slot->>'time')::TIME
    );
  END LOOP;

  -- Upsert submission record
  INSERT INTO scheduling_submissions (tournament_id, tournament_squad_id, submitted_at, updated_at)
  VALUES (v_token_record.tournament_id, v_token_record.tournament_squad_id, now(), now())
  ON CONFLICT (tournament_id, tournament_squad_id)
  DO UPDATE SET updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'squad_name', v_token_record.squad_name
  );
END;
$$;
