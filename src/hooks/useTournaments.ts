import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  Tournament, 
  TournamentWithDetails, 
  TournamentSquad, 
  TournamentSquadMember,
  TournamentRegistration,
  TournamentMatch,
  TournamentStatus,
  TournamentFormat,
  MatchStatus,
  RosterChange
} from '@/lib/tournament-types';

// Fetch all tournaments with registration counts
export function useTournaments() {
  return useQuery({
    queryKey: ['tournaments'],
    queryFn: async () => {
      // Fetch tournaments
      const { data: tournaments, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('date_time', { ascending: true });

      if (error) throw error;

      // Fetch registration counts for all tournaments
      const { data: registrations } = await supabase
        .from('tournament_registrations')
        .select('tournament_id');

      // Count registrations per tournament
      const counts: Record<string, number> = {};
      registrations?.forEach((r) => {
        counts[r.tournament_id] = (counts[r.tournament_id] || 0) + 1;
      });

      // Attach counts to tournaments
      return (tournaments || []).map((t) => ({
        ...t,
        registrations_count: counts[t.id] || 0,
      })) as TournamentWithDetails[];
    },
  });
}

// Fetch a single tournament with details
export function useTournament(id: string | undefined) {
  return useQuery({
    queryKey: ['tournament', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Tournament | null;
    },
    enabled: !!id,
  });
}

// Fetch tournaments hosted by the current user
export function useMyTournaments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-tournaments', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Tournament[];
    },
    enabled: !!user,
  });
}

// Create tournament
export function useCreateTournament() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tournament: Omit<Tournament, 'id' | 'host_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          ...tournament,
          host_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Tournament;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['my-tournaments'] });
    },
  });
}

// Update tournament
export function useUpdateTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tournament> & { id: string }) => {
      const { data, error } = await supabase
        .from('tournaments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Tournament;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['tournament', data.id] });
      queryClient.invalidateQueries({ queryKey: ['my-tournaments'] });
    },
  });
}

// Delete tournament
export function useDeleteTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['my-tournaments'] });
    },
  });
}

// ========== Tournament Squads ==========

// Fetch tournament squads created by the current user
export function useMyTournamentSquads() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-tournament-squads', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('tournament_squads')
        .select('*')
        .eq('leader_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TournamentSquad[];
    },
    enabled: !!user,
  });
}

// Create tournament squad with members
export function useCreateTournamentSquad() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      squad,
      members,
    }: {
      squad: Omit<TournamentSquad, 'id' | 'leader_id' | 'created_at' | 'updated_at'>;
      members: Omit<TournamentSquadMember, 'id' | 'tournament_squad_id' | 'created_at'>[];
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Create squad
      const { data: squadData, error: squadError } = await supabase
        .from('tournament_squads')
        .insert({
          ...squad,
          leader_id: user.id,
        })
        .select()
        .single();

      if (squadError) throw squadError;

      // Create members
      if (members.length > 0) {
        const { error: membersError } = await supabase
          .from('tournament_squad_members')
          .insert(
            members.map((m) => ({
              ...m,
              tournament_squad_id: squadData.id,
            }))
          );

        if (membersError) throw membersError;
      }

      return squadData as TournamentSquad;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tournament-squads'] });
    },
  });
}

// Fetch squad members
export function useTournamentSquadMembers(squadId: string | undefined) {
  return useQuery({
    queryKey: ['tournament-squad-members', squadId],
    queryFn: async () => {
      if (!squadId) return [];

      const { data, error } = await supabase
        .from('tournament_squad_members')
        .select('*')
        .eq('tournament_squad_id', squadId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as TournamentSquadMember[];
    },
    enabled: !!squadId,
  });
}

// ========== Tournament Registrations ==========

// Fetch registrations for a tournament
export function useTournamentRegistrations(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['tournament-registrations', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];

      const { data, error } = await supabase
        .from('tournament_registrations')
        .select(`
          *,
          tournament_squads (*)
        `)
        .eq('tournament_id', tournamentId)
        .order('registered_at', { ascending: true });

      if (error) throw error;
      return data as (TournamentRegistration & { tournament_squads: TournamentSquad })[];
    },
    enabled: !!tournamentId,
  });
}

// Register squad for tournament
export function useRegisterForTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tournamentId,
      squadId,
    }: {
      tournamentId: string;
      squadId: string;
    }) => {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .insert({
          tournament_id: tournamentId,
          tournament_squad_id: squadId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TournamentRegistration;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-registrations', variables.tournamentId] });
    },
  });
}

// Update registration status (host only)
export function useUpdateRegistrationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      registrationId,
      status,
      tournamentId,
    }: {
      registrationId: string;
      status: 'approved' | 'rejected';
      tournamentId: string;
    }) => {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .update({ status })
        .eq('id', registrationId)
        .select()
        .single();

      if (error) throw error;
      return { data, tournamentId };
    },
    onSuccess: ({ tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-registrations', tournamentId] });
    },
  });
}

