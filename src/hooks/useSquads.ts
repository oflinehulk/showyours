import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Squad } from '@/lib/types';
import type { RankId, RoleId, ServerId, ContactTypeId } from '@/lib/constants';

interface SquadInput {
  name: string;
  logo_url?: string | null;
  description?: string | null;
  min_rank: RankId;
  needed_roles?: RoleId[];
  server: ServerId;
  member_count?: number;
  contacts?: { type: ContactTypeId; value: string }[];
  is_recruiting?: boolean;
}

export function useSquads() {
  return useQuery({
    queryKey: ['squads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('squads')
        .select('*')
        .eq('is_recruiting', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Squad[];
    },
  });
}

export function useSquad(id: string) {
  return useQuery({
    queryKey: ['squad', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('squads')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Squad | null;
    },
    enabled: !!id,
  });
}

export function useMySquads() {
  return useQuery({
    queryKey: ['my-squads'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('squads')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Squad[];
    },
  });
}

export function useCreateSquad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (squad: SquadInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('squads')
        .insert({
          owner_id: user.id,
          ...squad,
          contacts: JSON.stringify(squad.contacts || []),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Squad;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squads'] });
      queryClient.invalidateQueries({ queryKey: ['my-squads'] });
    },
  });
}

export function useUpdateSquad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...squad }: Partial<SquadInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('squads')
        .update({
          ...squad,
          contacts: squad.contacts ? JSON.stringify(squad.contacts) : undefined,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Squad;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['squads'] });
      queryClient.invalidateQueries({ queryKey: ['squad', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['my-squads'] });
    },
  });
}
