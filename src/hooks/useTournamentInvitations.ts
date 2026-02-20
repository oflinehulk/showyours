import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TournamentInvitation {
  id: string;
  tournament_id: string;
  squad_id: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  tournaments?: {
    id: string;
    name: string;
    date_time: string;
    status: string;
    banner_url: string | null;
  };
  squads?: {
    id: string;
    name: string;
    logo_url: string | null;
    owner_id: string;
  };
}

// Fetch invitations for a tournament (host view)
export function useTournamentInvitations(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['tournament-invitations', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const { data, error } = await supabase
        .from('tournament_invitations')
        .select('*, squads(id, name, logo_url, owner_id)')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TournamentInvitation[];
    },
    enabled: !!tournamentId,
  });
}

// Fetch pending tournament invitations for squads owned/led by current user
export function useMyTournamentInvitations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-tournament-invitations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get squads where user is owner
      const { data: ownedSquads } = await supabase
        .from('squads')
        .select('id')
        .eq('owner_id', user.id);

      // Get squads where user is leader/co_leader
      const { data: ledSquads } = await supabase
        .from('squad_members')
        .select('squad_id')
        .eq('user_id', user.id)
        .in('role', ['leader', 'co_leader']);

      const squadIds = new Set<string>();
      ownedSquads?.forEach(s => squadIds.add(s.id));
      ledSquads?.forEach(s => squadIds.add(s.squad_id));

      if (squadIds.size === 0) return [];

      const { data, error } = await supabase
        .from('tournament_invitations')
        .select('*, tournaments(id, name, date_time, status, banner_url), squads(id, name, logo_url, owner_id)')
        .in('squad_id', Array.from(squadIds))
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TournamentInvitation[];
    },
    enabled: !!user,
  });
}

// Host sends invitation to a squad
export function useSendTournamentInvitation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tournamentId,
      squadId,
      message,
    }: {
      tournamentId: string;
      squadId: string;
      message?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tournament_invitations')
        .insert({
          tournament_id: tournamentId,
          squad_id: squadId,
          invited_by: user.id,
          message: message || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') throw new Error('This squad has already been invited');
        throw error;
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-invitations', variables.tournamentId] });
    },
  });
}

// Squad leader accepts/rejects invitation
export function useRespondToTournamentInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invitationId,
      response,
    }: {
      invitationId: string;
      response: 'accepted' | 'rejected';
    }) => {
      const { data, error } = await supabase
        .from('tournament_invitations')
        .update({ status: response })
        .eq('id', invitationId)
        .select('*, tournaments(id, name), squads(id, name, logo_url, owner_id)')
        .single();

      if (error) throw error;
      return data as TournamentInvitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tournament-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['tournament-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['tournament-registrations'] });
    },
  });
}

// Host cancels invitation
export function useCancelTournamentInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invitationId,
      tournamentId,
    }: {
      invitationId: string;
      tournamentId: string;
    }) => {
      const { error } = await supabase
        .from('tournament_invitations')
        .delete()
        .eq('id', invitationId);
      if (error) throw error;
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-invitations', tournamentId] });
    },
  });
}
