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
      // Fetch matches that will be forfeited so we can advance winners client-side
      const { data: matches, error: matchError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .in('status', ['pending', 'ongoing'])
        .or(`squad_a_id.eq.${squadId},squad_b_id.eq.${squadId}`);

      if (matchError) throw new Error(matchError.message);

      // Atomic forfeit + withdrawal via RPC
      const { error } = await supabase.rpc('rpc_withdraw_squad_with_forfeits', {
        p_registration_id: registrationId,
        p_squad_id: squadId,
        p_tournament_id: tournamentId,
      });

      if (error) throw new Error(error.message);

      // Advance winners client-side (DB lacks next_match_id columns)
      for (const match of matches || []) {
        const opponentId = match.squad_a_id === squadId ? match.squad_b_id : match.squad_a_id;
        if (!opponentId) continue;

        const winsNeeded = Math.ceil((match.best_of || 1) / 2);
        const completed: TournamentMatch = {
          ...match,
          winner_id: opponentId,
          status: 'completed',
          is_forfeit: true,
          squad_a_score: opponentId === match.squad_a_id ? winsNeeded : 0,
          squad_b_score: opponentId === match.squad_b_id ? winsNeeded : 0,
          completed_at: new Date().toISOString(),
        } as unknown as TournamentMatch;

        await advanceWinnerToNextRound(tournamentId, completed);
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
