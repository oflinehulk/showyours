
-- Fix 1: Prevent squad member role self-escalation
-- Drop and recreate the UPDATE policy with WITH CHECK
DROP POLICY IF EXISTS "Leaders can update squad members" ON public.squad_members;

CREATE POLICY "Leaders can update squad members"
ON public.squad_members
FOR UPDATE
USING (
  (EXISTS (
    SELECT 1 FROM squad_members sm
    WHERE sm.squad_id = squad_members.squad_id
      AND sm.user_id = auth.uid()
      AND sm.role = ANY (ARRAY['leader'::squad_member_squad_role, 'co_leader'::squad_member_squad_role])
  ))
  OR
  (EXISTS (
    SELECT 1 FROM squads s
    WHERE s.id = squad_members.squad_id
      AND s.owner_id = auth.uid()
  ))
)
WITH CHECK (
  -- If the role is being set to leader or co_leader, only the squad owner can do that
  (
    role NOT IN ('leader'::squad_member_squad_role, 'co_leader'::squad_member_squad_role)
  )
  OR
  (
    EXISTS (
      SELECT 1 FROM squads s
      WHERE s.id = squad_members.squad_id
        AND s.owner_id = auth.uid()
    )
  )
);

-- Fix 2: Restrict squad_availability SELECT to authenticated users
DROP POLICY IF EXISTS "Squad availability is viewable by everyone" ON public.squad_availability;

CREATE POLICY "Authenticated users can view squad availability"
ON public.squad_availability
FOR SELECT
TO authenticated
USING (true);
