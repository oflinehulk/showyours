import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useIsAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['isAdmin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });
      
      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }
      
      return data === true;
    },
    enabled: !!user?.id,
  });
}

export function useAllProfiles() {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ['allProfiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });
}

export function useAllSquads() {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ['allSquads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('squads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });
}

export function useAdminDeleteProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      // Clean up squad memberships first
      await supabase
        .from('squad_members')
        .delete()
        .eq('profile_id', profileId);

      // Clean up squad applications
      await supabase
        .from('squad_applications')
        .delete()
        .eq('applicant_id', profileId);

      // Clean up squad invitations
      await supabase
        .from('squad_invitations')
        .delete()
        .eq('invited_profile_id', profileId);

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['squad-members'] });
      queryClient.invalidateQueries({ queryKey: ['my-squad-membership'] });
    },
  });
}

export function useAdminDeleteSquad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (squadId: string) => {
      // Clean up in correct order (FK constraints)
      await supabase
        .from('squad_applications')
        .delete()
        .eq('squad_id', squadId);

      await supabase
        .from('squad_invitations')
        .delete()
        .eq('squad_id', squadId);

      await supabase
        .from('squad_members')
        .delete()
        .eq('squad_id', squadId);

      const { error } = await supabase
        .from('squads')
        .delete()
        .eq('id', squadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allSquads'] });
      queryClient.invalidateQueries({ queryKey: ['squads'] });
      queryClient.invalidateQueries({ queryKey: ['squad-members'] });
      queryClient.invalidateQueries({ queryKey: ['my-squad-membership'] });
    },
  });
}

export function useAdminStats() {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const [profilesResult, squadsResult] = await Promise.all([
        supabase.from('profiles').select('id, looking_for_squad, state, rank', { count: 'exact' }),
        supabase.from('squads').select('id, is_recruiting, server', { count: 'exact' }),
      ]);

      const profiles = profilesResult.data || [];
      const squads = squadsResult.data || [];

      const lookingForSquad = profiles.filter(p => p.looking_for_squad).length;
      const recruitingSquads = squads.filter(s => s.is_recruiting).length;

      // State distribution
      const stateDistribution: Record<string, number> = {};
      profiles.forEach(p => {
        const state = p.state || 'Unknown';
        stateDistribution[state] = (stateDistribution[state] || 0) + 1;
      });

      // Rank distribution
      const rankDistribution: Record<string, number> = {};
      profiles.forEach(p => {
        const rank = p.rank || 'Unknown';
        rankDistribution[rank] = (rankDistribution[rank] || 0) + 1;
      });

      return {
        totalProfiles: profilesResult.count || 0,
        totalSquads: squadsResult.count || 0,
        lookingForSquad,
        recruitingSquads,
        stateDistribution,
        rankDistribution,
      };
    },
    enabled: isAdmin === true,
  });
}
