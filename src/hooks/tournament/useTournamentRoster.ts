import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RosterChange } from '@/lib/tournament-types';
import { tournamentKeys } from './queryKeys';

export function useRosterChanges(squadId: string | undefined, tournamentId: string | undefined) {
  return useQuery({
    queryKey: tournamentKeys.rosterChanges(squadId, tournamentId),
    queryFn: async () => {
      if (!squadId || !tournamentId) return [];

      const { data, error } = await supabase
        .from('roster_changes')
        .select('*')
        .eq('tournament_squad_id', squadId)
        .eq('tournament_id', tournamentId)
        .order('changed_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data as RosterChange[];
    },
    enabled: !!squadId && !!tournamentId,
  });
}

export function useMakeRosterChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      squadId, tournamentId, playerOutIgn, playerOutId, playerInIgn, playerInMlbbId, reason,
    }: {
      squadId: string;
      tournamentId: string;
      playerOutIgn: string;
      playerOutId?: string;
      playerInIgn: string;
      playerInMlbbId: string;
      reason?: string;
    }) => {
      const { data: existingChanges, error: checkError } = await supabase
        .from('roster_changes')
        .select('id, status')
        .eq('tournament_squad_id', squadId)
        .eq('tournament_id', tournamentId)
        .in('status', ['approved', 'pending']);

      if (checkError) throw new Error(checkError.message);

      const approvedCount = existingChanges.filter(c => c.status === 'approved').length;
      if (approvedCount >= 2) {
        throw new Error('Maximum roster changes (2) reached for this tournament');
      }

      if (playerInMlbbId) {
        const { data: allRegs } = await supabase
          .from('tournament_registrations')
          .select('tournament_squad_id')
          .eq('tournament_id', tournamentId)
          .in('status', ['approved', 'pending']);

        if (allRegs && allRegs.length > 0) {
          const allSquadIds = allRegs.map(r => r.tournament_squad_id);
          const { data: existingMembers } = await supabase
            .from('tournament_squad_members')
            .select('id, tournament_squad_id, mlbb_id')
            .in('tournament_squad_id', allSquadIds)
            .eq('mlbb_id', playerInMlbbId)
            .eq('member_status', 'active');

          const conflicting = existingMembers?.filter(m => m.tournament_squad_id !== squadId);
          if (conflicting && conflicting.length > 0) {
            throw new Error('This MLBB ID is already registered in another squad in this tournament');
          }
        }
      }

      const { data, error } = await supabase
        .from('roster_changes')
        .insert({
          tournament_squad_id: squadId,
          tournament_id: tournamentId,
          player_out_ign: playerOutIgn,
          player_out_id: playerOutId || null,
          player_in_ign: playerInIgn,
          player_in_mlbb_id: playerInMlbbId,
          reason: reason || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.rosterChanges(variables.squadId, variables.tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.tournamentRosterChanges(variables.tournamentId) });
    },
  });
}

export function useTournamentRosterChanges(tournamentId: string | undefined) {
  return useQuery({
    queryKey: tournamentKeys.tournamentRosterChanges(tournamentId),
    queryFn: async () => {
      if (!tournamentId) return [];

      const { data, error } = await supabase
        .from('roster_changes')
        .select(`*, tournament_squads (id, name, logo_url)`)
        .eq('tournament_id', tournamentId)
        .order('changed_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data as (RosterChange & { tournament_squads: { id: string; name: string; logo_url: string | null } })[];
    },
    enabled: !!tournamentId,
  });
}

export function useUpdateRosterChangeStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      changeId, status, tournamentId,
    }: {
      changeId: string;
      status: 'approved' | 'rejected';
      tournamentId: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      if (status === 'approved') {
        const { error } = await supabase.rpc('rpc_approve_roster_change', { p_change_id: changeId });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('roster_changes')
          .update({ status, approved_by: user.id, approved_at: new Date().toISOString() })
          .eq('id', changeId);
        if (error) throw new Error(error.message);
      }

      return { tournamentId };
    },
    onSuccess: ({ tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.tournamentRosterChanges(tournamentId) });
      queryClient.invalidateQueries({ queryKey: ['roster-changes'] });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.registrations(tournamentId) });
      queryClient.invalidateQueries({ queryKey: ['tournament-squad-members'] });
    },
  });
}

export function useHostEditRoster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tournamentId, tournamentSquadId, action, memberId, newIgn, newMlbbId, newRole, reason,
    }: {
      tournamentId: string;
      tournamentSquadId: string;
      action: 'add' | 'remove' | 'swap';
      memberId?: string;
      newIgn?: string;
      newMlbbId?: string;
      newRole?: 'main' | 'substitute';
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc('rpc_host_edit_roster', {
        p_tournament_id: tournamentId,
        p_tournament_squad_id: tournamentSquadId,
        p_action: action,
        p_member_id: memberId,
        p_new_ign: newIgn,
        p_new_mlbb_id: newMlbbId,
        p_new_role: newRole ?? 'substitute',
        p_reason: reason,
      });

      if (error) throw new Error(error.message);
      return { result: data as { success: boolean; action: string }, tournamentId, tournamentSquadId };
    },
    onSuccess: ({ tournamentId, tournamentSquadId }) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.registrations(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.squadMembers(tournamentSquadId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.tournamentRosterChanges(tournamentId) });
    },
  });
}

export function useRecaptureRosterSnapshots() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tournamentId: string) => {
      const { error } = await supabase.rpc('rpc_recapture_roster_snapshots', {
        p_tournament_id: tournamentId,
      });

      if (error) throw new Error(error.message);
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.registrations(tournamentId) });
    },
  });
}
