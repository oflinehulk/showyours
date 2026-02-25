CREATE POLICY "Hosts can delete matches"
ON public.tournament_matches FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = tournament_matches.tournament_id AND host_id = auth.uid()
  )
);