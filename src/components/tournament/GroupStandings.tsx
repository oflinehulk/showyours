import { useMemo } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowRightLeft, Swords, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import type { GroupStanding } from '@/lib/tournament-types';
import type { TournamentMatch } from '@/lib/tournament-types';
import { detectDeadlockedTeams, getTiebreakerProgress, type TiebreakerProgress } from '@/lib/bracket-utils';

interface GroupStandingsProps {
  standings: GroupStanding[];
  groupLabel: string;
  advanceCount?: number;
  advanceToLowerCount?: number;
  isHost?: boolean;
  withdrawnSquadIds?: Set<string>;
  onSwapTeam?: (squadId: string, squadName: string) => void;
  // Tiebreaker support
  groupMatches?: TournamentMatch[];
  onCreateTiebreaker?: (squadAId: string, squadBId: string) => void;
  onCreateMiniRR?: (squadIds: [string, string, string]) => void;
  isTiebreakerPending?: boolean;
}

export function GroupStandings({
  standings,
  groupLabel,
  advanceCount = 0,
  advanceToLowerCount = 0,
  isHost,
  withdrawnSquadIds,
  onSwapTeam,
  groupMatches,
  onCreateTiebreaker,
  onCreateMiniRR,
  isTiebreakerPending,
}: GroupStandingsProps) {
  const showActions = isHost && onSwapTeam && withdrawnSquadIds && withdrawnSquadIds.size > 0;

  // Detect deadlocks
  const deadlockedGroups = isHost && groupMatches
    ? detectDeadlockedTeams(standings, groupMatches)
    : [];

  const hasDeadlock = deadlockedGroups.length > 0;
  const deadlockedIds = new Set(deadlockedGroups.flat());

  // Get the first deadlock group
  const deadlockedTeams = deadlockedGroups[0] || [];
  const deadlockedStandings = standings.filter(s => deadlockedTeams.includes(s.squad_id));

  // Tiebreaker progress
  const tiebreakerProgress: TiebreakerProgress | null = useMemo(() => {
    if (!groupMatches || deadlockedTeams.length < 2) return null;
    return getTiebreakerProgress(deadlockedTeams, groupMatches);
  }, [deadlockedTeams, groupMatches]);

  const getTeamName = (squadId: string) => {
    return standings.find(s => s.squad_id === squadId)?.squad.name || 'Unknown';
  };

  const handleCreateMiniRR = () => {
    if (deadlockedTeams.length === 3 && onCreateMiniRR) {
      onCreateMiniRR(deadlockedTeams as [string, string, string]);
    }
  };

  const handleCreate2WayTiebreaker = () => {
    if (deadlockedTeams.length === 2 && onCreateTiebreaker) {
      onCreateTiebreaker(deadlockedTeams[0], deadlockedTeams[1]);
    }
  };

  // Tiebreaker state
  const hasTBMatches = tiebreakerProgress && (tiebreakerProgress.completedMatches.length > 0 || tiebreakerProgress.pendingMatches.length > 0);
  const allTBCompleted = tiebreakerProgress?.isFullyResolved;
  const pendingCount = tiebreakerProgress?.pendingMatches.length ?? 0;
  const completedCount = tiebreakerProgress?.completedMatches.length ?? 0;
  const totalNeeded = tiebreakerProgress?.totalSteps ?? 0;

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/50">
        <div className="w-5 h-5 rounded bg-[#FF4500]/10 border border-[#FF4500]/30 flex items-center justify-center text-[10px] font-bold text-[#FF4500]">
          {groupLabel}
        </div>
        <span className="text-xs font-semibold text-foreground">Group {groupLabel}</span>
        {hasDeadlock && (
          <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Tiebreaker needed
          </Badge>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border/30">
              <th className="text-left px-3 py-1.5 font-medium">#</th>
              <th className="text-left px-3 py-1.5 font-medium">Team</th>
              <th className="text-center px-2 py-1.5 font-medium">P</th>
              <th className="text-center px-2 py-1.5 font-medium">W</th>
              <th className="text-center px-2 py-1.5 font-medium">L</th>
              <th className="text-center px-2 py-1.5 font-medium hidden sm:table-cell">+/-</th>
              <th className="text-center px-2 py-1.5 font-medium">
                <span className="hidden sm:inline">Pts</span>
                <span className="sm:hidden">Pts/+</span>
              </th>
              {showActions && <th className="px-2 py-1.5 font-medium" />}
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => {
              const isAdvancing = advanceCount > 0 && i < advanceCount;
              const isLowerBracket = !isAdvancing && advanceToLowerCount > 0 && i < advanceCount + advanceToLowerCount;
              const isWithdrawn = withdrawnSquadIds?.has(s.squad_id);
              const isDeadlocked = deadlockedIds.has(s.squad_id);
              return (
                <tr
                  key={s.squad_id}
                  className={cn(
                    'border-b border-border/20 last:border-0 transition-colors',
                    isWithdrawn && 'bg-red-500/5',
                    !isWithdrawn && isDeadlocked && 'bg-amber-500/5',
                    !isWithdrawn && !isDeadlocked && isAdvancing && 'bg-green-500/5',
                    !isWithdrawn && !isDeadlocked && isLowerBracket && 'bg-orange-500/5',
                  )}
                >
                  <td className="px-3 py-2">
                    <span className={cn(
                      'inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold',
                      isWithdrawn
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : isDeadlocked
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : isAdvancing
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : isLowerBracket
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              : 'text-muted-foreground'
                    )}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className={cn('h-5 w-5 shrink-0', isWithdrawn && 'opacity-50')}>
                        {s.squad.logo_url ? (
                          <AvatarImage src={s.squad.logo_url} alt={s.squad.name} />
                        ) : null}
                        <AvatarFallback className="text-[9px] bg-[#1a1a1a] text-muted-foreground">
                          {s.squad.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        'font-medium truncate',
                        isWithdrawn
                          ? 'text-red-400/70 line-through'
                          : isDeadlocked
                            ? 'text-amber-400'
                            : isAdvancing ? 'text-green-400' : isLowerBracket ? 'text-orange-400' : 'text-foreground'
                      )}>
                        {s.squad.name}
                      </span>
                      {isWithdrawn && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 bg-red-500/10 text-red-400 border-red-500/30 shrink-0">
                          W/D
                        </Badge>
                      )}
                      {isDeadlocked && !isWithdrawn && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-400 border-amber-500/30 shrink-0">
                          TIED
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="text-center px-2 py-2 text-muted-foreground">{s.played}</td>
                  <td className="text-center px-2 py-2 text-foreground font-medium">{s.wins}</td>
                  <td className="text-center px-2 py-2 text-muted-foreground">{s.losses}</td>
                  <td className="text-center px-2 py-2 hidden sm:table-cell">
                    <span className={cn(
                      s.score_for - s.score_against > 0 && 'text-green-400',
                      s.score_for - s.score_against < 0 && 'text-red-400',
                      s.score_for - s.score_against === 0 && 'text-muted-foreground',
                    )}>
                      {s.score_for - s.score_against > 0 ? '+' : ''}{s.score_for - s.score_against}
                    </span>
                  </td>
                  <td className="text-center px-2 py-2">
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        'font-bold',
                        isWithdrawn
                          ? 'text-red-400/50'
                          : isDeadlocked
                            ? 'text-amber-400'
                            : isAdvancing ? 'text-green-400' : isLowerBracket ? 'text-orange-400' : 'text-[#FF4500]'
                      )}>
                        {s.points}
                      </span>
                      <span className={cn(
                        'text-[10px] sm:hidden',
                        s.score_for - s.score_against > 0 && 'text-green-400',
                        s.score_for - s.score_against < 0 && 'text-red-400',
                        s.score_for - s.score_against === 0 && 'text-muted-foreground',
                      )}>
                        {s.score_for - s.score_against > 0 ? '+' : ''}{s.score_for - s.score_against}
                      </span>
                    </div>
                  </td>
                  {showActions && (
                    <td className="px-2 py-2">
                      {isWithdrawn && onSwapTeam && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2 border-[#FF4500]/30 text-[#FF4500] hover:bg-[#FF4500]/10"
                          onClick={() => onSwapTeam(s.squad_id, s.squad.name)}
                        >
                          <ArrowRightLeft className="w-3 h-3 mr-1" />
                          Swap
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tiebreaker section for host */}
      {isHost && hasDeadlock && (onCreateTiebreaker || onCreateMiniRR) && (
        <div className="px-3 py-2 border-t border-border/30 bg-amber-500/5 space-y-2">
          {/* Show tied teams */}
          <div className="flex flex-wrap gap-1">
            {deadlockedStandings.map(s => (
              <Badge key={s.squad_id} variant="outline" className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                {s.squad.name} ({s.points}pts, {s.wins}W)
              </Badge>
            ))}
          </div>

          {/* Progress bar for existing tiebreaker matches */}
          {hasTBMatches && (
            <div className="rounded border border-border/30 bg-muted/20 p-2 space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                  Mini Round-Robin Progress
                </span>
                <span className={cn(
                  'font-bold',
                  allTBCompleted ? 'text-green-400' : 'text-amber-400'
                )}>
                  {completedCount}/{totalNeeded} completed
                </span>
              </div>
              
              {/* Match-by-match status */}
              <div className="space-y-1">
                {tiebreakerProgress?.completedMatches.map((m, idx) => (
                  <div key={m.id || idx} className="flex items-center gap-1.5 text-[10px]">
                    <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                    <span className="text-green-400">
                      {getTeamName(m.squad_a_id!)} {m.squad_a_score}-{m.squad_b_score} {getTeamName(m.squad_b_id!)}
                    </span>
                  </div>
                ))}
                {tiebreakerProgress?.pendingMatches.map((m, idx) => (
                  <div key={m.id || idx} className="flex items-center gap-1.5 text-[10px]">
                    <Swords className="w-3 h-3 text-amber-400 shrink-0 animate-pulse" />
                    <span className="text-amber-400">
                      {getTeamName(m.squad_a_id!)} vs {getTeamName(m.squad_b_id!)} — awaiting result
                    </span>
                  </div>
                ))}
              </div>

              {allTBCompleted && (
                <p className="text-[10px] text-green-400 font-medium pt-1 border-t border-border/30">
                  ✅ All tiebreaker matches completed — standings resolved!
                </p>
              )}

              {!allTBCompleted && pendingCount > 0 && (
                <p className="text-[10px] text-amber-400/70 pt-1 border-t border-border/30">
                  ⏳ Enter results for pending matches above to resolve the tie
                </p>
              )}
            </div>
          )}

          {/* Create button — only show if no tiebreaker matches exist yet */}
          {!hasTBMatches && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              disabled={isTiebreakerPending}
              onClick={deadlockedTeams.length === 3 ? handleCreateMiniRR : handleCreate2WayTiebreaker}
            >
              {isTiebreakerPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Swords className="w-3.5 h-3.5 mr-1.5" />
              )}
              {deadlockedTeams.length === 3
                ? 'Create Mini Round-Robin (3 Matches)'
                : 'Create Tiebreaker Match'
              }
            </Button>
          )}
        </div>
      )}
    </div>
  );
}