import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { tournamentKeys } from './queryKeys';

/**
 * Subscribe to realtime changes for a tournament's matches and registrations.
 * Automatically invalidates React Query caches when data changes.
 */
export function useTournamentRealtime(tournamentId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tournamentId) return;

    const channel = supabase
      .channel(`tournament-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_matches',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_registrations',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: tournamentKeys.registrations(tournamentId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, queryClient]);
}