// Withdraw from tournament
export function useWithdrawFromTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      registrationId,
      tournamentId,
    }: {
      registrationId: string;
      tournamentId: string;
    }) => {
      const { error } = await supabase
        .from('tournament_registrations')
        .delete()
        .eq('id', registrationId);

      if (error) throw error;
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-registrations', tournamentId] });
    },
  });
}

// ========== Tournament Matches ==========

// Fetch matches for a tournament
export function useTournamentMatches(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['tournament-matches', tournamentId],
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

      if (error) throw error;
      return data as TournamentMatch[];
    },
    enabled: !!tournamentId,
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

      if (error) throw error;
      return { data, tournamentId };
    },
    onSuccess: ({ tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] });
    },
  });
}

// ========== Bracket Generation ==========

export function useGenerateBracket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tournamentId,
      format,
    }: {
      tournamentId: string;
      format: TournamentFormat;
    }) => {
      // Get approved registrations
      const { data: registrations, error: regError } = await supabase
        .from('tournament_registrations')
        .select('tournament_squad_id')
        .eq('tournament_id', tournamentId)
        .eq('status', 'approved');

      if (regError) throw regError;

      const squadIds = registrations.map((r) => r.tournament_squad_id);
      
      // Shuffle squads for random seeding
      const shuffled = [...squadIds].sort(() => Math.random() - 0.5);

      // Generate matches based on format
      let matches: Omit<TournamentMatch, 'id' | 'created_at' | 'updated_at' | 'squad_a' | 'squad_b'>[] = [];

      if (format === 'single_elimination') {
        matches = generateSingleEliminationBracket(tournamentId, shuffled);
      } else if (format === 'double_elimination') {
        matches = generateDoubleEliminationBracket(tournamentId, shuffled);
      } else {
        matches = generateRoundRobinBracket(tournamentId, shuffled);
      }

      // Insert matches
      const { error: matchError } = await supabase
        .from('tournament_matches')
        .insert(matches);

      if (matchError) throw matchError;

      // Update tournament status and format
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({
          status: 'bracket_generated' as TournamentStatus,
          format,
        })
        .eq('id', tournamentId);

      if (updateError) throw updateError;

      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

// Helper: Generate single elimination bracket
function generateSingleEliminationBracket(
  tournamentId: string,
  squadIds: string[]
): Omit<TournamentMatch, 'id' | 'created_at' | 'updated_at' | 'squad_a' | 'squad_b'>[] {
  const matches: Omit<TournamentMatch, 'id' | 'created_at' | 'updated_at' | 'squad_a' | 'squad_b'>[] = [];
  const totalRounds = Math.ceil(Math.log2(squadIds.length));
  
  // Pad to power of 2
  const paddedLength = Math.pow(2, totalRounds);
  const padded = [...squadIds];
  while (padded.length < paddedLength) {
    padded.push(null as any);
  }

  // First round matches
  let matchNumber = 1;
  for (let i = 0; i < padded.length; i += 2) {
    const bestOf = totalRounds === 1 ? 5 : (totalRounds - Math.ceil(Math.log2(matchNumber + 1)) <= 1 ? 3 : 1);
    
    matches.push({
      tournament_id: tournamentId,
      round: 1,
      match_number: matchNumber,
      bracket_type: 'winners',
      squad_a_id: padded[i] || null,
      squad_b_id: padded[i + 1] || null,
      winner_id: null,
      status: 'pending',
      best_of: (padded[i] && !padded[i + 1]) ? 1 : 1, // Auto-win byes
      squad_a_score: 0,
      squad_b_score: 0,
      result_screenshot: null,
      scheduled_time: null,
      completed_at: null,
    });
    matchNumber++;
  }

  // Subsequent rounds (empty matches to be filled as winners advance)
  let matchesInRound = paddedLength / 4;
  for (let round = 2; round <= totalRounds; round++) {
    const isFinal = round === totalRounds;
    const isSemiFinal = round === totalRounds - 1;
    
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        tournament_id: tournamentId,
        round,
        match_number: i + 1,
        bracket_type: isFinal ? 'finals' : 'winners',
        squad_a_id: null,
        squad_b_id: null,
        winner_id: null,
        status: 'pending',
        best_of: isFinal ? 5 : (isSemiFinal ? 3 : 1),
        squad_a_score: 0,
        squad_b_score: 0,
        result_screenshot: null,
        scheduled_time: null,
        completed_at: null,
      });
    }
    matchesInRound = matchesInRound / 2;
  }

  return matches;
}

