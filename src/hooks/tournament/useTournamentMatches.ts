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
      // Get the max match_number for this group to assign next number
      const { data: existing, error: fetchErr } = await supabase
        .from('tournament_matches')
        .select('match_number')
        .eq('tournament_id', tournamentId)
        .eq('group_id', groupId)
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
      // Get the max match_number for this group
      const { data: existing, error: fetchErr } = await supabase
        .from('tournament_matches')
        .select('match_number')
        .eq('tournament_id', tournamentId)
        .eq('group_id', groupId)
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
