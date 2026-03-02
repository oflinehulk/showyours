import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  generateSingleEliminationBracket,
  generateDoubleEliminationBracket,
  generateRoundRobinBracket,
  generateSeededDoubleEliminationBracket,
  computeLBInitialRounds,
} from '@/lib/bracket-utils';
import { secureShuffleArray } from '@/lib/secure-random';
import type {
  TournamentSquad,
  TournamentStage,
  TournamentGroup,
  TournamentGroupTeam,
  TournamentMatch,
  StageStatus,
} from '@/lib/tournament-types';
import { tournamentKeys } from './queryKeys';
import { autoCompleteByes } from './matchAdvancementHelpers';

export function useTournamentStages(tournamentId: string | undefined) {
  return useQuery({
    queryKey: tournamentKeys.stages(tournamentId),
    queryFn: async () => {
      if (!tournamentId) return [];
      const { data, error } = await supabase
        .from('tournament_stages')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('stage_number', { ascending: true });
      if (error) throw new Error(error.message);
      return (data || []) as TournamentStage[];
    },
    enabled: !!tournamentId,
  });
}

// Fetch groups for a stage
export function useTournamentGroups(stageId: string | undefined) {
  return useQuery({
    queryKey: tournamentKeys.groups(stageId),
    queryFn: async () => {
      if (!stageId) return [];
      const { data, error } = await supabase
        .from('tournament_groups')
        .select('*')
        .eq('stage_id', stageId)
        .order('label', { ascending: true });
      if (error) throw new Error(error.message);
      return (data || []) as TournamentGroup[];
    },
    enabled: !!stageId,
  });
}

// Fetch group team assignments for a stage (all groups)
export function useTournamentGroupTeams(stageId: string | undefined) {
  return useQuery({
    queryKey: tournamentKeys.groupTeams(stageId),
    queryFn: async () => {
      if (!stageId) return [];
      const { data: groupsData } = await supabase
        .from('tournament_groups')
        .select('id')
        .eq('stage_id', stageId);
      const groupIds = (groupsData || []).map((g) => g.id);
      if (groupIds.length === 0) return [];
      const { data, error } = await supabase
        .from('tournament_group_teams')
        .select(`*, tournament_squads:tournament_squad_id(*)`)
        .in('group_id', groupIds);
      if (error) throw new Error(error.message);
      return (data || []) as (TournamentGroupTeam & { tournament_squads: TournamentSquad })[];
    },
    enabled: !!stageId,
  });
}

