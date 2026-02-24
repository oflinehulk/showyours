-- Allow admins to update any squad member's role
CREATE POLICY "Admins can update any squad member"
ON public.squad_members
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update any squad's owner_id (for leadership transfer)
CREATE POLICY "Admins can update any squad"
ON public.squads
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));
