import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tournament, TournamentWithDetails } from '@/lib/tournament-types';
import { tournamentKeys } from './queryKeys';

// Fetch all tournaments with registration counts
export function useTournaments() {
  return useQuery({
    queryKey: tournamentKeys.all,
    queryFn: async () => {
      const { data: tournaments, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('date_time', { ascending: true });

      if (error) throw new Error(error.message);

      const { data: registrations } = await supabase
        .from('tournament_registrations')
        .select('tournament_id')
        .eq('status', 'approved');

      const counts: Record<string, number> = {};
      registrations?.forEach((r) => {
        counts[r.tournament_id] = (counts[r.tournament_id] || 0) + 1;
      });

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
    queryKey: tournamentKeys.detail(id),
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data as Tournament | null;
    },
    enabled: !!id,
  });
}

// Fetch tournaments hosted by the current user
export function useMyTournaments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: tournamentKeys.my(user?.id),
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
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
      const insertPayload: Record<string, unknown> = { ...rest, host_id: user.id };
      if (prize_tiers !== undefined) {
        insertPayload.prize_tiers = JSON.parse(JSON.stringify(prize_tiers));
      }

      const { data, error } = await supabase
        .from('tournaments')
        .insert(insertPayload as never)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Tournament;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
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
      const updatePayload: Record<string, unknown> = { ...rest };
      if (prize_tiers !== undefined) {
        updatePayload.prize_tiers = JSON.parse(JSON.stringify(prize_tiers));
      }
      const { data, error } = await supabase
        .from('tournaments')
        .update(updatePayload as never)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Tournament;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: ['my-tournaments'] });
    },
  });
}

// Delete tournament
export function useDeleteTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('tournament_matches').delete().eq('tournament_id', id);
      await supabase.from('roster_changes').delete().eq('tournament_id', id);
      await supabase.from('tournament_invitations').delete().eq('tournament_id', id);

      const { data: registrations } = await supabase
        .from('tournament_registrations')
        .select('tournament_squad_id')
        .eq('tournament_id', id);

      await supabase.from('tournament_registrations').delete().eq('tournament_id', id);

      if (registrations && registrations.length > 0) {
        const squadIds = registrations.map(r => r.tournament_squad_id);
        await supabase.from('tournament_squad_members').delete().in('tournament_squad_id', squadIds);
        await supabase.from('tournament_squads').delete().in('id', squadIds);
      }

      const { error } = await supabase.from('tournaments').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
      queryClient.invalidateQueries({ queryKey: ['my-tournaments'] });
    },
  });
}
