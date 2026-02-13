import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SquadInvitation {
  id: string;
  squad_id: string;
  invited_profile_id: string;
  invited_user_id: string;
  invited_by: string;
  message: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  // Joined data
  squad?: { id: string; name: string; logo_url: string | null };
  profile?: { id: string; ign: string; avatar_url: string | null; rank: string };
}

// Get invitations sent to the current user
export function useMyInvitations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-invitations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('squad_invitations')
        .select('*, squad:squads(id, name, logo_url)')
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SquadInvitation[];
    },
    enabled: !!user,
  });
}

// Get invitations sent by a squad (for leaders)
export function useSquadSentInvitations(squadId: string | undefined) {
  return useQuery({
    queryKey: ['squad-invitations', squadId],
    queryFn: async () => {
      if (!squadId) return [];
      const { data, error } = await supabase
        .from('squad_invitations')
        .select('*, profile:profiles!squad_invitations_invited_profile_id_fkey(id, ign, avatar_url, rank)')
        .eq('squad_id', squadId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SquadInvitation[];
    },
    enabled: !!squadId,
  });
}

// Send invitation
export function useSendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ squadId, profileId, userId, message }: { 
      squadId: string; profileId: string; userId: string; message?: string 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('squad_invitations')
        .insert({
          squad_id: squadId,
          invited_profile_id: profileId,
          invited_user_id: userId,
          invited_by: user.id,
          message: message || null,
        })
        .select()
        .single();
      if (error) {
        if (error.code === '23505') throw new Error('Invitation already sent to this player');
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
    },
  });
}

// Respond to invitation (accept/reject)
export function useRespondToInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invitationId, response, squadId, profileId, userId }: {
      invitationId: string; response: 'accepted' | 'rejected';
      squadId?: string; profileId?: string; userId?: string;
    }) => {
      // Update invitation status
      const { error } = await supabase
        .from('squad_invitations')
        .update({ status: response })
        .eq('id', invitationId);
      if (error) throw error;

      // If accepted, add player to squad
      if (response === 'accepted' && squadId && profileId && userId) {
        // Get next position
        const { data: members } = await supabase
          .from('squad_members')
          .select('position')
          .eq('squad_id', squadId)
          .order('position', { ascending: false })
          .limit(1);
        
        const nextPosition = (members?.[0]?.position || 0) + 1;

        const { error: memberError } = await supabase
          .from('squad_members')
          .insert({
            squad_id: squadId,
            user_id: userId,
            profile_id: profileId,
            role: 'member',
            position: nextPosition,
          });
        if (memberError) throw memberError;

        // Update looking_for_squad
        await supabase
          .from('profiles')
          .update({ looking_for_squad: false })
          .eq('id', profileId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['squad-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['squad-members'] });
      queryClient.invalidateQueries({ queryKey: ['squads'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['my-squad-membership'] });
    },
  });
}

// Cancel invitation (for leaders)
export function useCancelInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('squad_invitations')
        .delete()
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
    },
  });
}
