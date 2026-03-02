import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { tournamentKeys } from './queryKeys';

// Standard bracket seeding placement (1v16, 8v9, 4v13, 5v12, etc.)
// Returns full bracket-sized array with nulls in correct bye positions so the
// bracket generator places byes next to top seeds, not at the end.
export function applyStandardSeeding(seededIds: string[]): (string | null)[] {
  const n = seededIds.length;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));

  const seedOrder = generateSeedOrder(bracketSize);
  return seedOrder.map(seedIndex => seedIndex < n ? seededIds[seedIndex] : null);
}

// Generate standard tournament seed order for bracket placement
export function generateSeedOrder(size: number): number[] {
  if (size === 1) return [0];
  if (size === 2) return [0, 1];

  const half = generateSeedOrder(size / 2);
  const result: number[] = [];
  for (const seed of half) {
    result.push(seed);
    result.push(size - 1 - seed);
  }
  return result;
}

export function useUpdateRegistrationSeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      registrationId,
      seed,
      tournamentId,
    }: {
      registrationId: string;
      seed: number | null;
      tournamentId: string;
    }) => {
      const { error } = await supabase
        .from('tournament_registrations')
        .update({ seed })
        .eq('id', registrationId);

      if (error) throw new Error(error.message);
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.registrations(tournamentId) });
    },
  });
}

export function useAutoSeedByRegistrationOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tournamentId: string) => {
      const { data: registrations, error: fetchError } = await supabase
        .from('tournament_registrations')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('status', 'approved')
        .order('registered_at', { ascending: true });

      if (fetchError) throw new Error(fetchError.message);

      // Update each registration with sequential seed
      for (let i = 0; i < registrations.length; i++) {
        const { error } = await supabase
          .from('tournament_registrations')
          .update({ seed: i + 1 })
          .eq('id', registrations[i].id);
        if (error) throw new Error(error.message);
      }

      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.registrations(tournamentId) });
    },
  });
}
