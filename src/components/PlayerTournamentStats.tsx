import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GlowCard } from '@/components/tron/GlowCard';
import { Badge } from '@/components/ui/badge';
import { Trophy, Swords, Target, Medal } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PlayerTournamentStatsProps {
  userId: string;
}

interface TournamentParticipation {
  tournamentId: string;
  tournamentName: string;
  squadName: string;
  status: string;
  matchesPlayed: number;
  matchesWon: number;
}

export function PlayerTournamentStats({ userId }: PlayerTournamentStatsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['player-tournament-stats', userId],
    queryFn: async () => {
      // Find all tournament squads where this user is a member or leader
      const { data: squads, error: squadErr } = await supabase
        .from('tournament_squad_members')
        .select('tournament_squad_id')
        .eq('user_id', userId)
        .eq('member_status', 'active');

      if (squadErr) throw squadErr;

      // Also include squads where user is leader
      const { data: leaderSquads, error: leaderErr } = await supabase
        .from('tournament_squads')
        .select('id')
        .eq('leader_id', userId);

      if (leaderErr) throw leaderErr;

      const allSquadIds = [
        ...new Set([
          ...(squads?.map(s => s.tournament_squad_id) || []),
          ...(leaderSquads?.map(s => s.id) || []),
        ]),
      ];

      if (allSquadIds.length === 0) return { participations: [], totals: { played: 0, won: 0, tournaments: 0 } };

      // Get registrations for these squads
      const { data: regs, error: regErr } = await supabase
        .from('tournament_registrations')
        .select(`
          tournament_id,
          tournament_squad_id,
          status,
          tournament:tournaments(id, name, status),
          squad:tournament_squads(name)
        `)
        .in('tournament_squad_id', allSquadIds)
        .neq('status', 'withdrawn');

      if (regErr) throw regErr;
      if (!regs || regs.length === 0) return { participations: [], totals: { played: 0, won: 0, tournaments: 0 } };

      // Get match stats for each squad
      const participations: TournamentParticipation[] = [];
      let totalPlayed = 0;
      let totalWon = 0;

      for (const reg of regs) {
        const tournament = reg.tournament as unknown as { id: string; name: string; status: string } | null;
        const squad = reg.squad as unknown as { name: string } | null;
        if (!tournament || !squad) continue;

        const { data: matches } = await supabase
          .from('tournament_matches')
          .select('id, winner_id, status')
          .eq('tournament_id', reg.tournament_id)
          .eq('status', 'completed')
          .or(`squad_a_id.eq.${reg.tournament_squad_id},squad_b_id.eq.${reg.tournament_squad_id}`);

        const played = matches?.length || 0;
        const won = matches?.filter(m => m.winner_id === reg.tournament_squad_id).length || 0;

        totalPlayed += played;
        totalWon += won;

        participations.push({
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          squadName: squad.name,
          status: tournament.status,
          matchesPlayed: played,
          matchesWon: won,
        });
      }

      return {
        participations,
        totals: { played: totalPlayed, won: totalWon, tournaments: participations.length },
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data || data.participations.length === 0) return null;

  const winRate = data.totals.played > 0
    ? Math.round((data.totals.won / data.totals.played) * 100)
    : 0;

  return (
    <GlowCard className="p-6 mb-6">
      <h2 className="text-lg font-display font-semibold text-foreground tracking-wide mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        Tournament Stats
      </h2>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-muted/50 rounded-lg border border-border">
          <p className="text-2xl font-display font-bold text-foreground">{data.totals.tournaments}</p>
          <p className="text-xs text-muted-foreground mt-1">Tournaments</p>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg border border-border">
          <p className="text-2xl font-display font-bold text-foreground">{data.totals.won}/{data.totals.played}</p>
          <p className="text-xs text-muted-foreground mt-1">W/L</p>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg border border-border">
          <p className="text-2xl font-display font-bold text-primary">{winRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">Win Rate</p>
        </div>
      </div>

      {/* Tournament list */}
      <div className="space-y-3">
        {data.participations.map((p) => (
          <Link
            key={`${p.tournamentId}-${p.squadName}`}
            to={`/tournament/${p.tournamentId}`}
            className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg hover:border-primary/30 transition-colors"
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{p.tournamentName}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Swords className="w-3 h-3" />
                {p.squadName}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {p.matchesPlayed > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  {p.matchesWon}W-{p.matchesPlayed - p.matchesWon}L
                </span>
              )}
              <Badge
                variant={p.status === 'completed' ? 'default' : 'outline'}
                className="text-xs"
              >
                {p.status === 'completed' ? (
                  <Medal className="w-3 h-3 mr-1" />
                ) : null}
                {p.status.replace(/_/g, ' ')}
              </Badge>
            </div>
          </Link>
        ))}
      </div>
    </GlowCard>
  );
}
