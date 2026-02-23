import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AuditLogEntry } from '@/lib/tournament-types';

export function useAuditLog(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['audit-log', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];

      const { data, error } = await (supabase
        .from('tournament_audit_log' as any)
        .select('*') as any)
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as AuditLogEntry[];
    },
    enabled: !!tournamentId,
  });
}
