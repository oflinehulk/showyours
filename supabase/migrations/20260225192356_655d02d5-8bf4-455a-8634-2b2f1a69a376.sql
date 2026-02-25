CREATE OR REPLACE FUNCTION public.validate_tournament_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_approved_count INT;
  v_stage_count INT;
  v_completed_stage_count INT;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  CASE OLD.status
    WHEN 'registration_open' THEN
      IF NEW.status NOT IN ('registration_closed') THEN
        RAISE EXCEPTION 'Cannot transition from registration_open to %', NEW.status;
      END IF;

    WHEN 'registration_closed' THEN
      IF NEW.is_multi_stage THEN
        IF NEW.status NOT IN ('bracket_generated', 'ongoing') THEN
          RAISE EXCEPTION 'Cannot transition from registration_closed to %', NEW.status;
        END IF;
      ELSE
        IF NEW.status NOT IN ('bracket_generated') THEN
          RAISE EXCEPTION 'Cannot transition from registration_closed to %', NEW.status;
        END IF;
      END IF;

      SELECT COUNT(*) INTO v_approved_count
      FROM tournament_registrations
      WHERE tournament_id = NEW.id AND status = 'approved';

      IF v_approved_count < 2 THEN
        RAISE EXCEPTION 'Need at least 2 approved squads to generate bracket (currently %)', v_approved_count;
      END IF;

    WHEN 'bracket_generated' THEN
      IF NEW.status NOT IN ('ongoing', 'registration_closed') THEN
        RAISE EXCEPTION 'Cannot transition from bracket_generated to %', NEW.status;
      END IF;

    WHEN 'ongoing' THEN
      IF NEW.is_multi_stage THEN
        IF NEW.status NOT IN ('completed', 'registration_closed') THEN
          RAISE EXCEPTION 'Cannot transition from ongoing to %', NEW.status;
        END IF;
      ELSE
        IF NEW.status NOT IN ('completed') THEN
          RAISE EXCEPTION 'Cannot transition from ongoing to %', NEW.status;
        END IF;
      END IF;

      IF NEW.status = 'completed' AND NEW.is_multi_stage THEN
        SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
        INTO v_stage_count, v_completed_stage_count
        FROM tournament_stages
        WHERE tournament_id = NEW.id;

        IF v_stage_count > 0 AND v_completed_stage_count < v_stage_count THEN
          RAISE EXCEPTION 'Cannot complete tournament: % of % stages completed', v_completed_stage_count, v_stage_count;
        END IF;
      END IF;

    WHEN 'completed' THEN
      RAISE EXCEPTION 'Cannot change status of a completed tournament';

    WHEN 'cancelled' THEN
      RAISE EXCEPTION 'Cannot change status of a cancelled tournament';
  END CASE;

  RETURN NEW;
END;
$$;