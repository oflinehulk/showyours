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
  RosterChange,
  TournamentStage,
  TournamentGroup,
  TournamentGroupTeam,
  StageStatus,
  GroupDrawEntry,
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
        p_members: members,
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

    // Build query — scope to stage when present
    let query = supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('round', nextRound)
      .eq('match_number', nextMatchNumber)
      .in('bracket_type', completedMatch.bracket_type === 'winners' ? ['winners', 'finals'] : ['losers', 'finals']);

    if (completedMatch.stage_id) {
      query = query.eq('stage_id', completedMatch.stage_id);
    }

    const { data: nextMatches } = await query;

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
async function autoCompleteByes(tournamentId: string, stageId?: string) {
  let queryA = supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('round', 1)
    .is('squad_b_id', null)
    .not('squad_a_id', 'is', null);

  if (stageId) {
    queryA = queryA.eq('stage_id', stageId);
  }

  const { data: byeMatches } = await queryA;

  if (!byeMatches) return;

  for (const match of byeMatches) {
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

    await advanceWinnerToNextRound(tournamentId, {
      ...match,
      winner_id: match.squad_a_id,
    });
  }

  // Also handle reverse byes
  let queryB = supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('round', 1)
    .is('squad_a_id', null)
    .not('squad_b_id', 'is', null);

  if (stageId) {
    queryB = queryB.eq('stage_id', stageId);
  }

  const { data: reverseByes } = await queryB;

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

      if (status === 'approved') {
        // Use atomic RPC which enforces host auth + max 2 changes limit
        const { error } = await supabase.rpc('rpc_approve_roster_change', {
          p_change_id: changeId,
        });
        if (error) throw error;
      } else {
        // Reject directly
        const { error } = await supabase
          .from('roster_changes')
          .update({
            status,
            approved_by: user.id,
            approved_at: new Date().toISOString(),
          })
          .eq('id', changeId);
        if (error) throw error;
      }

      return { tournamentId };
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

  // Generate standard seeding order and map to squad IDs
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

      // Fetch the match to know which side is the winner
      const { data: match, error: fetchErr } = await supabase
        .from('tournament_matches')
        .select('squad_a_id, squad_b_id')
        .eq('id', matchId)
        .single();
      if (fetchErr) throw fetchErr;

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

        const winsNeeded = Math.ceil((match.best_of || 1) / 2);
        const { data: updated, error: forfeitError } = await supabase
          .from('tournament_matches')
          .update({
            winner_id: opponentId,
            status: 'completed' as MatchStatus,
            is_forfeit: true,
            squad_a_score: opponentId === match.squad_a_id ? winsNeeded : 0,
            squad_b_score: opponentId === match.squad_b_id ? winsNeeded : 0,
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

// ========== Multi-Stage Hooks ==========

// Fetch stages for a tournament
export function useTournamentStages(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['tournament-stages', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const { data, error } = await (supabase
        .from('tournament_stages' as any)
        .select('*') as any)
        .eq('tournament_id', tournamentId)
        .order('stage_number', { ascending: true });
      if (error) throw error;
      return (data || []) as TournamentStage[];
    },
    enabled: !!tournamentId,
  });
}

// Fetch groups for a stage
export function useTournamentGroups(stageId: string | undefined) {
  return useQuery({
    queryKey: ['tournament-groups', stageId],
    queryFn: async () => {
      if (!stageId) return [];
      const { data, error } = await (supabase
        .from('tournament_groups' as any)
        .select('*') as any)
        .eq('stage_id', stageId)
        .order('label', { ascending: true });
      if (error) throw error;
      return (data || []) as TournamentGroup[];
    },
    enabled: !!stageId,
  });
}

// Fetch group team assignments for a stage (all groups)
export function useTournamentGroupTeams(stageId: string | undefined) {
  return useQuery({
    queryKey: ['tournament-group-teams', stageId],
    queryFn: async () => {
      if (!stageId) return [];
      const { data: groupsData } = await (supabase
        .from('tournament_groups' as any)
        .select('id') as any)
        .eq('stage_id', stageId);
      const groupIds = (groupsData || []).map((g: any) => g.id);
      if (groupIds.length === 0) return [];
      const { data, error } = await (supabase
        .from('tournament_group_teams' as any)
        .select(`*, tournament_squads:tournament_squad_id(*)`) as any)
        .in('group_id', groupIds);
      if (error) throw error;
      return (data || []) as (TournamentGroupTeam & { tournament_squads: TournamentSquad })[];
    },
    enabled: !!stageId,
  });
}

// Fetch matches for a specific stage
export function useStageMatches(stageId: string | undefined) {
  return useQuery({
    queryKey: ['stage-matches', stageId],
    queryFn: async () => {
      if (!stageId) return [];
      const { data, error } = await supabase
        .from('tournament_matches')
        .select(`
          *,
          squad_a:tournament_squads!tournament_matches_squad_a_id_fkey(*),
          squad_b:tournament_squads!tournament_matches_squad_b_id_fkey(*)
        `)
        .eq('stage_id', stageId)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });
      if (error) throw error;
      return data as TournamentMatch[];
    },
    enabled: !!stageId,
  });
}

