import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBulkUpdateMatchSchedule } from './useMatchScheduler';
import { autoScheduleMatches, type AvailabilitySlot, type MatchToSchedule } from '@/lib/scheduling-algorithm';
import type { TournamentMatch } from '@/lib/tournament-types';

// ---------- Public page hooks (token-based, no auth) ----------

export interface SchedulingContext {
  tournament_id: string;
  tournament_name: string;
  squad_id: string;
  squad_name: string;
  squad_logo: string | null;
  existing_slots: { date: string; time: string }[];
  matches: {
    id: string;
    round: number;
    match_number: number;
    group_id: string | null;
    scheduled_time: string | null;
    status: string;
    opponent_name: string | null;
  }[];
  submitted_at: string | null;
}

export function useSchedulingContext(token: string | undefined) {
  return useQuery({
    queryKey: ['scheduling-context', token],
    queryFn: async () => {
      if (!token) throw new Error('No token provided');

      const { data, error } = await supabase.rpc('rpc_get_scheduling_context', {
        p_token: token,
      });

      if (error) throw new Error(error.message);
      return data as unknown as SchedulingContext;
    },
    enabled: !!token,
    retry: false,
  });
}

export function useSubmitAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      token,
      slots,
    }: {
      token: string;
      slots: { date: string; time: string }[];
    }) => {
      const { data, error } = await supabase.rpc('rpc_submit_availability', {
        p_token: token,
        p_slots: slots as unknown as Record<string, unknown>,
      });

      if (error) throw new Error(error.message);
      return data as unknown as { success: boolean; squad_name: string };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scheduling-context', variables.token] });
    },
  });
}

// ---------- Host dashboard hooks (authenticated) ----------

export interface SchedulingToken {
  id: string;
  tournament_id: string;
  tournament_squad_id: string;
  token: string;
  created_at: string;
  expires_at: string | null;
}

export interface SchedulingSubmission {
  id: string;
  tournament_id: string;
  tournament_squad_id: string;
  submitted_at: string;
  updated_at: string;
}

export function useSchedulingTokens(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['scheduling-tokens', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];

      const { data, error } = await supabase
        .from('scheduling_tokens')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (error) throw new Error(error.message);
      return data as SchedulingToken[];
    },
    enabled: !!tournamentId,
  });
}

export function useSchedulingSubmissions(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['scheduling-submissions', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];

      const { data, error } = await supabase
        .from('scheduling_submissions')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (error) throw new Error(error.message);
      return data as SchedulingSubmission[];
    },
    enabled: !!tournamentId,
  });
}

export function useGenerateSchedulingTokens() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tournamentId,
      squadIds,
    }: {
      tournamentId: string;
      squadIds: string[];
    }) => {
      // Insert tokens for all squads (ignore conflicts from existing ones)
      const rows = squadIds.map((squadId) => ({
        tournament_id: tournamentId,
        tournament_squad_id: squadId,
      }));

      const { error } = await supabase
        .from('scheduling_tokens')
        .upsert(rows, { onConflict: 'tournament_id,tournament_squad_id', ignoreDuplicates: true });

      if (error) throw new Error(error.message);
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: ['scheduling-tokens', tournamentId] });
    },
  });
}

export function useSquadAvailability(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['squad-availability', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];

      const { data, error } = await supabase
        .from('squad_availability')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (error) throw new Error(error.message);
      return data as {
        id: string;
        tournament_id: string;
        tournament_squad_id: string;
        available_date: string;
        slot_time: string;
      }[];
    },
    enabled: !!tournamentId,
  });
}

export function useAutoScheduleMatches() {
  const bulkUpdate = useBulkUpdateMatchSchedule();

  return useMutation({
    mutationFn: async ({
      tournamentId,
      matches,
      availabilityData,
      gapMinutes,
    }: {
      tournamentId: string;
      matches: TournamentMatch[];
      availabilityData: {
        tournament_squad_id: string;
        available_date: string;
        slot_time: string;
      }[];
      gapMinutes: number;
    }) => {
      // Build availability map
      const availMap = new Map<string, AvailabilitySlot[]>();
      for (const row of availabilityData) {
        const squadId = row.tournament_squad_id;
        if (!availMap.has(squadId)) availMap.set(squadId, []);
        availMap.get(squadId)!.push({
          date: row.available_date,
          time: row.slot_time.slice(0, 5), // "HH:MM:SS" -> "HH:MM"
        });
      }

      // Convert matches to algorithm format
      const matchInputs: MatchToSchedule[] = matches.map((m) => ({
        id: m.id,
        round: m.round,
        match_number: m.match_number,
        squad_a_id: m.squad_a_id,
        squad_b_id: m.squad_b_id,
        scheduled_time: m.scheduled_time,
      }));

      // Run algorithm
      const result = autoScheduleMatches(matchInputs, availMap, gapMinutes);

      // Persist scheduled matches
      if (result.scheduled.length > 0) {
        await bulkUpdate.mutateAsync({
          updates: result.scheduled.map((s) => ({
            matchId: s.matchId,
            scheduledTime: s.scheduledTime,
          })),
          tournamentId,
        });
      }

      return result;
    },
  });
}
