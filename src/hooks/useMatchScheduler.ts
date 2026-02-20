import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Update a single match's scheduled_time
export function useUpdateMatchSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      scheduledTime,
      tournamentId,
    }: {
      matchId: string;
      scheduledTime: string | null;
      tournamentId: string;
    }) => {
      const { error } = await supabase
        .from('tournament_matches')
        .update({ scheduled_time: scheduledTime })
        .eq('id', matchId);

      if (error) throw error;
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] });
    },
  });
}

// Bulk update multiple matches' scheduled times
export function useBulkUpdateMatchSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      updates,
      tournamentId,
    }: {
      updates: { matchId: string; scheduledTime: string }[];
      tournamentId: string;
    }) => {
      // Update each match sequentially to avoid conflicts
      for (const { matchId, scheduledTime } of updates) {
        const { error } = await supabase
          .from('tournament_matches')
          .update({ scheduled_time: scheduledTime })
          .eq('id', matchId);

        if (error) throw error;
      }
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] });
    },
  });
}