// Create stages for a tournament
export function useCreateStages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tournamentId,
      stages,
    }: {
      tournamentId: string;
      stages: Omit<TournamentStage, 'id' | 'tournament_id' | 'status' | 'created_at' | 'updated_at'>[];
    }) => {
      const inserts = stages.map(s => ({
        tournament_id: tournamentId,
        stage_number: s.stage_number,
        name: s.name,
        format: s.format,
        best_of: s.best_of,
        finals_best_of: s.finals_best_of,
        group_count: s.group_count,
        advance_per_group: s.advance_per_group,
        advance_best_remaining: s.advance_best_remaining,
        status: 'pending' as StageStatus,
      }));

      const { data, error } = await (supabase
        .from('tournament_stages' as any)
        .insert(inserts as any) as any)
        .select();

      if (error) throw error;
      return { data: (data || []) as TournamentStage[], tournamentId };
    },
    onSuccess: ({ tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-stages', tournamentId] });
    },
  });
}

// Update a stage
export function useUpdateStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      stageId,
      tournamentId,
      ...updates
    }: Partial<TournamentStage> & { stageId: string; tournamentId: string }) => {
      const { error } = await (supabase
        .from('tournament_stages' as any)
        .update(updates as any) as any)
        .eq('id', stageId);
      if (error) throw error;
      return { tournamentId, stageId };
    },
    onSuccess: ({ tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-stages', tournamentId] });
    },
  });
}

// Assign teams to groups for a group stage
export function useAssignTeamsToGroups() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tournamentId,
      stageId,
      groupCount,
      squadIds,
      mode,
    }: {
      tournamentId: string;
      stageId: string;
      groupCount: number;
      squadIds: string[];
      mode: 'balanced' | 'random';
    }) => {
      // Delete existing groups for this stage
      const { data: existingGroups } = await (supabase
        .from('tournament_groups' as any)
        .select('id') as any)
        .eq('stage_id', stageId);

      if (existingGroups && existingGroups.length > 0) {
        await (supabase
          .from('tournament_group_teams' as any)
          .delete() as any)
          .in('group_id', existingGroups.map((g: any) => g.id));
        await (supabase
          .from('tournament_groups' as any)
          .delete() as any)
          .eq('stage_id', stageId);
      }

      // Create groups (A, B, C, ...)
      const labels = Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i));
      const { data: groups, error: groupError } = await (supabase
        .from('tournament_groups' as any)
        .insert(labels.map(label => ({
          stage_id: stageId,
          tournament_id: tournamentId,
          label,
        })) as any) as any)
        .select();

      if (groupError) throw groupError;

      // Order squads
      let ordered: string[];
      if (mode === 'random') {
        ordered = [...squadIds].sort(() => Math.random() - 0.5);
      } else {
        // Balanced: snake-draft (1→A, 2→B, ..., N→N, N+1→N, ..., back to A)
        ordered = [...squadIds]; // assumed already seeded
      }

      // Snake draft into groups
      const groupTeamInserts: { group_id: string; tournament_squad_id: string }[] = [];
      let forward = true;
      let groupIdx = 0;

      for (const squadId of ordered) {
        groupTeamInserts.push({
          group_id: groups[groupIdx].id,
          tournament_squad_id: squadId,
        });

        if (forward) {
          if (groupIdx === groupCount - 1) {
            forward = false; // reverse
          } else {
            groupIdx++;
          }
        } else {
          if (groupIdx === 0) {
            forward = true; // forward again
          } else {
            groupIdx--;
          }
        }
      }

      const { error: teamError } = await (supabase
        .from('tournament_group_teams' as any)
        .insert(groupTeamInserts as any) as any);

      if (teamError) throw teamError;

      return { tournamentId, stageId };
    },
    onSuccess: ({ tournamentId, stageId }) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-groups', stageId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-group-teams', stageId] });
    },
  });
}

