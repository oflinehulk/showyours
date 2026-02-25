-- Security definer function to let admins fetch user emails
CREATE OR REPLACE FUNCTION public.admin_get_user_emails()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT u.id AS user_id, u.email::text
  FROM auth.users u
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
$$;