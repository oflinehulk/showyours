import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GlowCard } from '@/components/tron/GlowCard';
import { GroupStandings } from '@/components/tournament/GroupStandings';
import { SwapTeamDialog } from '@/components/tournament/SwapTeamDialog';
import { MatchCard } from './MatchCard';
import { computeGroupStandings } from '@/lib/bracket-utils';
import {
  useTournamentGroups,
  useTournamentGroupTeams,
  useTournamentRegistrations,
  useCreateTiebreakerMatch,
  useCreateMiniRRTiebreaker,
  useDeleteTiebreakerMatch,
} from '@/hooks/useTournaments';
import { toast } from 'sonner';
import type { Tournament, TournamentMatch, TournamentSquad, TournamentStage } from '@/lib/tournament-types';

export function GroupStageView({
  tournament,
  stage,
  stageMatches,
  onMatchClick,
  onDispute,
  onResolve,
  isHost,
  tournamentId,
  tournamentName,
  tournamentStatus,
  userSquadIds,
  onToss,
}: {
  tournament: Tournament;
  stage: TournamentStage;
  stageMatches: TournamentMatch[];
  onMatchClick: (m: TournamentMatch) => void;
  onDispute: (m: TournamentMatch) => void;
  onResolve: (m: TournamentMatch) => void;
  isHost: boolean;
  tournamentId: string;
  tournamentName: string;
  tournamentStatus: string;
  userSquadIds: string[];
  onToss?: (m: TournamentMatch) => void;
}) {
  const { data: groups } = useTournamentGroups(stage.id);
  const { data: groupTeams } = useTournamentGroupTeams(stage.id);
  const { data: registrations } = useTournamentRegistrations(tournament.id);
  const createTiebreaker = useCreateTiebreakerMatch();
  const createMiniRR = useCreateMiniRRTiebreaker();
  const deleteTiebreaker = useDeleteTiebreakerMatch();
  const [swapTarget, setSwapTarget] = useState<{
    groupId: string;
    squadId: string;
    squadName: string;
  } | null>(null);
  const [skippedTiebreakers, setSkippedTiebreakers] = useState<Set<string>>(new Set());

  const withdrawnSquadIds = new Set(
    (registrations || [])
      .filter(r => r.status === 'withdrawn')
      .map(r => r.tournament_squad_id)
  );

  if (!groups || groups.length === 0) {
    return (
      <GlowCard className="p-6 text-center">
        <p className="text-muted-foreground text-sm">Groups have not been configured yet.</p>
      </GlowCard>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const groupMatches = stageMatches.filter(m => m.group_id === group.id);

        const squadMap = new Map<string, TournamentSquad>();
        for (const m of groupMatches) {
          if (m.squad_a && m.squad_a_id) squadMap.set(m.squad_a_id, m.squad_a);
          if (m.squad_b && m.squad_b_id) squadMap.set(m.squad_b_id, m.squad_b);
        }
        for (const gt of (groupTeams || [])) {
          if (gt.group_id === group.id && gt.tournament_squads) {
            squadMap.set(gt.tournament_squad_id, gt.tournament_squads);
          }
        }

        const standings = computeGroupStandings(groupMatches, squadMap);

        return (
          <div key={group.id} className="space-y-4">
            <GroupStandings
              standings={standings}
              groupLabel={group.label}
              advanceCount={stage.advance_per_group}
              advanceToLowerCount={stage.advance_to_lower_per_group}
              isHost={isHost}
              withdrawnSquadIds={withdrawnSquadIds}
              onSwapTeam={stage.status === 'ongoing' ? (squadId, squadName) => {
                setSwapTarget({ groupId: group.id, squadId, squadName });
              } : undefined}
              groupMatches={groupMatches}
              onCreateTiebreaker={isHost && stage.status === 'ongoing' ? (squadAId, squadBId) => {
                createTiebreaker.mutate({
                  tournamentId: tournament.id,
                  stageId: stage.id,
                  groupId: group.id,
                  squadAId,
                  squadBId,
                  bestOf: stage.best_of as 1 | 3 | 5,
                }, {
                  onSuccess: () => toast.success('Tiebreaker match created!'),
                  onError: (err) => toast.error(`Failed to create tiebreaker: ${err.message}`),
                });
              } : undefined}
              onCreateMiniRR={isHost && stage.status === 'ongoing' ? (squadIds) => {
                createMiniRR.mutate({
                  tournamentId: tournament.id,
                  stageId: stage.id,
                  groupId: group.id,
                  squadIds,
                  bestOf: stage.best_of as 1 | 3 | 5,
                }, {
                  onSuccess: () => toast.success('3 tiebreaker matches created! Enter results for each match.'),
                  onError: (err) => toast.error(`Failed to create tiebreaker matches: ${err.message}`),
                });
              } : undefined}
              isTiebreakerPending={createTiebreaker.isPending || createMiniRR.isPending}
              tiebreakerSkipped={skippedTiebreakers.has(group.id)}
              onSkipTiebreaker={isHost && stage.status === 'ongoing' ? () => {
                setSkippedTiebreakers(prev => new Set(prev).add(group.id));
                toast.success(`Tiebreaker skipped for Group ${group.label} — using current order`);
              } : undefined}
              onUnskipTiebreaker={isHost ? () => {
                setSkippedTiebreakers(prev => {
                  const next = new Set(prev);
                  next.delete(group.id);
                  return next;
                });
              } : undefined}
            />

            {groupMatches.length > 0 && (
              <div className="pl-1">
                <p className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Group {group.label} Matches
                </p>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {groupMatches
                    .sort((a, b) => {
                      if (a.round === 99 && b.round !== 99) return 1;
                      if (a.round !== 99 && b.round === 99) return -1;
                      if (a.round !== b.round) return a.round - b.round;
                      return a.match_number - b.match_number;
                    })
                    .map((match) => (
                      <div key={match.id} className="relative">
                        {match.round === 99 && (
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/30">
                              ⚔️ Tiebreaker
                            </Badge>
                            {isHost && match.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 px-1.5 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={deleteTiebreaker.isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Remove this tiebreaker match?')) {
                                    deleteTiebreaker.mutate(
                                      { matchId: match.id, tournamentId: tournament.id },
                                      {
                                        onSuccess: () => toast.success('Tiebreaker match removed'),
                                        onError: (err) => toast.error(`Failed: ${err.message}`),
                                      }
                                    );
                                  }
                                }}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        )}
                        <MatchCard
                          match={match}
                          onClick={() => onMatchClick(match)}
                          onDispute={() => onDispute(match)}
                          onResolve={() => onResolve(match)}
                          onToss={onToss ? () => onToss(match) : undefined}
                          isHost={isHost}
                          tournamentId={tournamentId}
                          tournamentName={tournamentName}
                          tournamentStatus={tournamentStatus}
                          userSquadIds={userSquadIds}
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {swapTarget && registrations && (
        <SwapTeamDialog
          open={!!swapTarget}
          onOpenChange={(open) => { if (!open) setSwapTarget(null); }}
          tournament={tournament}
          stageId={stage.id}
          groupId={swapTarget.groupId}
          withdrawnSquadId={swapTarget.squadId}
          withdrawnSquadName={swapTarget.squadName}
          registrations={registrations}
        />
      )}
    </div>
  );
}
