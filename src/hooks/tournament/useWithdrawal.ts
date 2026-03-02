import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TournamentMatch, MatchStatus } from '@/lib/tournament-types';
import { tournamentKeys } from './queryKeys';
import { advanceWinnerToNextRound } from './matchAdvancementHelpers';

export function useWithdrawSquad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      registrationId,
      squadId,
      tournamentId,
    }: {
      registrationId: string;
      squadId: string;
      tournamentId: string;
    }) => {
      // Get all pending/ongoing matches for this squad
      const { data: matches, error: matchError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .in('status', ['pending', 'ongoing'])
        .or(`squad_a_id.eq.${squadId},squad_b_id.eq.${squadId}`);

      if (matchError) throw new Error(matchError.message);

      // Forfeit each match first — if any fails, registration stays approved
      for (const match of matches || []) {
        const opponentId = match.squad_a_id === squadId ? match.squad_b_id : match.squad_a_id;
        if (!opponentId) continue; // Skip if no opponent (TBD match)

        const winsNeeded = Math.ceil((match.best_of || 1) / 2);
        const { data: updated, error: forfeitError } = await supabase
          .from('tournament_matches')
          .update({
            winner_id: opponentId,
            status: 'completed' as MatchStatus,
            is_forfeit: true,
            squad_a_score: opponentId === match.squad_a_id ? winsNeeded : 0,
            squad_b_score: opponentId === match.squad_b_id ? winsNeeded : 0,
            completed_at: new Date().toISOString(),
          })
          .eq('id', match.id)
          .select()
          .single();

        if (forfeitError) throw new Error(forfeitError.message);

        // Advance opponent
        await advanceWinnerToNextRound(tournamentId, updated as unknown as TournamentMatch);
      }

      // Set registration to withdrawn only after all forfeits succeeded
      const { error: regError } = await supabase
        .from('tournament_registrations')
        .update({ status: 'withdrawn' })
        .eq('id', registrationId);

      if (regError) throw new Error(regError.message);

      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.registrations(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });
}
