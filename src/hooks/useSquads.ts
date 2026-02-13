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
  server?: ServerId;
  member_count?: number;
  max_members?: number;
  contacts?: { type: ContactTypeId; value: string }[];
  is_recruiting?: boolean;
}

export function useSquads() {
  return useQuery({
    queryKey: ['squads'],
    queryFn: async () => {
      // Fetch all squads (both recruiting and not)
      const { data: squads, error } = await supabase
        .from('squads')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Get member counts for all squads
      const squadIds = squads.map(s => s.id);
      const { data: memberCounts, error: countError } = await supabase
        .from('squad_members')
        .select('squad_id')
        .in('squad_id', squadIds);

      if (countError) throw countError;

      // Count members per squad
      const countMap: Record<string, number> = {};
      memberCounts?.forEach(m => {
        countMap[m.squad_id] = (countMap[m.squad_id] || 0) + 1;
      });

      // Merge counts into squads
      return squads.map(squad => ({
        ...squad,
        member_count: countMap[squad.id] || 0,
      })) as Squad[];
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
    mutationFn: async (input: SquadInput & { skipOwnerCheck?: boolean }) => {
      const { skipOwnerCheck, ...squad } = input;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if user already has a squad (skip for admins)
      if (!skipOwnerCheck) {
        const { data: existingSquads } = await supabase
          .from('squads')
          .select('id')
          .eq('owner_id', user.id);

        if (existingSquads && existingSquads.length > 0) {
          throw new Error('You can only create one squad. Please manage your existing squad.');
        }
      }

      // Check if user has a profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) {
        throw new Error('You must create a profile before creating a squad.');
      }

      // Create the squad
      const { data: squadData, error } = await supabase
        .from('squads')
        .insert({
          owner_id: user.id,
          server: 'sea',
          ...squad,
          contacts: squad.contacts || [],
        })
        .select()
        .single();
      
      if (error) throw error;

      // Add creator as leader in squad_members
      const { error: memberError } = await supabase
        .from('squad_members')
        .insert({
          squad_id: squadData.id,
          user_id: user.id,
          profile_id: profile.id,
          role: 'leader',
          position: 1,
        });

      if (memberError) {
        // If member creation fails, delete the squad
        await supabase.from('squads').delete().eq('id', squadData.id);
        throw memberError;
      }

      return squadData as Squad;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squads'] });
      queryClient.invalidateQueries({ queryKey: ['my-squads'] });
      queryClient.invalidateQueries({ queryKey: ['my-squad-membership'] });
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
          contacts: squad.contacts || undefined,
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

export function useDeleteSquad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First delete squad members
      const { error: membersError } = await supabase
        .from('squad_members')
        .delete()
        .eq('squad_id', id);
      
      if (membersError) throw membersError;

      // Then delete the squad
      const { error } = await supabase
        .from('squads')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squads'] });
      queryClient.invalidateQueries({ queryKey: ['my-squads'] });
      queryClient.invalidateQueries({ queryKey: ['my-squad-membership'] });
    },
  });
}
