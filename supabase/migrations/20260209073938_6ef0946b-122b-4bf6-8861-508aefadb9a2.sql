-- Fix search_profiles function to:
-- 1. Only search players with looking_for_squad = true
-- 2. Add WhatsApp contact search
-- 3. Exclude players already in any squad (not just the specified one)
CREATE OR REPLACE FUNCTION public.search_profiles(
  search_term text,
  exclude_squad_id uuid DEFAULT NULL
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
    -- Must be looking for squad
    p.looking_for_squad = true
    -- Search by IGN (case insensitive)
    AND (
      LOWER(p.ign) ILIKE '%' || search_lower || '%'
      -- Search by MLBB ID
      OR p.mlbb_id ILIKE '%' || search_term || '%'
      -- Search by WhatsApp number in contacts JSON
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(p.contacts, '[]'::jsonb)) AS contact
        WHERE contact->>'type' = 'whatsapp' 
        AND contact->>'value' ILIKE '%' || search_term || '%'
      )
    )
    -- Exclude players already in the specified squad
    AND (
      exclude_squad_id IS NULL 
      OR NOT EXISTS (
        SELECT 1 FROM public.squad_members sm 
        WHERE sm.profile_id = p.id 
        AND sm.squad_id = exclude_squad_id
      )
    )
    -- Exclude players already in any squad
    AND NOT EXISTS (
      SELECT 1 FROM public.squad_members sm 
      WHERE sm.profile_id = p.id
    )
  ORDER BY 
    -- Prioritize exact matches
    CASE WHEN LOWER(p.ign) = search_lower THEN 0
         WHEN p.mlbb_id = search_term THEN 0
         ELSE 1 END,
    p.ign
  LIMIT 20;
END;
$$;