import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/lib/types';
import type { RankId, RoleId, HeroClassId, ServerId, ContactTypeId, StateId } from '@/lib/constants';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

interface ProfileInput {
  ign: string;
  avatar_url?: string | null;
  rank: RankId;
  win_rate?: number | null;
  main_role: RoleId;
  main_roles?: string[];
  hero_class: HeroClassId;
  favorite_heroes?: string[];
  server?: ServerId;
  state: StateId;
  bio?: string | null;
  looking_for_squad?: boolean;
  contacts?: { type: ContactTypeId; value: string }[];
  screenshots?: string[];
  mlbb_id?: string | null;
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      // Get users already in a squad
      const { data: squadMembers } = await supabase
        .from('squad_members')
        .select('user_id');
      const inSquadUserIds = new Set((squadMembers || []).map(m => m.user_id));

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('looking_for_squad', true)
        .order('created_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      // Exclude players already in a squad
      return (data as Profile[]).filter(p => !inSquadUserIds.has(p.user_id));
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
      
      if (error) throw new Error(error.message);
      return data as Profile | null;
    },
    enabled: !!id,
  });
}

export function useMyProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data as Profile | null;
    },
    enabled: !!user,
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
          main_roles: profile.main_roles || [profile.main_role],
          contacts: profile.contacts || [],
          mlbb_id: profile.mlbb_id || null,
        } as TablesInsert<'profiles'>)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
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
      const updateData: TablesUpdate<'profiles'> = {
        ...profile,
        contacts: profile.contacts as TablesUpdate<'profiles'>['contacts'],
      };

      if (profile.main_roles) {
        updateData.main_roles = profile.main_roles;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
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
      // Check if player is in a squad
      const { data: membership } = await supabase
        .from('squad_members')
        .select('id, squad_id')
        .eq('profile_id', id)
        .limit(1);

      if (membership && membership.length > 0) {
        throw new Error('You must leave your squad before deleting your profile.');
      }

      // Clean up applications and invitations
      const { error: appsErr } = await supabase
        .from('squad_applications')
        .delete()
        .eq('applicant_id', id);
      if (appsErr) throw new Error(appsErr.message);

      const { error: invErr } = await supabase
        .from('squad_invitations')
        .delete()
        .eq('invited_profile_id', id);
      if (invErr) throw new Error(invErr.message);

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
  });
}
