import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  generateSingleEliminationBracket,
  generateDoubleEliminationBracket,
  generateRoundRobinBracket,
} from '@/lib/bracket-utils';
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

      // Fetch registration counts for all tournaments (only approved ones)
      const { data: registrations } = await supabase
        .from('tournament_registrations')
        .select('tournament_id')
        .eq('status', 'approved');

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

      const { prize_tiers, ...rest } = tournament;
      const insertPayload: Record<string, any> = { ...rest, host_id: user.id };
      if (prize_tiers !== undefined) {
        insertPayload.prize_tiers = JSON.parse(JSON.stringify(prize_tiers));
      }

      const { data, error } = await supabase
        .from('tournaments')
        .insert(insertPayload as any)
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
      const { prize_tiers, ...rest } = updates;
      const updatePayload: Record<string, any> = { ...rest };
      if (prize_tiers !== undefined) {
        updatePayload.prize_tiers = JSON.parse(JSON.stringify(prize_tiers));
      }
      const { data, error } = await supabase
        .from('tournaments')
        .update(updatePayload)
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
      // Clean up in FK order
      await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', id);

      await supabase
        .from('roster_changes')
        .delete()
        .eq('tournament_id', id);

      // Clean up tournament invitations
      await supabase
        .from('tournament_invitations')
        .delete()
        .eq('tournament_id', id);

      // Get tournament squad IDs for this tournament
      const { data: registrations } = await supabase
        .from('tournament_registrations')
        .select('tournament_squad_id')
        .eq('tournament_id', id);

      await supabase
        .from('tournament_registrations')
        .delete()
        .eq('tournament_id', id);

      // Clean up tournament squad members and squads
      if (registrations && registrations.length > 0) {
        const squadIds = registrations.map(r => r.tournament_squad_id);
        await supabase
          .from('tournament_squad_members')
          .delete()
          .in('tournament_squad_id', squadIds);

        await supabase
          .from('tournament_squads')
          .delete()
          .in('id', squadIds);
      }

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
        .eq('member_status', 'active')
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

// Register squad for tournament (atomic RPC)
export function useRegisterForTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tournamentId,
      squadName,
      existingSquadId,
      logoUrl,
      members,
    }: {
      tournamentId: string;
      squadName: string;
      existingSquadId: string;
      logoUrl: string | null;
      members: { ign: string; mlbb_id: string; role: string; position: number; user_id: string | null }[];
    }) => {
      const { data, error } = await supabase.rpc('rpc_register_for_tournament' as any, {
        p_tournament_id: tournamentId,
        p_squad_name: squadName,
        p_existing_squad_id: existingSquadId,
        p_logo_url: logoUrl ?? '',
        p_members: JSON.stringify(members),
      });

      if (error) throw error;
      return data as string; // returns squad id
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-registrations', variables.tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['my-tournament-squads'] });
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
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

// Delete registration (host only)
export function useDeleteRegistration() {
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
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
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

      // Advance winner to next round
      await advanceWinnerToNextRound(tournamentId, data);

      return { data, tournamentId };
    },
    onSuccess: ({ tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] });
    },
  });
}

// ========== Winner Advancement ==========

// Advance the winner of a completed match to the next round
async function advanceWinnerToNextRound(
  tournamentId: string,
  completedMatch: any
) {
  // Round robin doesn't have advancement
  if (completedMatch.bracket_type === 'winners' || completedMatch.bracket_type === 'losers') {
    // Find the next round match this winner feeds into
    const nextRound = completedMatch.round + 1;
    const isOddMatch = completedMatch.match_number % 2 === 1;
    const nextMatchNumber = Math.ceil(completedMatch.match_number / 2);
    const slot = isOddMatch ? 'squad_a_id' : 'squad_b_id';

    // Determine the bracket type for the next round
    // For single elimination: last winners round becomes 'finals'
    const { data: nextMatches } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('round', nextRound)
      .eq('match_number', nextMatchNumber)
      .in('bracket_type', completedMatch.bracket_type === 'winners' ? ['winners', 'finals'] : ['losers', 'finals']);

    if (nextMatches && nextMatches.length > 0) {
      const nextMatch = nextMatches[0];
      await supabase
        .from('tournament_matches')
        .update({ [slot]: completedMatch.winner_id })
        .eq('id', nextMatch.id);
    }
  }
}

