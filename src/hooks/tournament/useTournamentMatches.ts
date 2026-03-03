import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TournamentMatch, MatchStatus } from '@/lib/tournament-types';
import { advanceWinnerToNextRound, revertWinnerAdvancement } from './matchAdvancementHelpers';
import { tournamentKeys } from './queryKeys';

// Fetch matches for a tournament
export function useTournamentMatches(tournamentId: string | undefined) {
  return useQuery({
    queryKey: tournamentKeys.matches(tournamentId),
    queryFn: async () => {
      if (!tournamentId) return [];

      const { data, error } = await supabase
        .from('tournament_matches')
        .select(`
          *,
          squad_a:tournament_squads!tournament_matches_squad_a_id_fkey(*),
          squad_b:tournament_squads!tournament_matches_squad_b_id_fkey(*)
        `)
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) throw new Error(error.message);
      return data as TournamentMatch[];
    },
    enabled: !!tournamentId,
  });
}

// Fetch upcoming and live matches across all tournaments (for homepage)
export function useGlobalUpcomingMatches(limit = 10) {
  return useQuery({
    queryKey: tournamentKeys.globalUpcoming(limit),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournament_matches')
        .select(`
          *,
          squad_a:tournament_squads!tournament_matches_squad_a_id_fkey(id, name, logo_url),
          squad_b:tournament_squads!tournament_matches_squad_b_id_fkey(id, name, logo_url),
          tournament:tournaments!tournament_matches_tournament_id_fkey(id, name, status)
        `)
        .in('status', ['pending', 'ongoing'])
        .not('scheduled_time', 'is', null)
        .order('scheduled_time', { ascending: true })
        .limit(limit);

      if (error) throw new Error(error.message);
      type MatchWithTournament = TournamentMatch & { tournament?: { id: string; name: string; status: string } | null };
      return (data as MatchWithTournament[] || []).filter(
        (m) => m.tournament && ['bracket_generated', 'ongoing'].includes(m.tournament.status)
      ) as (TournamentMatch & { tournament: { id: string; name: string; status: string } })[];
    },
  });
}

// Update match result
export function useUpdateMatchResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      winnerId,
      squadAScore,
      squadBScore,
      screenshotUrl,
      tournamentId,
    }: {
      matchId: string;
      winnerId: string;
      squadAScore: number;
      squadBScore: number;
      screenshotUrl?: string;
      tournamentId: string;
    }) => {
      const { data, error } = await supabase
        .from('tournament_matches')
        .update({
          winner_id: winnerId,
          squad_a_score: squadAScore,
          squad_b_score: squadBScore,
          result_screenshot: screenshotUrl,
          status: 'completed' as MatchStatus,
          completed_at: new Date().toISOString(),
        })
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      await advanceWinnerToNextRound(tournamentId, data as unknown as TournamentMatch);

      return { data, tournamentId };
    },
    onSuccess: ({ tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      queryClient.invalidateQueries({ queryKey: ['stage-matches'] });
    },
  });
}

// Update match check-in
export function useUpdateMatchCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      field,
      value,
      tournamentId,
    }: {
      matchId: string;
      field: 'squad_a_checked_in' | 'squad_b_checked_in';
      value: boolean;
      tournamentId: string;
    }) => {
      const { error } = await supabase
        .from('tournament_matches')
        .update({ [field]: value })
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

// Forfeit match
export function useForfeitMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      winnerId,
      bestOf,
      tournamentId,
    }: {
      matchId: string;
      winnerId: string;
      bestOf: 1 | 3 | 5;
      tournamentId: string;
    }) => {
      const winsNeeded = Math.ceil(bestOf / 2);

      const { data: match, error: fetchErr } = await supabase
        .from('tournament_matches')
        .select('squad_a_id, squad_b_id')
        .eq('id', matchId)
        .single();
      if (fetchErr) throw new Error(fetchErr.message);

      const { data, error } = await supabase
        .from('tournament_matches')
        .update({
          winner_id: winnerId,
          status: 'completed' as MatchStatus,
          is_forfeit: true,
          squad_a_score: winnerId === match.squad_a_id ? winsNeeded : 0,
          squad_b_score: winnerId === match.squad_b_id ? winsNeeded : 0,
          completed_at: new Date().toISOString(),
        })
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      await advanceWinnerToNextRound(tournamentId, data as unknown as TournamentMatch);

      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      queryClient.invalidateQueries({ queryKey: ['stage-matches'] });
    },
  });
}

// Reset a completed match back to pending (host only)
export function useResetMatchResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      tournamentId,
    }: {
      matchId: string;
      tournamentId: string;
    }) => {
      // Fetch the current match to revert advancement
      const { data: match, error: fetchErr } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('id', matchId)
        .single();
      if (fetchErr) throw new Error(fetchErr.message);

      if (match.status !== 'completed') {
        throw new Error('Only completed matches can be reset');
      }

      // Revert winner advancement in bracket
      await revertWinnerAdvancement(tournamentId, match as unknown as TournamentMatch);

      // Reset the match: clear scores & status, keep screenshots
      const { error } = await supabase
        .from('tournament_matches')
        .update({
          status: 'pending' as MatchStatus,
          winner_id: null,
          squad_a_score: 0,
          squad_b_score: 0,
          completed_at: null,
          is_forfeit: false,
          squad_a_checked_in: false,
          squad_b_checked_in: false,
          toss_winner: null,
          blue_side_team: null,
          red_side_team: null,
          toss_completed_at: null,
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
