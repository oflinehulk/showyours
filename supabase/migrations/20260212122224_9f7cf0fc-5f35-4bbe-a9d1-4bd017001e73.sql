-- Remove the duplicate membership (keep the first one joined)
DELETE FROM squad_members 
WHERE id = 'b9c2dc1a-b226-45ce-9dbf-dc3f077da866';

-- Add unique constraint: one squad per user
ALTER TABLE squad_members ADD CONSTRAINT unique_user_one_squad UNIQUE (user_id);