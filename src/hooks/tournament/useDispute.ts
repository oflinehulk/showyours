import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TournamentMatch, MatchStatus } from '@/lib/tournament-types';
import { tournamentKeys } from './queryKeys';
import { revertWinnerAdvancement, advanceWinnerToNextRound } from './matchAdvancementHelpers';

export function useRaiseDispute() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      reason,
      screenshotUrl,
      tournamentId,
    }: {
      matchId: string;
      reason: string;
      screenshotUrl?: string;
      tournamentId: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tournament_matches')
        .update({
          status: 'disputed' as MatchStatus,
          dispute_reason: reason,
          dispute_screenshot: screenshotUrl || null,
          dispute_raised_by: user.id,
        })
        .eq('id', matchId);

      if (error) throw new Error(error.message);
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      queryClient.invalidateQueries({ queryKey: ['stage-matches'] });
    },
  });
}

export function useResolveDispute() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      resolutionNotes,
      newWinnerId,
      newSquadAScore,
      newSquadBScore,
      tournamentId,
    }: {
      matchId: string;
      resolutionNotes: string;
      newWinnerId?: string;
      newSquadAScore?: number;
      newSquadBScore?: number;
      tournamentId: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Fetch the original match to get old winner_id before updating
      const { data: oldMatch, error: fetchError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      const updates: Record<string, unknown> = {
        status: 'completed' as MatchStatus,
        dispute_resolved_by: user.id,
        dispute_resolution_notes: resolutionNotes,
      };

      if (newWinnerId !== undefined) updates.winner_id = newWinnerId;
      if (newSquadAScore !== undefined) updates.squad_a_score = newSquadAScore;
      if (newSquadBScore !== undefined) updates.squad_b_score = newSquadBScore;

      const { data, error } = await supabase
        .from('tournament_matches')
        .update(updates as never)
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // If winner changed, revert old advancement then advance new winner
      if (newWinnerId && oldMatch.winner_id && newWinnerId !== oldMatch.winner_id) {
        await revertWinnerAdvancement(tournamentId, oldMatch as unknown as TournamentMatch);
        await advanceWinnerToNextRound(tournamentId, data as unknown as TournamentMatch);
      } else if (newWinnerId) {
        await advanceWinnerToNextRound(tournamentId, data as unknown as TournamentMatch);
      }

      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      queryClient.invalidateQueries({ queryKey: ['stage-matches'] });
    },
  });
}
