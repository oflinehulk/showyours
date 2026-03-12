import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TournamentRegistration, TournamentSquad } from '@/lib/tournament-types';
import { tournamentKeys } from './queryKeys';

export function useTournamentRegistrations(tournamentId: string | undefined) {
  return useQuery({
    queryKey: tournamentKeys.registrations(tournamentId),
    queryFn: async () => {
      if (!tournamentId) return [];

      const { data, error } = await supabase
        .from('tournament_registrations')
        .select(`*, tournament_squads (*)`)
        .eq('tournament_id', tournamentId)
        .order('registered_at', { ascending: true });

      if (error) throw new Error(error.message);
      return data as (TournamentRegistration & { tournament_squads: TournamentSquad })[];
    },
    enabled: !!tournamentId,
  });
}

export function useRegisterForTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tournamentId, squadName, existingSquadId, logoUrl, members,
    }: {
      tournamentId: string;
      squadName: string;
      existingSquadId: string;
      logoUrl: string | null;
      members: { ign: string; mlbb_id: string; role: string; position: number; user_id: string | null }[];
    }) => {
      const { data, error } = await supabase.rpc('rpc_register_for_tournament', {
        p_tournament_id: tournamentId,
        p_squad_name: squadName,
        p_existing_squad_id: existingSquadId,
        p_logo_url: logoUrl ?? '',
        p_members: members,
      });

      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.registrations(variables.tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
      queryClient.invalidateQueries({ queryKey: ['my-tournament-squads'] });
    },
  });
}

export function useHostAddSquad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tournamentId, squadId }: { tournamentId: string; squadId: string }) => {
      const { data, error } = await supabase.rpc('rpc_host_add_squad', {
        p_tournament_id: tournamentId,
        p_squad_id: squadId,
      });

      if (error) throw new Error(error.message);
      return { squadId: data as string, tournamentId };
    },
    onSuccess: ({ tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.registrations(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.allSquadsForHostAdd });
    },
  });
}

export function useUpdateRegistrationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      registrationId, status, tournamentId,
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

      if (error) throw new Error(error.message);
      return { data, tournamentId };
    },
    onSuccess: ({ tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.registrations(tournamentId) });
    },
  });
}

export function useWithdrawFromTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ registrationId, tournamentId }: { registrationId: string; tournamentId: string }) => {
      const { error } = await supabase
        .from('tournament_registrations')
        .delete()
        .eq('id', registrationId);

      if (error) throw new Error(error.message);
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.registrations(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });
}

export function useDeleteRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ registrationId, tournamentId }: { registrationId: string; tournamentId: string }) => {
      const { error } = await supabase
        .from('tournament_registrations')
        .delete()
        .eq('id', registrationId);

      if (error) throw new Error(error.message);
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.registrations(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });
}

export function useWildCardAdd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tournamentId,
      squadId,
      matchId,
    }: {
      tournamentId: string;
      squadId: string;
      matchId: string;
    }) => {
      const { data, error } = await supabase.rpc('rpc_wild_card_add', {
        p_tournament_id: tournamentId,
        p_squad_id: squadId,
        p_match_id: matchId,
      });

      if (error) throw new Error(error.message);
      return { tournamentSquadId: data as string, tournamentId };
    },
    onSuccess: ({ tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.registrations(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.matches(tournamentId) });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.allSquadsForHostAdd });
      queryClient.invalidateQueries({ queryKey: ['stage-matches'] });
    },
  });
}
