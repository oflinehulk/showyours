import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { GroupDrawEntry } from '@/lib/tournament-types';
import { tournamentKeys } from './queryKeys';

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
      if (error) throw new Error(error.message);
      return { tournamentId, stageId };
    },
    onSuccess: ({ tournamentId, stageId }) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      if (stageId) {
        queryClient.invalidateQueries({ queryKey: tournamentKeys.stageMatches(stageId) });
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
      if (error) throw new Error(error.message);
      return { tournamentId, stageId };
    },
    onSuccess: ({ tournamentId, stageId }) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      if (stageId) {
        queryClient.invalidateQueries({ queryKey: tournamentKeys.stageMatches(stageId) });
      }
    },
  });
}

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

      if (groupError) throw new Error(groupError.message);

      // Build group-teams map from draw sequence
      const groupMap = new Map(groups.map(g => [g.label, g.id]));
      const groupTeamInserts = drawSequence.map(entry => ({
        group_id: groupMap.get(entry.group_label)!,
        tournament_squad_id: entry.squad_id,
      }));

      const { error: teamError } = await supabase
        .from('tournament_group_teams')
        .insert(groupTeamInserts);

      if (teamError) throw new Error(teamError.message);

      // Insert audit record into group_draws
      const { error: drawError } = await supabase
        .from('group_draws')
        .insert({
          tournament_id: tournamentId,
          stage_id: stageId,
          draw_seed: drawSeed,
          draw_sequence: drawSequence as unknown as Json,
          confirmed: true,
          confirmed_at: new Date().toISOString(),
        });

      if (drawError) throw new Error(drawError.message);

      return { tournamentId, stageId };
    },
    onSuccess: ({ stageId }) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.groups(stageId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.groupTeams(stageId) });
    },
  });
}
