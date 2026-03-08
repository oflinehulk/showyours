-- Fix audit log INSERT policy: restrict to authenticated users only
DROP POLICY IF EXISTS "System can insert audit logs" ON tournament_audit_log;
CREATE POLICY "Authenticated users can insert audit logs"
  ON tournament_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);