// Generate bracket for a specific stage
export function useGenerateStageBracket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tournamentId,
      stageId,
      stage,
      squadIds,
    }: {
      tournamentId: string;
      stageId: string;
      stage: TournamentStage;
      squadIds?: string[]; // for knockout stage, pass advancing team IDs
    }) => {
      const opts = {
        stageId,
        defaultBestOf: stage.best_of as 1 | 3 | 5,
        finalsBestOf: (stage.finals_best_of || stage.best_of) as 1 | 3 | 5,
      };

      if (stage.format === 'round_robin' && stage.group_count > 0) {
        // Group stage — generate round robin per group
        const { data: groups, error: gErr } = await (supabase
          .from('tournament_groups' as any)
          .select('id, label') as any)
          .eq('stage_id', stageId)
          .order('label', { ascending: true });

        if (gErr) throw gErr;
        if (!groups || groups.length === 0) throw new Error('No groups configured');

        const allMatches: any[] = [];

        for (const group of groups) {
          // Get team IDs in this group
          const { data: groupTeams, error: gtErr } = await (supabase
            .from('tournament_group_teams' as any)
            .select('tournament_squad_id') as any)
            .eq('group_id', group.id);

          if (gtErr) throw gtErr;

          const teamIds = (groupTeams || []).map((gt: any) => gt.tournament_squad_id);
          if (teamIds.length < 2) continue;

          const groupOpts = { ...opts, groupId: group.id };
          const matches = generateRoundRobinBracket(tournamentId, teamIds, groupOpts);
          allMatches.push(...matches);
        }

        if (allMatches.length > 0) {
          const { error: insertErr } = await supabase
            .from('tournament_matches')
            .insert(allMatches);
          if (insertErr) throw insertErr;
        }
      } else {
        // Elimination bracket
        const ids = squadIds || [];
        if (ids.length < 2) throw new Error('Need at least 2 teams');

        let matches: any[];
        if (stage.format === 'single_elimination') {
          matches = generateSingleEliminationBracket(tournamentId, ids, opts);
        } else if (stage.format === 'double_elimination') {
          matches = generateDoubleEliminationBracket(tournamentId, ids, opts);
        } else {
          matches = generateRoundRobinBracket(tournamentId, ids, opts);
        }

        const { error: insertErr } = await supabase
          .from('tournament_matches')
          .insert(matches);
        if (insertErr) throw insertErr;

        // Auto-complete byes for elimination formats
        if (stage.format !== 'round_robin') {
          await autoCompleteByes(tournamentId, stageId);
        }
      }

      // Update stage status to ongoing
      await (supabase
        .from('tournament_stages' as any)
        .update({ status: 'ongoing' } as any) as any)
        .eq('id', stageId);

      return { tournamentId, stageId };
    },
    onSuccess: ({ tournamentId, stageId }) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['stage-matches', stageId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-stages', tournamentId] });
    },
  });
}