// Fetch matches for a specific stage
export function useStageMatches(stageId: string | undefined) {
  return useQuery({
    queryKey: tournamentKeys.stageMatches(stageId),
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
      if (error) throw new Error(error.message);
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
        finals_best_of: s.finals_best_of ?? s.best_of,
        group_count: s.group_count,
        advance_per_group: s.advance_per_group,
        advance_best_remaining: s.advance_best_remaining,
        advance_to_lower_per_group: s.advance_to_lower_per_group ?? 0,
        lb_initial_rounds: s.lb_initial_rounds ?? 0,
        status: 'pending' as StageStatus,
      }));

      const { data, error } = await supabase
        .from('tournament_stages')
        .insert(inserts)
        .select();

      if (error) throw new Error(error.message || 'Failed to create stages');
      return { data: (data || []) as TournamentStage[], tournamentId };
    },
    onSuccess: ({ tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.stages(tournamentId) });
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
      const { error } = await supabase
        .from('tournament_stages')
        .update(updates as never)
        .eq('id', stageId);
      if (error) throw new Error(error.message);
      return { tournamentId, stageId };
    },
    onSuccess: ({ tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.stages(tournamentId) });
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
      const { data: existingGroups } = await supabase
        .from('tournament_groups')
        .select('id')
        .eq('stage_id', stageId);

      if (existingGroups && existingGroups.length > 0) {
        await supabase
          .from('tournament_group_teams')
          .delete()
          .in('group_id', existingGroups.map((g) => g.id));
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

      if (groupError) throw new Error(groupError.message);

      // Order squads
      let ordered: string[];
      if (mode === 'random') {
        ordered = secureShuffleArray([...squadIds]);
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

      const { error: teamError } = await supabase
        .from('tournament_group_teams')
        .insert(groupTeamInserts);

      if (teamError) throw new Error(teamError.message);

      return { tournamentId, stageId };
    },
    onSuccess: ({ tournamentId, stageId }) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.groups(stageId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.groupTeams(stageId) });
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
      ubSquadIds,
      lbSquadIds,
    }: {
      tournamentId: string;
      stageId: string;
      stage: TournamentStage;
      squadIds?: string[]; // for knockout stage, pass advancing team IDs
      ubSquadIds?: string[]; // for seeded DE, upper bracket team IDs
      lbSquadIds?: string[]; // for seeded DE, lower bracket team IDs
    }) => {
      const opts = {
        stageId,
        defaultBestOf: stage.best_of as 1 | 3 | 5,
        finalsBestOf: (stage.finals_best_of || stage.best_of) as 1 | 3 | 5,
      };

      if (stage.format === 'round_robin' && stage.group_count > 0) {
        // Group stage — generate round robin per group
        const { data: groups, error: gErr } = await supabase
          .from('tournament_groups')
          .select('id, label')
          .eq('stage_id', stageId)
          .order('label', { ascending: true });

        if (gErr) throw new Error(gErr.message);
        if (!groups || groups.length === 0) throw new Error('No groups configured');

        const allMatches: Record<string, unknown>[] = [];

        for (const group of groups) {
          // Get team IDs in this group
          const { data: groupTeams, error: gtErr } = await supabase
            .from('tournament_group_teams')
            .select('tournament_squad_id')
            .eq('group_id', group.id);

          if (gtErr) throw new Error(gtErr.message);

          const teamIds = (groupTeams || []).map((gt) => gt.tournament_squad_id);
          if (teamIds.length < 2) continue;

          const groupOpts = { ...opts, groupId: group.id };
          const matches = generateRoundRobinBracket(tournamentId, teamIds, groupOpts);
          allMatches.push(...matches);
        }

        // Re-number match_number sequentially across all groups to avoid
        // duplicate key on idx_matches_multi_stage_unique (stage_id, round, match_number, bracket_type)
        allMatches.forEach((m, i) => { m.match_number = i + 1; });

        if (allMatches.length > 0) {
          // Delete any existing matches for this stage as a safety net
          const { error: delErr } = await supabase
            .from('tournament_matches')
            .delete()
            .eq('tournament_id', tournamentId)
            .eq('stage_id', stageId);
          if (delErr) throw new Error(`Failed to clear old matches: ${delErr.message}`);

          const { error: insertErr } = await supabase
            .from('tournament_matches')
            .insert(allMatches as never);
          if (insertErr) throw new Error(insertErr.message);
        }
      } else {
        // Elimination bracket
        let matches: Record<string, unknown>[];

        if (stage.format === 'double_elimination' && ubSquadIds && lbSquadIds && lbSquadIds.length >= 2) {
          // Seeded Double Elimination: separate UB and LB pools
          const k = computeLBInitialRounds(ubSquadIds.length, lbSquadIds.length);
          matches = generateSeededDoubleEliminationBracket(
            tournamentId, ubSquadIds, lbSquadIds, {
              ...opts,
              semiFinalsBestOf: opts.finalsBestOf,
            }
          );

          // Store computed k in stage for advancement logic
          await supabase
            .from('tournament_stages')
            .update({ lb_initial_rounds: k })
            .eq('id', stageId);
        } else {
          const ids = squadIds || [];
          if (ids.length < 2) throw new Error('Need at least 2 teams');

          if (stage.format === 'single_elimination') {
            matches = generateSingleEliminationBracket(tournamentId, ids, opts);
          } else if (stage.format === 'double_elimination') {
            matches = generateDoubleEliminationBracket(tournamentId, ids, opts);
          } else {
            matches = generateRoundRobinBracket(tournamentId, ids, opts);
          }
        }

        // Delete any existing matches for this stage as a safety net
        const { error: delErr } = await supabase
          .from('tournament_matches')
          .delete()
          .eq('tournament_id', tournamentId)
          .eq('stage_id', stageId);
        if (delErr) throw new Error(`Failed to clear old matches: ${delErr.message}`);

        const { error: insertErr } = await supabase
          .from('tournament_matches')
          .insert(matches as never);
        if (insertErr) throw new Error(insertErr.message);

        // Auto-complete byes for elimination formats
        if (stage.format !== 'round_robin') {
          await autoCompleteByes(tournamentId, stageId);
        }
      }

      // Update stage status to ongoing
      await supabase
        .from('tournament_stages')
        .update({ status: 'ongoing' })
        .eq('id', stageId);

      return { tournamentId, stageId };
    },
    onSuccess: ({ tournamentId, stageId }) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.stageMatches(stageId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.stages(tournamentId) });
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
      const { error } = await supabase
        .from('tournament_stages')
        .update({ status: 'completed' })
        .eq('id', stageId);
      if (error) throw new Error(error.message);
      return { tournamentId, stageId };
    },
    onSuccess: ({ tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.stages(tournamentId) });
    },
  });
}
