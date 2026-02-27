
-- Table 1: scheduling_tokens
CREATE TABLE public.scheduling_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  tournament_squad_id UUID NOT NULL REFERENCES public.tournament_squads(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, tournament_squad_id)
);

ALTER TABLE public.scheduling_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can read scheduling tokens"
  ON public.scheduling_tokens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = scheduling_tokens.tournament_id AND t.host_id = auth.uid()
  ));

CREATE POLICY "Hosts can create scheduling tokens"
  ON public.scheduling_tokens FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = scheduling_tokens.tournament_id AND t.host_id = auth.uid()
  ));

CREATE POLICY "Hosts can delete scheduling tokens"
  ON public.scheduling_tokens FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = scheduling_tokens.tournament_id AND t.host_id = auth.uid()
  ));

-- Table 2: squad_availability
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

CREATE POLICY "Squad availability is viewable by everyone"
  ON public.squad_availability FOR SELECT
  USING (true);

-- Table 3: scheduling_submissions
CREATE TABLE public.scheduling_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  tournament_squad_id UUID NOT NULL REFERENCES public.tournament_squads(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, tournament_squad_id)
);

ALTER TABLE public.scheduling_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scheduling submissions are viewable by everyone"
  ON public.scheduling_submissions FOR SELECT
  USING (true);

-- RPC 1: rpc_get_scheduling_context
CREATE OR REPLACE FUNCTION public.rpc_get_scheduling_context(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token RECORD;
  v_tournament RECORD;
  v_squad RECORD;
  v_slots JSONB;
  v_matches JSONB;
  v_submitted_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_token FROM scheduling_tokens WHERE token = p_token;
  IF v_token IS NULL THEN
    RAISE EXCEPTION 'Invalid scheduling token';
  END IF;
  IF v_token.expires_at < now() THEN
    RAISE EXCEPTION 'Scheduling token has expired';
  END IF;

  SELECT * INTO v_tournament FROM tournaments WHERE id = v_token.tournament_id;
  SELECT * INTO v_squad FROM tournament_squads WHERE id = v_token.tournament_squad_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', sa.available_date, 'time', sa.slot_time)), '[]'::jsonb)
  INTO v_slots
  FROM squad_availability sa
  WHERE sa.tournament_id = v_token.tournament_id
    AND sa.tournament_squad_id = v_token.tournament_squad_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'match_id', m.id,
    'round', m.round,
    'match_number', m.match_number,
    'opponent_name', CASE
      WHEN m.squad_a_id = v_token.tournament_squad_id THEN opp_b.name
      WHEN m.squad_b_id = v_token.tournament_squad_id THEN opp_a.name
      ELSE 'TBD'
    END
  )), '[]'::jsonb)
  INTO v_matches
  FROM tournament_matches m
  LEFT JOIN tournament_squads opp_a ON opp_a.id = m.squad_a_id
  LEFT JOIN tournament_squads opp_b ON opp_b.id = m.squad_b_id
  WHERE m.tournament_id = v_token.tournament_id
    AND m.status = 'pending'
    AND (m.squad_a_id = v_token.tournament_squad_id OR m.squad_b_id = v_token.tournament_squad_id);

  SELECT ss.submitted_at INTO v_submitted_at
  FROM scheduling_submissions ss
  WHERE ss.tournament_id = v_token.tournament_id
    AND ss.tournament_squad_id = v_token.tournament_squad_id;

  RETURN jsonb_build_object(
    'tournament_id', v_token.tournament_id,
    'tournament_name', v_tournament.name,
    'squad_id', v_token.tournament_squad_id,
    'squad_name', v_squad.name,
    'squad_logo', v_squad.logo_url,
    'existing_slots', v_slots,
    'matches', v_matches,
    'submitted_at', v_submitted_at
  );
END;
$$;

-- RPC 2: rpc_submit_availability
CREATE OR REPLACE FUNCTION public.rpc_submit_availability(p_token TEXT, p_slots JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token RECORD;
  v_squad_name TEXT;
  v_slot JSONB;
BEGIN
  SELECT * INTO v_token FROM scheduling_tokens WHERE token = p_token;
  IF v_token IS NULL THEN
    RAISE EXCEPTION 'Invalid scheduling token';
  END IF;
  IF v_token.expires_at < now() THEN
    RAISE EXCEPTION 'Scheduling token has expired';
  END IF;

  SELECT name INTO v_squad_name FROM tournament_squads WHERE id = v_token.tournament_squad_id;

  DELETE FROM squad_availability
  WHERE tournament_id = v_token.tournament_id
    AND tournament_squad_id = v_token.tournament_squad_id;

  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots) LOOP
    INSERT INTO squad_availability (tournament_id, tournament_squad_id, available_date, slot_time)
    VALUES (
      v_token.tournament_id,
      v_token.tournament_squad_id,
      (v_slot->>'date')::DATE,
      (v_slot->>'time')::TIME
    );
  END LOOP;

  INSERT INTO scheduling_submissions (tournament_id, tournament_squad_id)
  VALUES (v_token.tournament_id, v_token.tournament_squad_id)
  ON CONFLICT (tournament_id, tournament_squad_id)
  DO UPDATE SET updated_at = now();

  RETURN jsonb_build_object('success', true, 'squad_name', v_squad_name);
END;
$$;
