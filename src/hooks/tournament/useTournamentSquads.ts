import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TournamentSquad, TournamentSquadMember } from '@/lib/tournament-types';
import { tournamentKeys } from './queryKeys';

export function useMyTournamentSquads() {
  const { user } = useAuth();

  return useQuery({
    queryKey: tournamentKeys.mySquads(user?.id),
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('tournament_squads')
        .select('*')
        .eq('leader_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data as TournamentSquad[];
    },
    enabled: !!user,
  });
}

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

      const { data: squadData, error: squadError } = await supabase
        .from('tournament_squads')
        .insert({ ...squad, leader_id: user.id })
        .select()
        .single();

      if (squadError) throw new Error(squadError.message);

      if (members.length > 0) {
        const { error: membersError } = await supabase
          .from('tournament_squad_members')
          .insert(members.map((m) => ({ ...m, tournament_squad_id: squadData.id })));

        if (membersError) throw new Error(membersError.message);
      }

      return squadData as TournamentSquad;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tournament-squads'] });
    },
  });
}

export function useUpdateTournamentSquad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      squadId,
      tournamentId,
      name,
      logo_url,
    }: {
      squadId: string;
      tournamentId: string;
      name: string;
      logo_url: string | null;
    }) => {
      const { error } = await supabase
        .from('tournament_squads')
        .update({ name, logo_url })
        .eq('id', squadId);

      if (error) throw new Error(error.message);
      return { tournamentId };
    },
    onSuccess: ({ tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.registrations(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      queryClient.invalidateQueries({ queryKey: ['stage-matches'] });
    },
  });
}

export function useTournamentSquadMembers(squadId: string | undefined) {
  return useQuery({
    queryKey: tournamentKeys.squadMembers(squadId),
    queryFn: async () => {
      if (!squadId) return [];

      const { data, error } = await supabase
        .from('tournament_squad_members')
        .select('*')
        .eq('tournament_squad_id', squadId)
        .eq('member_status', 'active')
        .order('position', { ascending: true });

      if (error) throw new Error(error.message);
      return data as TournamentSquadMember[];
    },
    enabled: !!squadId,
  });
}
