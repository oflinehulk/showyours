import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TournamentMatch, TournamentFormat, TournamentStatus, StageStatus } from '@/lib/tournament-types';
import {
  generateSingleEliminationBracket,
  generateDoubleEliminationBracket,
  generateRoundRobinBracket,
} from '@/lib/bracket-utils';
import { secureShuffleArray } from '@/lib/secure-random';
import { autoCompleteByes } from './matchAdvancementHelpers';
import { applyStandardSeeding } from './useBracketSeeding';
import { tournamentKeys } from './queryKeys';

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
      const { data: registrations, error: regError } = await supabase
        .from('tournament_registrations')
        .select('tournament_squad_id, seed')
        .eq('tournament_id', tournamentId)
        .eq('status', 'approved');

      if (regError) throw new Error(regError.message);
      if (!registrations || registrations.length < 2) {
        throw new Error('Need at least 2 approved squads to generate bracket');
      }

      const hasSeeds = registrations.some((r) => r.seed != null);
      let orderedSquadIds: (string | null)[];

      if (hasSeeds) {
        const sorted = [...registrations].sort((a, b) => {
          if (a.seed == null && b.seed == null) return 0;
          if (a.seed == null) return 1;
          if (b.seed == null) return -1;
          return a.seed - b.seed;
        });
        orderedSquadIds = applyStandardSeeding(sorted.map((r) => r.tournament_squad_id));
      } else {
        orderedSquadIds = secureShuffleArray(registrations.map((r) => r.tournament_squad_id));
      }

      let matches: Omit<TournamentMatch, 'id' | 'created_at' | 'updated_at' | 'squad_a' | 'squad_b' | 'squad_a_checked_in' | 'squad_b_checked_in' | 'is_forfeit' | 'dispute_reason' | 'dispute_screenshot' | 'dispute_raised_by' | 'dispute_resolved_by' | 'dispute_resolution_notes'>[] = [];

      if (format === 'single_elimination') {
        matches = generateSingleEliminationBracket(tournamentId, orderedSquadIds);
      } else if (format === 'double_elimination') {
        matches = generateDoubleEliminationBracket(tournamentId, orderedSquadIds);
      } else {
        matches = generateRoundRobinBracket(tournamentId, orderedSquadIds.filter((id): id is string => id !== null));
      }

      const { error: rpcError } = await supabase.rpc('atomic_replace_tournament_matches', {
        p_tournament_id: tournamentId,
        p_new_matches: matches,
      });

      if (rpcError) throw new Error(rpcError.message);

      const { error: updateError } = await supabase
        .from('tournaments')
        .update({
          status: 'bracket_generated' as TournamentStatus,
          format,
        })
        .eq('id', tournamentId);

      if (updateError) throw new Error(updateError.message);

      if (format !== 'round_robin') {
        await autoCompleteByes(tournamentId);
      }

      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.detail(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });
}

export function useResetBracket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tournamentId: string) => {
      const { error: deleteError } = await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournamentId);

      if (deleteError) throw new Error(deleteError.message);

      const { error: stageError } = await supabase
        .from('tournament_stages')
        .update({ status: 'pending' })
        .eq('tournament_id', tournamentId);

      if (stageError) throw new Error(stageError.message);

      const { error: updateError } = await supabase
        .from('tournaments')
        .update({
          status: 'registration_closed' as TournamentStatus,
          format: null,
        })
        .eq('id', tournamentId);

      if (updateError) throw new Error(updateError.message);
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.detail(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.stages(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });
}

export function useResetStageBracket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tournamentId,
      stageId,
      stageNumber,
    }: {
      tournamentId: string;
      stageId: string;
      stageNumber: number;
    }) => {
      const { error: deleteError } = await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('stage_id', stageId);

      if (deleteError) throw new Error(deleteError.message);

      const { error: updateError } = await supabase
        .from('tournament_stages')
        .update({ status: 'pending' as StageStatus })
        .eq('id', stageId);

      if (updateError) throw new Error(updateError.message);

      if (stageNumber === 1) {
        const { error: tournErr } = await supabase
          .from('tournaments')
          .update({
            status: 'registration_closed' as TournamentStatus,
            format: null,
          })
          .eq('id', tournamentId);

        if (tournErr) throw new Error(tournErr.message);
      }

      return { tournamentId, stageId };
    },
    onSuccess: ({ tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.detail(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.stages(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      queryClient.invalidateQueries({ queryKey: ['stage-matches'] });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });
}

export function useDeleteStages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tournamentId: string) => {
      await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournamentId);

      const { data: stages } = await supabase
        .from('tournament_stages')
        .select('id')
        .eq('tournament_id', tournamentId);

      if (stages && stages.length > 0) {
        const stageIds = stages.map(s => s.id);

        const { data: groups } = await supabase
          .from('tournament_groups')
          .select('id')
          .in('stage_id', stageIds);

        if (groups && groups.length > 0) {
          const groupIds = groups.map(g => g.id);
          await supabase
            .from('tournament_group_teams')
            .delete()
            .in('group_id', groupIds);

          await supabase
            .from('tournament_groups')
            .delete()
            .in('stage_id', stageIds);
        }
      }

      const { error } = await supabase
        .from('tournament_stages')
        .delete()
        .eq('tournament_id', tournamentId);

      if (error) throw new Error(error.message);
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.detail(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.stages(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });
}