// Auto-complete bye matches (one squad vs null) after bracket generation
async function autoCompleteByes(tournamentId: string) {
  const { data: byeMatches } = await supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('round', 1)
    .is('squad_b_id', null)
    .not('squad_a_id', 'is', null);

  if (!byeMatches) return;

  for (const match of byeMatches) {
    // Auto-complete the bye match
    await supabase
      .from('tournament_matches')
      .update({
        winner_id: match.squad_a_id,
        status: 'completed' as MatchStatus,
        squad_a_score: 1,
        squad_b_score: 0,
        completed_at: new Date().toISOString(),
      })
      .eq('id', match.id);

    // Advance the winner
    await advanceWinnerToNextRound(tournamentId, {
      ...match,
      winner_id: match.squad_a_id,
    });
  }

  // Also handle reverse byes (squad_a is null, squad_b is not)
  const { data: reverseByes } = await supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('round', 1)
    .is('squad_a_id', null)
    .not('squad_b_id', 'is', null);

  if (!reverseByes) return;

  for (const match of reverseByes) {
    await supabase
      .from('tournament_matches')
      .update({
        winner_id: match.squad_b_id,
        status: 'completed' as MatchStatus,
        squad_a_score: 0,
        squad_b_score: 1,
        completed_at: new Date().toISOString(),
      })
      .eq('id', match.id);

    await advanceWinnerToNextRound(tournamentId, {
      ...match,
      winner_id: match.squad_b_id,
    });
  }
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
      // Get approved registrations with seeds
      const { data: registrations, error: regError } = await (supabase
        .from('tournament_registrations')
        .select('tournament_squad_id, seed') as any)
        .eq('tournament_id', tournamentId)
        .eq('status', 'approved');

      if (regError) throw regError;

      // Sort by seed if seeds exist, otherwise random shuffle
      const hasSeeds = registrations.some((r: any) => r.seed != null);
      let orderedSquadIds: string[];

      if (hasSeeds) {
        const sorted = [...registrations].sort((a: any, b: any) => {
          if (a.seed == null && b.seed == null) return 0;
          if (a.seed == null) return 1;
          if (b.seed == null) return -1;
          return a.seed - b.seed;
        });
        orderedSquadIds = applyStandardSeeding(sorted.map((r: any) => r.tournament_squad_id));
      } else {
        orderedSquadIds = [...registrations.map((r: any) => r.tournament_squad_id)].sort(() => Math.random() - 0.5);
      }

      // Generate matches based on format
      let matches: Omit<TournamentMatch, 'id' | 'created_at' | 'updated_at' | 'squad_a' | 'squad_b' | 'squad_a_checked_in' | 'squad_b_checked_in' | 'is_forfeit' | 'dispute_reason' | 'dispute_screenshot' | 'dispute_raised_by' | 'dispute_resolved_by' | 'dispute_resolution_notes'>[] = [];

      if (format === 'single_elimination') {
        matches = generateSingleEliminationBracket(tournamentId, orderedSquadIds);
      } else if (format === 'double_elimination') {
        matches = generateDoubleEliminationBracket(tournamentId, orderedSquadIds);
      } else {
        matches = generateRoundRobinBracket(tournamentId, orderedSquadIds);
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

      // Auto-complete bye matches for elimination formats
      if (format !== 'round_robin') {
        await autoCompleteByes(tournamentId);
      }

      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
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
      queryClient.invalidateQueries({ queryKey: ['tournament-registrations', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-squad-members'] });
    },
  });
}

// ========== Seeding ==========

// Standard bracket seeding placement (1v16, 8v9, 4v13, 5v12, etc.)
function applyStandardSeeding(seededIds: string[]): string[] {
  const n = seededIds.length;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));

  // Build standard seed positions for a bracket of this size
  // Position 0 plays position bracketSize-1, etc.
  const positions: number[] = new Array(bracketSize).fill(-1);
  positions[0] = 0; // Seed 1 goes to position 0

  // Recursively fill bracket positions
  function fillBracket(slots: number[], round: number): number[] {
    if (slots.length === 1) return slots;
    const nextRound: number[] = [];
    for (let i = 0; i < slots.length; i += 2) {
      nextRound.push(slots[i]);
    }
    const filled = fillBracket(nextRound, round + 1);
    const result: number[] = [];
    for (const seed of filled) {
      result.push(seed);
      result.push(round - seed);
    }
    return result;
  }

  // Generate standard seeding order
  const seedOrder = generateSeedOrder(bracketSize);
  const result: string[] = [];
  for (const seedIndex of seedOrder) {
    result.push(seedIndex < n ? seededIds[seedIndex] : '');
  }
  return result.filter(Boolean);
}

