
-- Drop the narrow index that only covers manual members
DROP INDEX IF EXISTS unique_manual_member_mlbb_id;

-- Create a broader unique index: no two squad_members can share the same mlbb_id (manual OR linked)
CREATE UNIQUE INDEX unique_squad_member_mlbb_id
  ON squad_members (mlbb_id)
  WHERE mlbb_id IS NOT NULL;

-- Ensure one squad membership per profile (linked players)
CREATE UNIQUE INDEX unique_squad_member_profile_id
  ON squad_members (profile_id)
  WHERE profile_id IS NOT NULL;
