import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MatchDraft {
  id: string;
  match_id: string;
  tournament_id: string;
  squad_a_bans: string[];
  squad_b_bans: string[];
  squad_a_ingame_bans: string[];
  squad_b_ingame_bans: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch draft for a specific match
export function useMatchDraft(matchId: string | undefined) {
  return useQuery({
    queryKey: ['match-draft', matchId],
    queryFn: async () => {
      if (!matchId) return null;
      const { data, error } = await supabase
        .from('match_drafts')
        .select('*')
        .eq('match_id', matchId)
        .maybeSingle();

      if (error) throw error;
      return data as MatchDraft | null;
    },
    enabled: !!matchId,
  });
}

// Fetch all drafts for a tournament
export function useTournamentDrafts(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['tournament-drafts', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const { data, error } = await supabase
        .from('match_drafts')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (error) throw error;
      return data as MatchDraft[];
    },
    enabled: !!tournamentId,
  });
}

// Save (upsert) draft for a match
export function useSaveMatchDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      tournamentId,
      squadABans,
      squadBBans,
      squadAIngameBans,
      squadBIngameBans,
      notes,
    }: {
      matchId: string;
      tournamentId: string;
      squadABans: string[];
      squadBBans: string[];
      squadAIngameBans: string[];
      squadBIngameBans: string[];
      notes: string | null;
    }) => {
      // Check if draft already exists
      const { data: existing } = await supabase
        .from('match_drafts')
        .select('id')
        .eq('match_id', matchId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('match_drafts')
          .update({
            squad_a_bans: squadABans,
            squad_b_bans: squadBBans,
            squad_a_ingame_bans: squadAIngameBans,
            squad_b_ingame_bans: squadBIngameBans,
            notes,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return { data, tournamentId, matchId };
      } else {
        const { data, error } = await supabase
          .from('match_drafts')
          .insert({
            match_id: matchId,
            tournament_id: tournamentId,
            squad_a_bans: squadABans,
            squad_b_bans: squadBBans,
            squad_a_ingame_bans: squadAIngameBans,
            squad_b_ingame_bans: squadBIngameBans,
            notes,
          })
          .select()
          .single();

        if (error) throw error;
        return { data, tournamentId, matchId };
      }
    },
    onSuccess: ({ tournamentId, matchId }) => {
      queryClient.invalidateQueries({ queryKey: ['match-draft', matchId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-drafts', tournamentId] });
    },
  });
}
