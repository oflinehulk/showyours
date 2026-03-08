-- Tighten audit log INSERT: only tournament hosts + admins (not any authenticated user)
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON tournament_audit_log;

CREATE POLICY "Hosts and admins can insert audit logs"
  ON tournament_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_audit_log.tournament_id
        AND t.host_id = auth.uid()
    ))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Enable realtime for tournament_matches and tournament_registrations
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_registrations;