// Complete a stage
export function useCompleteStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      stageId,
      tournamentId,
    }: {
      stageId: string;
      tournamentId: string;
    }) => {
      const { error } = await (supabase
        .from('tournament_stages' as any)
        .update({ status: 'completed' } as any) as any)
        .eq('id', stageId);
      if (error) throw error;
      return { tournamentId, stageId };
    },
    onSuccess: ({ tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-stages', tournamentId] });
    },
  });
}

// ========== Coin Toss Hooks ==========

// Save coin toss result for a match
export function useSaveCoinToss() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      tournamentId,
      stageId,
      tossWinner,
      blueSideTeam,
      redSideTeam,
    }: {
      matchId: string;
      tournamentId: string;
      stageId?: string | null;
      tossWinner: string;
      blueSideTeam: string;
      redSideTeam: string;
    }) => {
      const { error } = await supabase
        .from('tournament_matches')
        .update({
          toss_winner: tossWinner,
          blue_side_team: blueSideTeam,
          red_side_team: redSideTeam,
          toss_completed_at: new Date().toISOString(),
        })
        .eq('id', matchId);
      if (error) throw error;
      return { tournamentId, stageId };
    },
    onSuccess: ({ tournamentId, stageId }) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] });
      if (stageId) {
        queryClient.invalidateQueries({ queryKey: ['stage-matches', stageId] });
      }
    },
  });
}

// Reset coin toss (for redo before match starts)
export function useResetCoinToss() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      tournamentId,
      stageId,
    }: {
      matchId: string;
      tournamentId: string;
      stageId?: string | null;
    }) => {
      const { error } = await supabase
        .from('tournament_matches')
        .update({
          toss_winner: null,
          blue_side_team: null,
          red_side_team: null,
          toss_completed_at: null,
        })
        .eq('id', matchId);
      if (error) throw error;
      return { tournamentId, stageId };
    },
    onSuccess: ({ tournamentId, stageId }) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] });
      if (stageId) {
        queryClient.invalidateQueries({ queryKey: ['stage-matches', stageId] });
      }
    },
  });
}

// ========== Group Draw Hook ==========

// Save group draw: insert audit record + create groups + assign teams
export function useSaveGroupDraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tournamentId,
      stageId,
      groupCount,
      drawSeed,
      drawSequence,
    }: {
      tournamentId: string;
      stageId: string;
      groupCount: number;
      drawSeed: string;
      drawSequence: GroupDrawEntry[];
    }) => {
      // Delete existing groups for this stage
      const { data: existingGroups } = await supabase
        .from('tournament_groups')
        .select('id')
        .eq('stage_id', stageId);

      if (existingGroups && existingGroups.length > 0) {
        await supabase
          .from('tournament_group_teams')
          .delete()
          .in('group_id', existingGroups.map(g => g.id));
        await supabase
          .from('tournament_groups')
          .delete()
          .eq('stage_id', stageId);
      }

      // Create groups (A, B, C, ...)
      const labels = Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i));
      const { data: groups, error: groupError } = await supabase
        .from('tournament_groups')
        .insert(labels.map(label => ({
          stage_id: stageId,
          tournament_id: tournamentId,
          label,
        })))
        .select();

      if (groupError) throw groupError;

      // Build group-teams map from draw sequence
      const groupMap = new Map(groups.map(g => [g.label, g.id]));
      const groupTeamInserts = drawSequence.map(entry => ({
        group_id: groupMap.get(entry.group_label)!,
        tournament_squad_id: entry.squad_id,
      }));

      const { error: teamError } = await supabase
        .from('tournament_group_teams')
        .insert(groupTeamInserts);

      if (teamError) throw teamError;

      // Insert audit record into group_draws
      const { error: drawError } = await supabase
        .from('group_draws')
        .insert({
          tournament_id: tournamentId,
          stage_id: stageId,
          draw_seed: drawSeed,
          draw_sequence: drawSequence as any,
          confirmed: true,
          confirmed_at: new Date().toISOString(),
        });

      if (drawError) throw drawError;

      return { tournamentId, stageId };
    },
    onSuccess: ({ tournamentId, stageId }) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-groups', stageId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-group-teams', stageId] });
    },
  });
}
