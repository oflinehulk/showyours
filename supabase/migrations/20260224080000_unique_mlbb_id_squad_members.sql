-- Enforce one-squad-per-player for manual members by MLBB ID.
-- Registered users are already covered by the unique_user_one_squad constraint on user_id.
-- Manual members (profile_id IS NULL) only have mlbb_id to identify them,
-- so we add a unique partial index to prevent the same MLBB ID across squads.

-- Step 1: Find and remove duplicate manual members (keep the earliest joined per mlbb_id).
-- This DELETE keeps the first-joined row and removes later duplicates.
DELETE FROM squad_members
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY mlbb_id ORDER BY joined_at ASC) AS rn
    FROM squad_members
    WHERE profile_id IS NULL
      AND mlbb_id IS NOT NULL
  ) dupes
  WHERE rn > 1
);

-- Step 2: Add unique partial index on mlbb_id for manual members only.
-- This prevents adding a manual member with an MLBB ID that already exists in any squad.
CREATE UNIQUE INDEX unique_manual_member_mlbb_id
  ON squad_members (mlbb_id)
  WHERE mlbb_id IS NOT NULL AND profile_id IS NULL;
