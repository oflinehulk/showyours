
-- 1. Add banned_at column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_banned_at ON profiles (banned_at) WHERE banned_at IS NOT NULL;

-- ============================================================
-- 2. PROFILES — admin SELECT, UPDATE, DELETE
-- ============================================================
-- SELECT: already has "Profiles are viewable by everyone" with true, no change needed
-- UPDATE: add admin policy (already exists "Users can update their own profile")
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
-- DELETE: already has "Admins can delete any profile", no change needed

-- ============================================================
-- SQUADS — admin SELECT, UPDATE, DELETE
-- ============================================================
-- SELECT: already true for everyone, no change needed
-- UPDATE: already has "Admins can update any squad", no change needed
-- DELETE: already has "Admins can delete any squad", no change needed

-- ============================================================
-- TOURNAMENTS — admin SELECT, UPDATE, DELETE
-- ============================================================
-- SELECT: already true for everyone, no change needed
-- UPDATE: already has "Admins can update any tournament", no change needed
-- DELETE: already has "Admins can delete any tournament", no change needed

-- ============================================================
-- TOURNAMENT_MATCHES — admin SELECT, UPDATE, DELETE
-- ============================================================
-- SELECT: already true for everyone, no change needed
-- ALL: already has "Admins can manage all matches", covers everything, no change needed

-- ============================================================
-- TOURNAMENT_REGISTRATIONS — admin SELECT, UPDATE, DELETE
-- ============================================================
-- SELECT: already true for everyone, no change needed
-- UPDATE: add admin
DROP POLICY IF EXISTS "Hosts can manage registrations" ON tournament_registrations;
CREATE POLICY "Hosts can manage registrations"
  ON tournament_registrations FOR UPDATE
  USING ((EXISTS (SELECT 1 FROM tournaments WHERE tournaments.id = tournament_registrations.tournament_id AND tournaments.host_id = auth.uid())) OR has_role(auth.uid(), 'admin'::app_role));
-- DELETE: add admin
DROP POLICY IF EXISTS "Hosts can delete registrations" ON tournament_registrations;
CREATE POLICY "Hosts can delete registrations"
  ON tournament_registrations FOR DELETE
  USING ((EXISTS (SELECT 1 FROM tournaments WHERE tournaments.id = tournament_registrations.tournament_id AND tournaments.host_id = auth.uid())) OR has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Squad leaders can withdraw from tournaments" ON tournament_registrations;
CREATE POLICY "Squad leaders can withdraw from tournaments"
  ON tournament_registrations FOR DELETE
  USING ((EXISTS (SELECT 1 FROM tournament_squads WHERE tournament_squads.id = tournament_registrations.tournament_squad_id AND tournament_squads.leader_id = auth.uid())) OR has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- NOTIFICATIONS — admin SELECT, INSERT, UPDATE, DELETE
-- ============================================================
CREATE POLICY "Admins can read all notifications"
  ON notifications FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert notifications"
  ON notifications FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update notifications"
  ON notifications FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete notifications"
  ON notifications FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- SQUAD_MEMBERS — admin SELECT, DELETE
-- ============================================================
-- SELECT: already true for everyone, no change needed
-- DELETE: add admin
CREATE POLICY "Admins can delete any squad member"
  ON squad_members FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- SQUAD_APPLICATIONS — admin SELECT, DELETE
-- ============================================================
CREATE POLICY "Admins can view all applications"
  ON squad_applications FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete any application"
  ON squad_applications FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- SQUAD_INVITATIONS — admin SELECT, DELETE
-- ============================================================
CREATE POLICY "Admins can view all invitations"
  ON squad_invitations FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete any invitation"
  ON squad_invitations FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- TOURNAMENT_SQUADS — admin SELECT, DELETE
-- ============================================================
-- SELECT: already true for everyone, no change needed
CREATE POLICY "Admins can delete any tournament squad"
  ON tournament_squads FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- TOURNAMENT_SQUAD_MEMBERS — admin SELECT, DELETE
-- ============================================================
-- SELECT: already true for everyone, no change needed
CREATE POLICY "Admins can delete any tournament squad member"
  ON tournament_squad_members FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- ROSTER_CHANGES — admin SELECT, DELETE
-- ============================================================
-- SELECT: already true for everyone, no change needed
CREATE POLICY "Admins can delete any roster change"
  ON roster_changes FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- TOURNAMENT_STAGES — admin SELECT, DELETE
-- ============================================================
-- SELECT: already true for everyone, no change needed
-- DELETE: already has admin in "Hosts can delete stages", no change needed

-- ============================================================
-- TOURNAMENT_GROUPS — admin SELECT, DELETE
-- ============================================================
-- SELECT: already true for everyone, no change needed
-- DELETE: already has admin in "Hosts can delete groups", no change needed

-- ============================================================
-- TOURNAMENT_GROUP_TEAMS — admin SELECT, DELETE
-- ============================================================
-- SELECT: already true for everyone, no change needed
-- DELETE: already has admin in "Hosts can delete group teams", no change needed

-- ============================================================
-- TOURNAMENT_AUDIT_LOG — admin SELECT
-- ============================================================
-- Already has "Admins can read all audit logs", no change needed

-- ============================================================
-- GROUP_DRAWS — admin SELECT, DELETE
-- ============================================================
-- SELECT: already true for everyone, no change needed
-- DELETE: already has admin in "Admins can delete group draws", no change needed

-- ============================================================
-- MATCH_DRAFTS — admin SELECT, DELETE
-- ============================================================
-- SELECT: already true for everyone, no change needed
CREATE POLICY "Admins can delete any match draft"
  ON match_drafts FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- TOURNAMENT_INVITATIONS — admin SELECT, DELETE
-- ============================================================
-- SELECT: already true for everyone, no change needed
CREATE POLICY "Admins can delete any tournament invitation"
  ON tournament_invitations FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- USER_ROLES — admin SELECT, INSERT, DELETE
-- ============================================================
-- SELECT: already has "Admins can view all roles", no change needed
-- INSERT: already has "Admins can insert roles", no change needed
-- DELETE: already has "Admins can delete roles", no change needed