// Helper: Generate double elimination bracket
function generateDoubleEliminationBracket(
  tournamentId: string,
  squadIds: string[]
): Omit<TournamentMatch, 'id' | 'created_at' | 'updated_at' | 'squad_a' | 'squad_b'>[] {
  // Start with single elimination for winners bracket
  const winnersBracket = generateSingleEliminationBracket(tournamentId, squadIds);
  
  // Add losers bracket matches (simplified - proper double elim is complex)
  const totalRounds = Math.ceil(Math.log2(squadIds.length));
  const loserMatches: Omit<TournamentMatch, 'id' | 'created_at' | 'updated_at' | 'squad_a' | 'squad_b'>[] = [];
  
  let matchNumber = 1;
  for (let round = 1; round < totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round - 1);
    for (let i = 0; i < matchesInRound; i++) {
      loserMatches.push({
        tournament_id: tournamentId,
        round,
        match_number: matchNumber,
        bracket_type: 'losers',
        squad_a_id: null,
        squad_b_id: null,
        winner_id: null,
        status: 'pending',
        best_of: 1,
        squad_a_score: 0,
        squad_b_score: 0,
        result_screenshot: null,
        scheduled_time: null,
        completed_at: null,
      });
      matchNumber++;
    }
  }

  // Grand finals
  loserMatches.push({
    tournament_id: tournamentId,
    round: totalRounds,
    match_number: 1,
    bracket_type: 'finals',
    squad_a_id: null,
    squad_b_id: null,
    winner_id: null,
    status: 'pending',
    best_of: 5,
    squad_a_score: 0,
    squad_b_score: 0,
    result_screenshot: null,
    scheduled_time: null,
    completed_at: null,
  });

  return [...winnersBracket, ...loserMatches];
}

// Helper: Generate round robin bracket
function generateRoundRobinBracket(
  tournamentId: string,
  squadIds: string[]
): Omit<TournamentMatch, 'id' | 'created_at' | 'updated_at' | 'squad_a' | 'squad_b'>[] {
  const matches: Omit<TournamentMatch, 'id' | 'created_at' | 'updated_at' | 'squad_a' | 'squad_b'>[] = [];
  
  let matchNumber = 1;
  for (let i = 0; i < squadIds.length; i++) {
    for (let j = i + 1; j < squadIds.length; j++) {
      matches.push({
        tournament_id: tournamentId,
        round: 1, // All matches in "round 1" for round robin
        match_number: matchNumber,
        bracket_type: 'winners',
        squad_a_id: squadIds[i],
        squad_b_id: squadIds[j],
        winner_id: null,
        status: 'pending',
        best_of: 1,
        squad_a_score: 0,
        squad_b_score: 0,
        result_screenshot: null,
        scheduled_time: null,
        completed_at: null,
      });
      matchNumber++;
    }
  }

  return matches;
}

// ========== Roster Changes ==========

export function useRosterChanges(squadId: string | undefined, tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['roster-changes', squadId, tournamentId],
    queryFn: async () => {
      if (!squadId || !tournamentId) return [];

      const { data, error } = await supabase
        .from('roster_changes')
        .select('*')
        .eq('tournament_squad_id', squadId)
        .eq('tournament_id', tournamentId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return data as RosterChange[];
    },
    enabled: !!squadId && !!tournamentId,
  });
}

export function useMakeRosterChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      squadId,
      tournamentId,
      playerOutIgn,
      playerInIgn,
      playerInMlbbId,
      reason,
    }: {
      squadId: string;
      tournamentId: string;
      playerOutIgn: string;
      playerInIgn: string;
      playerInMlbbId: string;
      reason?: string;
    }) => {
      // Check if max approved changes reached (2 max)
      const { data: existingChanges, error: checkError } = await supabase
        .from('roster_changes')
        .select('id, status')
        .eq('tournament_squad_id', squadId)
        .eq('tournament_id', tournamentId)
        .in('status', ['approved', 'pending']);

      if (checkError) throw checkError;
      
      const approvedCount = existingChanges.filter(c => c.status === 'approved').length;
      if (approvedCount >= 2) {
        throw new Error('Maximum roster changes (2) reached for this tournament');
      }

      const { data, error } = await supabase
        .from('roster_changes')
        .insert({
          tournament_squad_id: squadId,
          tournament_id: tournamentId,
          player_out_ign: playerOutIgn,
          player_in_ign: playerInIgn,
          player_in_mlbb_id: playerInMlbbId,
          reason: reason || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roster-changes', variables.squadId, variables.tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-roster-changes', variables.tournamentId] });
    },
  });
}

// Fetch all roster changes for a tournament (for hosts)
export function useTournamentRosterChanges(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['tournament-roster-changes', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];

      const { data, error } = await supabase
        .from('roster_changes')
        .select(`
          *,
          tournament_squads (id, name, logo_url)
        `)
        .eq('tournament_id', tournamentId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return data as (RosterChange & { tournament_squads: { id: string; name: string; logo_url: string | null } })[];
    },
    enabled: !!tournamentId,
  });
}

// Host approves or rejects roster change
export function useUpdateRosterChangeStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      changeId,
      status,
      tournamentId,
    }: {
      changeId: string;
      status: 'approved' | 'rejected';
      tournamentId: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('roster_changes')
        .update({
          status,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', changeId)
        .select()
        .single();

      if (error) throw error;
      return { data, tournamentId };
    },
    onSuccess: ({ tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-roster-changes', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['roster-changes'] });
    },
  });
}
