import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

/** Normalize MLBB IDs by extracting the leading numeric ID (e.g., "123456789(2451)" -> "123456789") */
export function normalizeMlbbId(raw: string | null | undefined): string {
  if (!raw) return '';
  const match = raw.trim().match(/^(\d+)/);
  return match?.[1] ?? '';
}

/** Check if an MLBB ID is already used in any squad (handles server suffix formats) */
async function checkMlbbIdDuplicate(mlbbId: string, excludeSquadId?: string): Promise<{ isDuplicate: boolean; squadName?: string }> {
  const cleanId = normalizeMlbbId(mlbbId);
  if (!cleanId) return { isDuplicate: false };

  const { data: allMembers } = await supabase
    .from('squad_members')
    .select('id, squad_id, mlbb_id, ign')
    .not('mlbb_id', 'is', null);

  if (!allMembers) return { isDuplicate: false };

  const match = allMembers.find(m => {
    const memberCleanId = normalizeMlbbId(m.mlbb_id);
    return memberCleanId === cleanId && (!excludeSquadId || m.squad_id !== excludeSquadId);
  });

  if (!match) return { isDuplicate: false };

  const { data: squad } = await supabase
    .from('squads')
    .select('name')
    .eq('id', match.squad_id)
    .single();

  return { isDuplicate: true, squadName: squad?.name || 'another squad' };
}

/** Check if an IGN is used in any other squad (for warning) */
async function checkIgnDuplicate(ign: string, excludeSquadId?: string): Promise<{ isDuplicate: boolean; squadName?: string }> {
  if (!ign) return { isDuplicate: false };

  const { data: members } = await supabase
    .from('squad_members')
    .select('id, squad_id, ign')
    .ilike('ign', ign);

  if (!members) return { isDuplicate: false };

  const match = members.find(m =>
    m.ign?.toLowerCase() === ign.toLowerCase() && (!excludeSquadId || m.squad_id !== excludeSquadId)
  );

  if (!match) return { isDuplicate: false };

  const { data: squad } = await supabase
    .from('squads')
    .select('name')
    .eq('id', match.squad_id)
    .single();

  return { isDuplicate: true, squadName: squad?.name || 'another squad' };
}

export type SquadMemberRole = 'leader' | 'co_leader' | 'member';

export interface SquadMember {
  id: string;
  squad_id: string;
  user_id: string | null;
  profile_id: string | null;
  role: SquadMemberRole;
  position: number;
  joined_at: string;
  // Manual member fields
  ign: string | null;
  mlbb_id: string | null;
  whatsapp: string | null;
  // Joined profile data (null for manual members)
  profile?: {
    id: string;
    user_id: string;
    ign: string;
    mlbb_id: string | null;
    avatar_url: string | null;
    rank: string;
    main_role: string;
    contacts: Json | null;
  } | null;
}

export interface SearchedProfile {
  id: string;
  user_id: string;
  ign: string;
  mlbb_id: string | null;
  avatar_url: string | null;
  rank: string;
  main_role: string;
  contacts: Json | null;
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

      if (error) throw new Error(error.message);
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

      if (error) throw new Error(error.message);
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
          exclude_squad_id: excludeSquadId,
          for_tournament: forTournament,
          add_to_squad: addToSquad,
        });

      if (error) throw new Error(error.message);
      return data as SearchedProfile[];
    },
    enabled: searchTerm.length >= 2,
  });
}

// Add member to squad (registered player)
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
        const { data: sq } = await supabase.from('squads').select('name').eq('id', existingMembership[0].squad_id).single();
        throw new Error(`This player is already in "${sq?.name || 'another squad'}". A player can only be in one squad at a time.`);
      }

      // Also check if their MLBB ID (normalized) is used by a manual member
      const { data: profile } = await supabase.from('profiles').select('mlbb_id').eq('id', profileId).single();
      const cleanId = normalizeMlbbId(profile?.mlbb_id);
      if (cleanId) {
        const { isDuplicate, squadName } = await checkMlbbIdDuplicate(cleanId, squadId);
        if (isDuplicate) {
          throw new Error(`A player with this MLBB ID is already in "${squadName}".`);
        }
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

      if (error) {
        if (error.message?.includes('unique_squad_member')) {
          throw new Error('This player is already in a squad. A player can only be in one squad at a time.');
        }
        throw new Error(error.message);
      }

      // Auto-hide player from recruitment listings when they join a squad
      await supabase
        .from('profiles')
        .update({ looking_for_squad: false })
        .eq('id', profileId);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['squad-members', variables.squadId] });
      queryClient.invalidateQueries({ queryKey: ['my-squad-membership'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
  });
}

