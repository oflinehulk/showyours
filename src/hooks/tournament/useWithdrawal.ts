import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TournamentMatch } from '@/lib/tournament-types';
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
      // Atomic forfeit + withdrawal via RPC
      const { error } = await supabase.rpc('rpc_withdraw_squad_with_forfeits', {
        p_registration_id: registrationId,
        p_squad_id: squadId,
        p_tournament_id: tournamentId,
      });

      if (error) throw new Error(error.message);

      // Re-fetch forfeited matches with fresh data after RPC
      const { data: forfeitedMatches, error: matchError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('is_forfeit', true)
        .eq('status', 'completed')
        .or(`squad_a_id.eq.${squadId},squad_b_id.eq.${squadId}`);

      if (matchError) throw new Error(matchError.message);

      // Advance winners using fresh data
      for (const match of forfeitedMatches || []) {
        await advanceWinnerToNextRound(tournamentId, match as unknown as TournamentMatch);
      }

      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.registrations(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });
}
