import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SquadMemberRole = 'leader' | 'co_leader' | 'member';

export interface SquadMember {
  id: string;
  squad_id: string;
  user_id: string;
  profile_id: string;
  role: SquadMemberRole;
  position: number;
  joined_at: string;
  // Joined profile data
  profile?: {
    id: string;
    user_id: string;
    ign: string;
    mlbb_id: string | null;
    avatar_url: string | null;
    rank: string;
    main_role: string;
    contacts: any;
  };
}

export interface SearchedProfile {
  id: string;
  user_id: string;
  ign: string;
  mlbb_id: string | null;
  avatar_url: string | null;
  rank: string;
  main_role: string;
  contacts: any;
}

// Get squad members with profile info
export function useSquadMembers(squadId: string | undefined) {
  return useQuery({
    queryKey: ['squad-members', squadId],
    queryFn: async () => {
      if (!squadId) return [];

      const { data, error } = await supabase
        .from('squad_members')
        .select(`
          *,
          profile:profiles(
            id, user_id, ign, mlbb_id, avatar_url, rank, main_role, contacts
          )
        `)
        .eq('squad_id', squadId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as SquadMember[];
    },
    enabled: !!squadId,
  });
}

// Get my squad membership (to check if user is in a squad)
export function useMySquadMembership() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-squad-membership', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('squad_members')
        .select(`
          *,
          squad:squads(*)
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Search profiles by IGN, MLBB ID, or WhatsApp
// Modes:
// - default: only players looking for squad and not in any squad (for "Find Players" page)
// - forTournament: all registered players (for tournament searches)
// - addToSquad: all registered players except those in target squad (for squad owners adding teammates)
export function useSearchProfiles(
  searchTerm: string, 
  excludeSquadId?: string, 
  forTournament: boolean = false,
  addToSquad: boolean = false
) {
  return useQuery({
    queryKey: ['search-profiles', searchTerm, excludeSquadId, forTournament, addToSquad],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];

      const { data, error } = await supabase
        .rpc('search_profiles', {
          search_term: searchTerm,
          exclude_squad_id: excludeSquadId || null,
          for_tournament: forTournament,
          add_to_squad: addToSquad,
        });

      if (error) throw error;
      return data as SearchedProfile[];
    },
    enabled: searchTerm.length >= 2,
  });
}

// Add member to squad
export function useAddSquadMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      squadId,
      profileId,
      userId,
      role = 'member',
      position,
    }: {
      squadId: string;
      profileId: string;
      userId: string;
      role?: SquadMemberRole;
      position?: number;
    }) => {
      // Check if user is already in a squad
      const { data: existingMembership } = await supabase
        .from('squad_members')
        .select('id, squad_id')
        .eq('user_id', userId)
        .limit(1);

      if (existingMembership && existingMembership.length > 0) {
        throw new Error('This player is already in a squad. A player can only be in one squad at a time.');
      }

      // Get current member count for position
      const { data: existing } = await supabase
        .from('squad_members')
        .select('position')
        .eq('squad_id', squadId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = position ?? ((existing?.[0]?.position || 0) + 1);

      const { data, error } = await supabase
        .from('squad_members')
        .insert({
          squad_id: squadId,
          profile_id: profileId,
          user_id: userId,
          role,
          position: nextPosition,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['squad-members', variables.squadId] });
      queryClient.invalidateQueries({ queryKey: ['my-squad-membership'] });
    },
  });
}

// Update member role
export function useUpdateSquadMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      squadId,
      role,
    }: {
      memberId: string;
      squadId: string;
      role: SquadMemberRole;
    }) => {
      const { data, error } = await supabase
        .from('squad_members')
        .update({ role })
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['squad-members', variables.squadId] });
    },
  });
}

// Remove member from squad
export function useRemoveSquadMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      squadId,
    }: {
      memberId: string;
      squadId: string;
    }) => {
      const { error } = await supabase
        .from('squad_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['squad-members', variables.squadId] });
      queryClient.invalidateQueries({ queryKey: ['my-squad-membership'] });
    },
  });
}

// Leave squad
export function useLeaveSquad() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (squadId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('squad_members')
        .delete()
        .eq('squad_id', squadId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, squadId) => {
      queryClient.invalidateQueries({ queryKey: ['squad-members', squadId] });
      queryClient.invalidateQueries({ queryKey: ['my-squad-membership'] });
      queryClient.invalidateQueries({ queryKey: ['my-squads'] });
    },
  });
}
