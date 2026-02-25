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

      if (error) throw new Error(error.message);
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

      if (error) throw new Error(error.message);
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
      const { error: membersErr } = await supabase
        .from('squad_members')
        .delete()
        .eq('profile_id', profileId);
      if (membersErr) throw new Error(membersErr.message);

      // Clean up squad applications
      const { error: appsErr } = await supabase
        .from('squad_applications')
        .delete()
        .eq('applicant_id', profileId);
      if (appsErr) throw new Error(appsErr.message);

      // Clean up squad invitations
      const { error: invErr } = await supabase
        .from('squad_invitations')
        .delete()
        .eq('invited_profile_id', profileId);
      if (invErr) throw new Error(invErr.message);

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw new Error(error.message);
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
      const { error: appsErr } = await supabase
        .from('squad_applications')
        .delete()
        .eq('squad_id', squadId);
      if (appsErr) throw new Error(appsErr.message);

      const { error: invErr } = await supabase
        .from('squad_invitations')
        .delete()
        .eq('squad_id', squadId);
      if (invErr) throw new Error(invErr.message);

      const { error: membersErr } = await supabase
        .from('squad_members')
        .delete()
        .eq('squad_id', squadId);
      if (membersErr) throw new Error(membersErr.message);

      const { error } = await supabase
        .from('squads')
        .delete()
        .eq('id', squadId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allSquads'] });
      queryClient.invalidateQueries({ queryKey: ['squads'] });
      queryClient.invalidateQueries({ queryKey: ['squad-members'] });
      queryClient.invalidateQueries({ queryKey: ['my-squad-membership'] });
    },
  });
}

export function useAdminUserEmails() {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ['adminUserEmails'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_user_emails');
      if (error) throw new Error(error.message);
      const map: Record<string, string> = {};
      (data || []).forEach((row: { user_id: string; email: string }) => {
        map[row.user_id] = row.email;
      });
      return map;
    },
    enabled: isAdmin === true,
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
