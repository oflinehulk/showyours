import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/lib/types';
import type { RankId, RoleId, HeroClassId, ServerId, ContactTypeId, StateId } from '@/lib/constants';

interface ProfileInput {
  ign: string;
  avatar_url?: string | null;
  rank: RankId;
  win_rate?: number | null;
  main_role: RoleId;
  hero_class: HeroClassId;
  favorite_heroes?: string[];
  server?: ServerId;
  state: StateId;
  bio?: string | null;
  looking_for_squad?: boolean;
  contacts?: { type: ContactTypeId; value: string }[];
  screenshots?: string[];
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('looking_for_squad', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useProfile(id: string) {
  return useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!id,
  });
}

export function useMyProfile() {
  return useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: ProfileInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          server: 'sea', // Always Asia for India
          ...profile,
          contacts: JSON.stringify(profile.contacts || []),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...profile }: Partial<ProfileInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...profile,
          contacts: profile.contacts ? JSON.stringify(profile.contacts) : undefined,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
  });
}
