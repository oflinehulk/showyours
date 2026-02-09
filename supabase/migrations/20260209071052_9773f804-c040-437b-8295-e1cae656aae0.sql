-- Create squad applications table for players to apply to squads
CREATE TABLE public.squad_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(squad_id, applicant_id)
);

-- Enable RLS
ALTER TABLE public.squad_applications ENABLE ROW LEVEL SECURITY;

-- Players can view their own applications
CREATE POLICY "Players can view their own applications"
ON public.squad_applications
FOR SELECT
USING (auth.uid() = user_id);

-- Squad leaders/owners can view applications to their squad
CREATE POLICY "Squad leaders can view applications"
ON public.squad_applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM squads s WHERE s.id = squad_applications.squad_id AND s.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM squad_members sm 
    WHERE sm.squad_id = squad_applications.squad_id 
    AND sm.user_id = auth.uid() 
    AND sm.role IN ('leader', 'co_leader')
  )
);

-- Players can create applications
CREATE POLICY "Players can apply to squads"
ON public.squad_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Players can withdraw their own applications
CREATE POLICY "Players can withdraw applications"
ON public.squad_applications
FOR DELETE
USING (auth.uid() = user_id AND status = 'pending');

-- Squad leaders can update application status
CREATE POLICY "Squad leaders can update applications"
ON public.squad_applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM squads s WHERE s.id = squad_applications.squad_id AND s.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM squad_members sm 
    WHERE sm.squad_id = squad_applications.squad_id 
    AND sm.user_id = auth.uid() 
    AND sm.role IN ('leader', 'co_leader')
  )
);

-- Squad leaders can delete/clear applications
CREATE POLICY "Squad leaders can delete applications"
ON public.squad_applications
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM squads s WHERE s.id = squad_applications.squad_id AND s.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM squad_members sm 
    WHERE sm.squad_id = squad_applications.squad_id 
    AND sm.user_id = auth.uid() 
    AND sm.role IN ('leader', 'co_leader')
  )
);

-- Create trigger for updating updated_at
CREATE TRIGGER update_squad_applications_updated_at
BEFORE UPDATE ON public.squad_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();