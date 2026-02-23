import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SquadApplication {
  id: string;
  squad_id: string;
  applicant_id: string;
  user_id: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  // Joined data
  applicant?: {
    id: string;
    user_id: string;
    ign: string;
    mlbb_id: string | null;
    avatar_url: string | null;
    rank: string;
    main_role: string;
    contacts: any;
  };
  squad?: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

// Get applications for a squad (for leaders)
export function useSquadApplications(squadId: string | undefined) {
  return useQuery({
    queryKey: ['squad-applications', squadId],
    queryFn: async () => {
      if (!squadId) return [];

      const { data, error } = await supabase
        .from('squad_applications')
        .select(`
          *,
          applicant:profiles!squad_applications_applicant_id_fkey(
            id, user_id, ign, mlbb_id, avatar_url, rank, main_role, contacts
          )
        `)
        .eq('squad_id', squadId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SquadApplication[];
    },
    enabled: !!squadId,
  });
}

// Get my applications (for players)
export function useMyApplications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-applications', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('squad_applications')
        .select(`
          *,
          squad:squads!squad_applications_squad_id_fkey(
            id, name, logo_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SquadApplication[];
    },
    enabled: !!user,
  });
}

// Check if user has pending application to a squad
export function useHasPendingApplication(squadId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-application', squadId, user?.id],
    queryFn: async () => {
      if (!user || !squadId) return false;

      const { data, error } = await supabase
        .from('squad_applications')
        .select('id')
        .eq('squad_id', squadId)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!squadId,
  });
}

// Apply to a squad
export function useApplyToSquad() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      squadId,
      applicantId,
      message,
    }: {
      squadId: string;
      applicantId: string;
      message?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('squad_applications')
        .insert({
          squad_id: squadId,
          applicant_id: applicantId,
          user_id: user.id,
          message: message || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      queryClient.invalidateQueries({ queryKey: ['pending-application', variables.squadId] });
      queryClient.invalidateQueries({ queryKey: ['squad-applications', variables.squadId] });
    },
  });
}

// Withdraw application
export function useWithdrawApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase
        .from('squad_applications')
        .delete()
        .eq('id', applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      queryClient.invalidateQueries({ queryKey: ['pending-application'] });
      queryClient.invalidateQueries({ queryKey: ['squad-applications'] });
    },
  });
}

// Approve application (leader action)
export function useApproveApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      squadId,
      applicantId,
      userId,
    }: {
      applicationId: string;
      squadId: string;
      applicantId: string;
      userId: string;
    }) => {
      // Check if user is already in a squad
      const { data: existingMembership } = await supabase
        .from('squad_members')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (existingMembership && existingMembership.length > 0) {
        throw new Error('This player is already in a squad. A player can only be in one squad at a time.');
      }

      // First, add member to squad
      const { data: existing } = await supabase
        .from('squad_members')
        .select('position')
        .eq('squad_id', squadId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = (existing?.[0]?.position || 0) + 1;

      const { error: memberError } = await supabase
        .from('squad_members')
        .insert({
          squad_id: squadId,
          profile_id: applicantId,
          user_id: userId,
          role: 'member',
          position: nextPosition,
        });

      if (memberError) throw memberError;

      // Auto-hide player from recruitment listings
      await supabase
        .from('profiles')
        .update({ looking_for_squad: false })
        .eq('id', applicantId);

      // Then update application status
      const { error: updateError } = await supabase
        .from('squad_applications')
        .update({ status: 'approved' })
        .eq('id', applicationId);

      if (updateError) throw updateError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['squad-applications', variables.squadId] });
      queryClient.invalidateQueries({ queryKey: ['squad-members', variables.squadId] });
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      queryClient.invalidateQueries({ queryKey: ['my-squad-membership'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

// Reject application (leader action)
export function useRejectApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      squadId,
    }: {
      applicationId: string;
      squadId: string;
    }) => {
      const { error } = await supabase
        .from('squad_applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['squad-applications', variables.squadId] });
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
    },
  });
}
