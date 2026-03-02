import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { tournamentKeys } from './tournament/queryKeys';

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

// --- Tournaments ---

export function useAllTournaments() {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ['allTournaments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: isAdmin === true,
  });
}

export function useAdminTournamentStats() {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ['adminTournamentStats'],
    queryFn: async () => {
      const [tournamentsResult, matchesResult, registrationsResult] = await Promise.all([
        supabase.from('tournaments').select('id, status', { count: 'exact' }),
        supabase.from('tournament_matches').select('id', { count: 'exact' }),
        supabase.from('tournament_registrations').select('id', { count: 'exact' }),
      ]);

      const tournaments = tournamentsResult.data || [];
      const statusDistribution: Record<string, number> = {};
      tournaments.forEach(t => {
        const s = t.status || 'unknown';
        statusDistribution[s] = (statusDistribution[s] || 0) + 1;
      });

      return {
        totalTournaments: tournamentsResult.count || 0,
        totalMatches: matchesResult.count || 0,
        totalRegistrations: registrationsResult.count || 0,
        statusDistribution,
      };
    },
    enabled: isAdmin === true,
  });
}

export function useAdminDeleteTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Full cascade delete in FK order
      await supabase.from('tournament_audit_log').delete().eq('tournament_id', id);
      await supabase.from('match_drafts').delete().eq('tournament_id', id);
      await supabase.from('tournament_matches').delete().eq('tournament_id', id);
      await supabase.from('roster_changes').delete().eq('tournament_id', id);
      await supabase.from('tournament_invitations').delete().eq('tournament_id', id);
      await supabase.from('group_draws').delete().eq('tournament_id', id);

      // Stages, groups, group teams
      const { data: stages } = await supabase
        .from('tournament_stages')
        .select('id')
        .eq('tournament_id', id);
      if (stages && stages.length > 0) {
        const stageIds = stages.map(s => s.id);
        const { data: groups } = await supabase
          .from('tournament_groups')
          .select('id')
          .in('stage_id', stageIds);
        if (groups && groups.length > 0) {
          await supabase.from('tournament_group_teams').delete().in('group_id', groups.map(g => g.id));
          await supabase.from('tournament_groups').delete().in('stage_id', stageIds);
        }
        await supabase.from('tournament_stages').delete().eq('tournament_id', id);
      }

      // Registrations → squad members → squads
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
      queryClient.invalidateQueries({ queryKey: ['allTournaments'] });
      queryClient.invalidateQueries({ queryKey: ['adminTournamentStats'] });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
      queryClient.invalidateQueries({ queryKey: ['my-tournaments'] });
    },
  });
}

// --- Update mutations ---

export function useAdminUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

export function useAdminUpdateSquad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { error } = await supabase
        .from('squads')
        .update(updates)
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allSquads'] });
      queryClient.invalidateQueries({ queryKey: ['squads'] });
    },
  });
}

export function useAdminUpdateTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { error } = await supabase
        .from('tournaments')
        .update(updates)
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTournaments'] });
      queryClient.invalidateQueries({ queryKey: ['adminTournamentStats'] });
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });
}

// --- Ban / Unban ---

export function useAdminBanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ banned_at: new Date().toISOString(), looking_for_squad: false })
        .eq('id', profileId);

      if (error) throw new Error(error.message);

      // Remove from squad memberships
      await supabase.from('squad_members').delete().eq('profile_id', profileId);
      await supabase.from('squad_applications').delete().eq('applicant_id', profileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['squad-members'] });
    },
  });
}

export function useAdminUnbanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ banned_at: null })
        .eq('id', profileId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

// --- Role management ---

export function useAdminAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'moderator' | 'user' }) => {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role }, { onConflict: 'user_id,role' });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
    },
  });
}

export function useAdminRemoveRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'moderator' | 'user' }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
    },
  });
}

// --- Notifications ---

export function useAllNotifications() {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ['allNotifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: isAdmin === true,
  });
}

export function useAdminDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allNotifications'] });
    },
  });
}

export function useAdminSendNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userIds,
      title,
      body,
      type = 'info',
    }: {
      userIds: string[];
      title: string;
      body: string;
      type?: string;
    }) => {
      const rows = userIds.map(userId => ({
        user_id: userId,
        title,
        body,
        type,
        read: false,
      }));

      const { error } = await supabase.from('notifications').insert(rows);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allNotifications'] });
    },
  });
}