// Add manual member (not registered on platform)
export function useAddManualSquadMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      squadId,
      ign,
      mlbbId,
      whatsapp,
      role = 'member',
    }: {
      squadId: string;
      ign: string;
      mlbbId: string;
      whatsapp?: string;
      role?: SquadMemberRole;
    }) => {
      const cleanMlbbId = normalizeMlbbId(mlbbId);

      // Smart MLBB ID duplicate check (handles server suffix)
      if (cleanMlbbId) {
        const { isDuplicate, squadName } = await checkMlbbIdDuplicate(cleanMlbbId, squadId);
        if (isDuplicate) {
          throw new Error(`A player with this MLBB ID is already in "${squadName}". Each player can only be in one squad at a time.`);
        }

        // Also check registered profiles with normalized mlbb_id
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, user_id, mlbb_id')
          .not('mlbb_id', 'is', null);

        const matchedProfile = profiles?.find(p => normalizeMlbbId(p.mlbb_id) === cleanMlbbId);
        if (matchedProfile?.user_id) {
          const { data: existingMembership } = await supabase
            .from('squad_members')
            .select('id, squad_id')
            .eq('user_id', matchedProfile.user_id)
            .limit(1);

          if (existingMembership && existingMembership.length > 0) {
            const { data: sq } = await supabase.from('squads').select('name').eq('id', existingMembership[0].squad_id).single();
            throw new Error(`A registered player with this MLBB ID is already in "${sq?.name || 'another squad'}".`);
          }
        }
      }

      // IGN warning check (returned as part of result, not blocking)
      let ignWarning: string | undefined;
      if (ign) {
        const { isDuplicate, squadName } = await checkIgnDuplicate(ign, squadId);
        if (isDuplicate) {
          ignWarning = `Note: A player named "${ign}" already exists in "${squadName}". Make sure this isn't the same person.`;
        }
      }

      // Get current member count for position
      const { data: existing } = await supabase
        .from('squad_members')
        .select('position')
        .eq('squad_id', squadId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = (existing?.[0]?.position || 0) + 1;

      const { data, error } = await supabase
        .from('squad_members')
        .insert({
          squad_id: squadId,
          profile_id: null,
          user_id: null,
          ign,
          mlbb_id: cleanMlbbId || null, // Store normalized ID
          whatsapp: whatsapp || null,
          role,
          position: nextPosition,
        })
        .select()
        .single();

      if (error) {
        if (error.message?.includes('unique_squad_member_mlbb_id')) {
          throw new Error('A player with this MLBB ID is already in a squad. Each player can only be in one squad at a time.');
        }
        throw new Error(error.message);
      }
      return { ...data, ignWarning };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['squad-members', variables.squadId] });
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

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['squad-members', variables.squadId] });
    },
  });
}

// Transfer leadership to another member
export function useTransferLeadership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      squadId,
      newLeaderMemberId,
      oldLeaderMemberId,
      oldLeaderNewRole,
    }: {
      squadId: string;
      newLeaderMemberId: string;
      oldLeaderMemberId: string;
      oldLeaderNewRole: 'co_leader' | 'member';
    }) => {
      // Promote the new leader
      const { error: promoteError } = await supabase
        .from('squad_members')
        .update({ role: 'leader' })
        .eq('id', newLeaderMemberId);

      if (promoteError) throw new Error(promoteError.message);

      // Update squad owner_id to the new leader's user_id
      const { data: newLeaderData } = await supabase
        .from('squad_members')
        .select('user_id')
        .eq('id', newLeaderMemberId)
        .single();

      if (newLeaderData?.user_id) {
        await supabase
          .from('squads')
          .update({ owner_id: newLeaderData.user_id })
          .eq('id', squadId);
      }

      // Demote the old leader
      const { error: demoteError } = await supabase
        .from('squad_members')
        .update({ role: oldLeaderNewRole })
        .eq('id', oldLeaderMemberId);

      if (demoteError) throw new Error(demoteError.message);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['squad-members', variables.squadId] });
      queryClient.invalidateQueries({ queryKey: ['my-squad-membership'] });
      queryClient.invalidateQueries({ queryKey: ['my-squads'] });
      queryClient.invalidateQueries({ queryKey: ['squads'] });
    },
  });
}

// Remove member from squad
export function useRemoveSquadMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      profileId,
      squadId,
    }: {
      memberId: string;
      profileId?: string | null;
      squadId: string;
    }) => {
      const { error } = await supabase
        .from('squad_members')
        .delete()
        .eq('id', memberId);

      if (error) throw new Error(error.message);

      // Re-enable recruitment visibility for kicked members (same as leave)
      if (profileId) {
        await supabase
          .from('profiles')
          .update({ looking_for_squad: true })
          .eq('id', profileId);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['squad-members', variables.squadId] });
      queryClient.invalidateQueries({ queryKey: ['my-squad-membership'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
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

      // Get the member's profile_id before leaving
      const { data: membership } = await supabase
        .from('squad_members')
        .select('profile_id')
        .eq('squad_id', squadId)
        .eq('user_id', user.id)
        .maybeSingle();

      const { error } = await supabase
        .from('squad_members')
        .delete()
        .eq('squad_id', squadId)
        .eq('user_id', user.id);

      if (error) throw new Error(error.message);

      // Re-enable recruitment visibility after leaving
      if (membership?.profile_id) {
        await supabase
          .from('profiles')
          .update({ looking_for_squad: true })
          .eq('id', membership.profile_id);
      }
    },
    onSuccess: (_, squadId) => {
      queryClient.invalidateQueries({ queryKey: ['squad-members', squadId] });
      queryClient.invalidateQueries({ queryKey: ['my-squad-membership'] });
      queryClient.invalidateQueries({ queryKey: ['my-squads'] });
    },
  });
}
