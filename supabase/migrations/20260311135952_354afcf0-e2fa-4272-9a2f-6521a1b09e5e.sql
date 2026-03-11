
UPDATE tournament_stages
SET advance_to_lower_per_group = 2
WHERE tournament_id = (SELECT id FROM tournaments WHERE name ILIKE '%levi%' LIMIT 1)
  AND stage_number = 1;
