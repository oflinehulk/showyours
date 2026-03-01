
-- Allow tournament hosts to update squad name/logo_url
-- Join path: tournament_squads → tournament_registrations → tournaments
CREATE POLICY "Hosts can update tournament squad details"
ON public.tournament_squads
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM tournament_registrations tr
    JOIN tournaments t ON t.id = tr.tournament_id
    WHERE tr.tournament_squad_id = tournament_squads.id
      AND t.host_id = auth.uid()
  )
);

-- Audit trigger for squad name/logo changes
CREATE OR REPLACE FUNCTION public.audit_tournament_squad_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament_id uuid;
BEGIN
  -- Only log if name or logo_url actually changed
  IF (OLD.name IS DISTINCT FROM NEW.name) OR (OLD.logo_url IS DISTINCT FROM NEW.logo_url) THEN
    SELECT tr.tournament_id INTO v_tournament_id
    FROM tournament_registrations tr
    WHERE tr.tournament_squad_id = NEW.id
    LIMIT 1;

    IF v_tournament_id IS NOT NULL THEN
      INSERT INTO tournament_audit_log (tournament_id, user_id, action, details)
      VALUES (
        v_tournament_id,
        auth.uid(),
        'squad_details_updated',
        jsonb_build_object(
          'tournament_squad_id', NEW.id,
          'old_name', OLD.name,
          'new_name', NEW.name,
          'old_logo_url', OLD.logo_url,
          'new_logo_url', NEW.logo_url
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_tournament_squad_update
BEFORE UPDATE ON public.tournament_squads
FOR EACH ROW
EXECUTE FUNCTION public.audit_tournament_squad_update();
