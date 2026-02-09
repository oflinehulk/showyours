-- Update search_profiles to have a third mode for squad owners adding members
-- add_to_squad mode: shows all registered players except those already in the target squad
CREATE OR REPLACE FUNCTION public.search_profiles(
  search_term text,
  exclude_squad_id uuid DEFAULT NULL,
  for_tournament boolean DEFAULT false,
  add_to_squad boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  ign text,
  mlbb_id text,
  avatar_url text,
  rank text,
  main_role text,
  contacts jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  search_lower text := LOWER(TRIM(search_term));
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.ign,
    p.mlbb_id,
    p.avatar_url,
    p.rank,
    p.main_role,
    p.contacts
  FROM public.profiles p
  WHERE 
    -- Mode logic:
    -- add_to_squad = true: show all registered players (for squad owners adding teammates)
    -- for_tournament = true: show all registered players (for tournament searches)
    -- default: only show players looking for squad and not in any squad
    (
      add_to_squad = true 
      OR for_tournament = true 
      OR (p.looking_for_squad = true AND NOT EXISTS (
        SELECT 1 FROM public.squad_members sm WHERE sm.profile_id = p.id
      ))
    )
    -- Search by IGN, MLBB ID, or WhatsApp
    AND (
      LOWER(p.ign) ILIKE '%' || search_lower || '%'
      OR p.mlbb_id ILIKE '%' || search_term || '%'
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(p.contacts, '[]'::jsonb)) AS contact
        WHERE contact->>'type' = 'whatsapp' 
        AND contact->>'value' ILIKE '%' || search_term || '%'
      )
    )
    -- Always exclude players already in the specified squad
    AND (
      exclude_squad_id IS NULL 
      OR NOT EXISTS (
        SELECT 1 FROM public.squad_members sm 
        WHERE sm.profile_id = p.id 
        AND sm.squad_id = exclude_squad_id
      )
    )
  ORDER BY 
    CASE WHEN LOWER(p.ign) = search_lower THEN 0
         WHEN p.mlbb_id = search_term THEN 0
         ELSE 1 END,
    p.ign
  LIMIT 20;
END;
$$;