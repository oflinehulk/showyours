import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { MatchStatus } from '@/lib/tournament-types';
import { tournamentKeys } from './queryKeys';

export function useSwapTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tournamentId,
      stageId,
      groupId,
      withdrawnSquadId,
      newSquadId,
      newRegistrationId,
    }: {
      tournamentId: string;
      stageId: string;
      groupId: string;
      withdrawnSquadId: string;
      newSquadId: string;
      newRegistrationId: string;
    }) => {
      // 1. Approve new team's registration if it was pending/rejected
      const { data: newReg } = await supabase
        .from('tournament_registrations')
        .select('status')
        .eq('id', newRegistrationId)
        .single();

      if (newReg && newReg.status !== 'approved') {
        const { error: approveErr } = await supabase
          .from('tournament_registrations')
          .update({ status: 'approved' })
          .eq('id', newRegistrationId);
        if (approveErr) throw new Error(approveErr.message);
      }

      // 2. Collect IDs of forfeited matches involving the withdrawn team in this group
      const { data: forfeitedMatches, error: fmErr } = await supabase
        .from('tournament_matches')
        .select('id')
        .eq('group_id', groupId)
        .eq('is_forfeit', true)
        .or(`squad_a_id.eq.${withdrawnSquadId},squad_b_id.eq.${withdrawnSquadId}`);
      if (fmErr) throw new Error(fmErr.message);
      const forfeitMatchIds = (forfeitedMatches || []).map(m => m.id);

      // 3. Swap squad ID in all group matches (squad_a side)
      const { error: swapAErr } = await supabase
        .from('tournament_matches')
        .update({ squad_a_id: newSquadId })
        .eq('group_id', groupId)
        .eq('squad_a_id', withdrawnSquadId);
      if (swapAErr) throw new Error(swapAErr.message);

      // Swap squad ID in all group matches (squad_b side)
      const { error: swapBErr } = await supabase
        .from('tournament_matches')
        .update({ squad_b_id: newSquadId })
        .eq('group_id', groupId)
        .eq('squad_b_id', withdrawnSquadId);
      if (swapBErr) throw new Error(swapBErr.message);

      // Also swap winner_id if withdrawn team was the winner
      const { error: winnerErr } = await supabase
        .from('tournament_matches')
        .update({ winner_id: newSquadId })
        .eq('group_id', groupId)
        .eq('winner_id', withdrawnSquadId);
      if (winnerErr) throw new Error(winnerErr.message);

      // 4. Update tournament_group_teams: replace withdrawn with new team
      const { error: gtErr } = await supabase
        .from('tournament_group_teams')
        .update({ tournament_squad_id: newSquadId })
        .eq('group_id', groupId)
        .eq('tournament_squad_id', withdrawnSquadId);
      if (gtErr) throw new Error(gtErr.message);

      // 5. Reset forfeited matches to pending
      if (forfeitMatchIds.length > 0) {
        const { error: resetErr } = await supabase
          .from('tournament_matches')
          .update({
            status: 'pending' as MatchStatus,
            winner_id: null,
            is_forfeit: false,
            squad_a_score: 0,
            squad_b_score: 0,
            completed_at: null,
            squad_a_checked_in: false,
            squad_b_checked_in: false,
            toss_winner: null,
            blue_side_team: null,
            red_side_team: null,
            toss_completed_at: null,
          })
          .in('id', forfeitMatchIds);
        if (resetErr) throw new Error(resetErr.message);
      }

      // 6. Lock new team's roster
      const { data: members } = await supabase
        .from('tournament_squad_members')
        .select('id, ign, mlbb_id, role, position')
        .eq('tournament_squad_id', newSquadId)
        .eq('member_status', 'active');

      const rosterSnapshot = (members || []).map(m => ({
        id: m.id,
        ign: m.ign,
        mlbb_id: m.mlbb_id,
        role: m.role,
        position: m.position,
      }));

      await supabase
        .from('tournament_registrations')
        .update({
          roster_locked: true,
          roster_locked_at: new Date().toISOString(),
          roster_snapshot: rosterSnapshot as unknown as Json,
        })
        .eq('id', newRegistrationId);

      // 7. Write audit log
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('tournament_audit_log')
        .insert({
          tournament_id: tournamentId,
          user_id: user?.id ?? null,
          action: 'team_swapped',
          details: {
            group_id: groupId,
            withdrawn_squad_id: withdrawnSquadId,
            new_squad_id: newSquadId,
            forfeited_matches_reset: forfeitMatchIds.length,
          },
        });

      return { tournamentId, stageId };
    },
    onSuccess: ({ tournamentId, stageId }) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.registrations(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.stageMatches(stageId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.groupTeams(stageId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.allSquadsForHostAdd });
    },
  });
}
