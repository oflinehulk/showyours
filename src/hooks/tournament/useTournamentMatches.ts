import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TournamentMatch, MatchStatus } from '@/lib/tournament-types';
import { advanceWinnerToNextRound } from './matchAdvancementHelpers';
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
        .limit(limit * 3); // Fetch extra to account for client-side filtering

      if (error) throw new Error(error.message);
      type MatchWithTournament = TournamentMatch & { tournament?: { id: string; name: string; status: string } | null };
      return ((data as MatchWithTournament[]) || [])
        .filter(
          (m) => m.tournament && ['bracket_generated', 'ongoing'].includes(m.tournament.status)
        )
        .slice(0, limit) as (TournamentMatch & { tournament: { id: string; name: string; status: string } })[];
    },
  });
}

// Update match result (atomic: completes match + advances winner + drops loser)
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
      const { data, error } = await supabase.rpc('rpc_advance_match_winner', {
        p_match_id: matchId,
        p_winner_id: winnerId,
        p_squad_a_score: squadAScore,
        p_squad_b_score: squadBScore,
        p_screenshot_url: screenshotUrl ?? undefined,
      });

      if (error) throw new Error(error.message);
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
        .select('squad_a_id, squad_b_id, updated_at')
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
        .eq('updated_at', match.updated_at)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('This match was modified by someone else. Please refresh and try again.');
        }
        throw new Error(error.message);
      }

      await advanceWinnerToNextRound(tournamentId, data as unknown as TournamentMatch);

      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      queryClient.invalidateQueries({ queryKey: ['stage-matches'] });
    },
  });
}

// Reset a completed match back to pending (atomic cascade via RPC)
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
      const { error } = await supabase.rpc('rpc_cascade_reset_match', {
        p_match_id: matchId,
        p_tournament_id: tournamentId,
      });

      if (error) throw new Error(error.message);
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      queryClient.invalidateQueries({ queryKey: ['stage-matches'] });
    },
  });
}

// Create a tiebreaker match between two tied teams in a group
export function useCreateTiebreakerMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tournamentId,
      stageId,
      groupId,
      squadAId,
      squadBId,
      bestOf = 1,
    }: {
      tournamentId: string;
      stageId: string;
      groupId: string;
      squadAId: string;
      squadBId: string;
      bestOf?: 1 | 3 | 5;
    }) => {
      // Get the max match_number across all tiebreakers in this stage to avoid collisions
      const { data: existing, error: fetchErr } = await supabase
        .from('tournament_matches')
        .select('match_number')
        .eq('tournament_id', tournamentId)
        .eq('stage_id', stageId)
        .eq('round', 99)
        .eq('bracket_type', 'winners')
        .order('match_number', { ascending: false })
        .limit(1);

      if (fetchErr) throw new Error(fetchErr.message);

      const nextMatchNumber = (existing?.[0]?.match_number ?? 0) + 1;

      const { error } = await supabase
        .from('tournament_matches')
        .insert({
          tournament_id: tournamentId,
          stage_id: stageId,
          group_id: groupId,
          round: 99, // Special round number for tiebreakers
          match_number: nextMatchNumber,
          squad_a_id: squadAId,
          squad_b_id: squadBId,
          best_of: bestOf,
          status: 'pending' as MatchStatus,
          bracket_type: 'winners',
          squad_a_score: 0,
          squad_b_score: 0,
        });

      if (error) throw new Error(error.message);
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      queryClient.invalidateQueries({ queryKey: ['stage-matches'] });
    },
  });
}

// Create all 3 mini round-robin tiebreaker matches at once for a 3-way tie
export function useCreateMiniRRTiebreaker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tournamentId,
      stageId,
      groupId,
      squadIds,
      bestOf = 1,
    }: {
      tournamentId: string;
      stageId: string;
      groupId: string;
      squadIds: [string, string, string]; // exactly 3 teams
      bestOf?: 1 | 3 | 5;
    }) => {
      // Get the max match_number across all tiebreakers in this stage to avoid collisions
      const { data: existing, error: fetchErr } = await supabase
        .from('tournament_matches')
        .select('match_number')
        .eq('tournament_id', tournamentId)
        .eq('stage_id', stageId)
        .eq('round', 99)
        .eq('bracket_type', 'winners')
        .order('match_number', { ascending: false })
        .limit(1);

      if (fetchErr) throw new Error(fetchErr.message);

      let nextMatchNumber = (existing?.[0]?.match_number ?? 0) + 1;

      // Generate all 3 pairings: A vs B, A vs C, B vs C
      const pairs: [string, string][] = [];
      for (let i = 0; i < squadIds.length; i++) {
        for (let j = i + 1; j < squadIds.length; j++) {
          pairs.push([squadIds[i], squadIds[j]]);
        }
      }

      const inserts = pairs.map((pair) => ({
        tournament_id: tournamentId,
        stage_id: stageId,
        group_id: groupId,
        round: 99,
        match_number: nextMatchNumber++,
        squad_a_id: pair[0],
        squad_b_id: pair[1],
        best_of: bestOf,
        status: 'pending' as MatchStatus,
        bracket_type: 'winners',
        squad_a_score: 0,
        squad_b_score: 0,
      }));

      const { error } = await supabase
        .from('tournament_matches')
        .insert(inserts);

      if (error) throw new Error(error.message);
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      queryClient.invalidateQueries({ queryKey: ['stage-matches'] });
    },
  });
}

// Delete a tiebreaker match (round 99 only)
export function useDeleteTiebreakerMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId, tournamentId }: { matchId: string; tournamentId: string }) => {
      const { error } = await supabase
        .from('tournament_matches')
        .delete()
        .eq('id', matchId)
        .eq('round', 99); // Safety: only delete tiebreaker matches

      if (error) throw new Error(error.message);
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      queryClient.invalidateQueries({ queryKey: ['stage-matches'] });
    },
  });
}