// Generate standard tournament seed order for bracket placement
function generateSeedOrder(size: number): number[] {
  if (size === 1) return [0];
  if (size === 2) return [0, 1];

  const half = generateSeedOrder(size / 2);
  const result: number[] = [];
  for (const seed of half) {
    result.push(seed);
    result.push(size - 1 - seed);
  }
  return result;
}

export function useUpdateRegistrationSeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      registrationId,
      seed,
      tournamentId,
    }: {
      registrationId: string;
      seed: number | null;
      tournamentId: string;
    }) => {
      const { error } = await supabase
        .from('tournament_registrations')
        .update({ seed } as any)
        .eq('id', registrationId);

      if (error) throw error;
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-registrations', tournamentId] });
    },
  });
}

export function useAutoSeedByRegistrationOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tournamentId: string) => {
      const { data: registrations, error: fetchError } = await supabase
        .from('tournament_registrations')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('status', 'approved')
        .order('registered_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Update each registration with sequential seed
      for (let i = 0; i < registrations.length; i++) {
        const { error } = await supabase
          .from('tournament_registrations')
          .update({ seed: i + 1 } as any)
          .eq('id', registrations[i].id);
        if (error) throw error;
      }

      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-registrations', tournamentId] });
    },
  });
}

// ========== Check-in & Forfeit ==========

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

      if (error) throw error;
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] });
    },
  });
}

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

      const { data, error } = await supabase
        .from('tournament_matches')
        .update({
          winner_id: winnerId,
          status: 'completed' as MatchStatus,
          is_forfeit: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw error;

      // Advance winner to next round
      await advanceWinnerToNextRound(tournamentId, data);

      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] });
    },
  });
}

// ========== Dispute Resolution ==========

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

      if (error) throw error;
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] });
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

      const updates: Record<string, any> = {
        status: 'completed' as MatchStatus,
        dispute_resolved_by: user.id,
        dispute_resolution_notes: resolutionNotes,
      };

      if (newWinnerId !== undefined) updates.winner_id = newWinnerId;
      if (newSquadAScore !== undefined) updates.squad_a_score = newSquadAScore;
      if (newSquadBScore !== undefined) updates.squad_b_score = newSquadBScore;

      const { data, error } = await supabase
        .from('tournament_matches')
        .update(updates)
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw error;

      // Re-advance winner if result changed
      if (newWinnerId) {
        await advanceWinnerToNextRound(tournamentId, data);
      }

      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] });
    },
  });
}

// ========== Squad Withdrawal ==========

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
      // Set registration to withdrawn
      const { error: regError } = await supabase
        .from('tournament_registrations')
        .update({ status: 'withdrawn' })
        .eq('id', registrationId);

      if (regError) throw regError;

      // Get all pending/ongoing matches for this squad
      const { data: matches, error: matchError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .in('status', ['pending', 'ongoing'])
        .or(`squad_a_id.eq.${squadId},squad_b_id.eq.${squadId}`);

      if (matchError) throw matchError;

      // Forfeit each match
      for (const match of matches || []) {
        const opponentId = match.squad_a_id === squadId ? match.squad_b_id : match.squad_a_id;
        if (!opponentId) continue; // Skip if no opponent (TBD match)

        const { data: updated, error: forfeitError } = await supabase
          .from('tournament_matches')
          .update({
            winner_id: opponentId,
            status: 'completed' as MatchStatus,
            is_forfeit: true,
            completed_at: new Date().toISOString(),
          })
          .eq('id', match.id)
          .select()
          .single();

        if (forfeitError) throw forfeitError;

        // Advance opponent
        await advanceWinnerToNextRound(tournamentId, updated);
      }

      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-registrations', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}
