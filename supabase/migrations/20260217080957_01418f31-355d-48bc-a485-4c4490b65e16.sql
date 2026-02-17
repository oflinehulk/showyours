
CREATE OR REPLACE FUNCTION public.search_profiles(search_term text, exclude_squad_id uuid DEFAULT NULL::uuid, for_tournament boolean DEFAULT false, add_to_squad boolean DEFAULT false)
 RETURNS TABLE(id uuid, user_id uuid, ign text, mlbb_id text, avatar_url text, rank text, main_role text, contacts jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  sanitized text := REPLACE(REPLACE(REPLACE(LEFT(TRIM(search_term), 100), '\', '\\'), '%', '\%'), '_', '\_');
  search_lower text := LOWER(sanitized);
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
    CASE 
      WHEN p.contacts IS NULL THEN '[]'::jsonb
      WHEN jsonb_typeof(p.contacts) = 'array' THEN p.contacts
      ELSE p.contacts::text::jsonb
    END as contacts
  FROM public.profiles p
  WHERE 
    (
      add_to_squad = true 
      OR for_tournament = true 
      OR (p.looking_for_squad = true AND NOT EXISTS (
        SELECT 1 FROM public.squad_members sm WHERE sm.profile_id = p.id
      ))
    )
    AND (
      LOWER(p.ign) ILIKE '%' || search_lower || '%' ESCAPE '\'
      OR p.mlbb_id ILIKE '%' || sanitized || '%' ESCAPE '\'
      OR p.contacts::text ILIKE '%' || sanitized || '%' ESCAPE '\'
    )
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
         WHEN p.mlbb_id = sanitized THEN 0
         ELSE 1 END,
    p.ign
  LIMIT 20;
END;
$function$;
