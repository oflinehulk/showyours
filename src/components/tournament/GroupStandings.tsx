import { useState, useMemo } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ArrowRightLeft, Swords, AlertTriangle, Loader2, CheckCircle2, Trophy, Circle } from 'lucide-react';
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
  isTiebreakerPending,
}: GroupStandingsProps) {
  const showActions = isHost && onSwapTeam && withdrawnSquadIds && withdrawnSquadIds.size > 0;

  // Detect deadlocks
  const deadlockedGroups = isHost && groupMatches
    ? detectDeadlockedTeams(standings, groupMatches)
    : [];

  const hasDeadlock = deadlockedGroups.length > 0;
  const deadlockedIds = new Set(deadlockedGroups.flat());

  const [showTiebreakerDialog, setShowTiebreakerDialog] = useState(false);
  const [selectedTeamA, setSelectedTeamA] = useState<string>('');
  const [selectedTeamB, setSelectedTeamB] = useState<string>('');

  // Get the first deadlock group for the dialog
  const deadlockedTeams = deadlockedGroups[0] || [];
  const deadlockedStandings = standings.filter(s => deadlockedTeams.includes(s.squad_id));

  // Tiebreaker progress
  const tiebreakerProgress: TiebreakerProgress | null = useMemo(() => {
    if (!groupMatches || deadlockedTeams.length < 2) return null;
    return getTiebreakerProgress(deadlockedTeams, groupMatches);
  }, [deadlockedTeams, groupMatches]);

  const handleCreateTiebreaker = () => {
    if (selectedTeamA && selectedTeamB && onCreateTiebreaker) {
      onCreateTiebreaker(selectedTeamA, selectedTeamB);
      setShowTiebreakerDialog(false);
      setSelectedTeamA('');
      setSelectedTeamB('');
    }
  };

  const handleAutoCreateNext = () => {
    if (tiebreakerProgress?.suggestedNextMatch && onCreateTiebreaker) {
      onCreateTiebreaker(
        tiebreakerProgress.suggestedNextMatch.squadAId,
        tiebreakerProgress.suggestedNextMatch.squadBId
      );
      setShowTiebreakerDialog(false);
    }
  };

  const getTeamName = (squadId: string) => {
    return standings.find(s => s.squad_id === squadId)?.squad.name || 'Unknown';
  };

  // Determine dialog state
  const hasExistingPendingTB = tiebreakerProgress && tiebreakerProgress.pendingMatches.length > 0;
  const needsNextMatch = tiebreakerProgress && tiebreakerProgress.completedMatches.length > 0 && 
    tiebreakerProgress.pendingMatches.length === 0 && !tiebreakerProgress.isFullyResolved;
  const isStep1 = !tiebreakerProgress || (tiebreakerProgress.completedMatches.length === 0 && tiebreakerProgress.pendingMatches.length === 0);

  return (
    <>
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

        {/* Tiebreaker button for host */}
        {isHost && hasDeadlock && onCreateTiebreaker && (
          <div className="px-3 py-2 border-t border-border/30 bg-amber-500/5">
            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              onClick={() => {
                setSelectedTeamA('');
                setSelectedTeamB('');
                setShowTiebreakerDialog(true);
              }}
            >
              <Swords className="w-3.5 h-3.5 mr-1.5" />
              {needsNextMatch 
                ? `Create Final Tiebreaker (Step ${tiebreakerProgress!.currentStep} of ${tiebreakerProgress!.totalSteps})`
                : hasExistingPendingTB
                  ? 'Tiebreaker Match Pending — Enter Result'
                  : deadlockedTeams.length === 3
                    ? '3-Way Tiebreaker (2 Matches Needed)'
                    : 'Create Tiebreaker Match'
              }
            </Button>
          </div>
        )}
      </div>

      {/* Tiebreaker Dialog */}
      <Dialog open={showTiebreakerDialog} onOpenChange={setShowTiebreakerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-amber-400" />
              {deadlockedTeams.length === 3 
                ? `3-Way Tiebreaker — Group ${groupLabel}`
                : `Tiebreaker Match — Group ${groupLabel}`
              }
            </DialogTitle>
            <DialogDescription>
              {deadlockedTeams.length === 3
                ? 'Standard 3-way tiebreaker: 2 matches needed. Pick 2 teams for the semi-final, winner plays the 3rd team in the final.'
                : 'These teams are deadlocked on all criteria. Create a tiebreaker match to decide their ranking.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Show tied teams */}
            <div className="flex flex-wrap gap-1.5">
              {deadlockedStandings.map(s => (
                <Badge key={s.squad_id} variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">
                  {s.squad.name} ({s.points} pts, {s.wins}W-{s.losses}L)
                </Badge>
              ))}
            </div>

            {/* Progress stepper for 3-way ties */}
            {deadlockedTeams.length === 3 && tiebreakerProgress && (
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Tiebreaker Progress
                </div>
                
                {/* Step 1 */}
                <div className="flex items-start gap-2">
                  {tiebreakerProgress.completedMatches.length >= 1 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  ) : tiebreakerProgress.pendingMatches.length >= 1 ? (
                    <Circle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0 animate-pulse" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <div className="text-xs">
                    <span className="font-medium text-foreground">Semi-final: </span>
                    {tiebreakerProgress.completedMatches.length >= 1 ? (
                      <span className="text-green-400">
                        {getTeamName(tiebreakerProgress.completedMatches[0].squad_a_id!)} vs {getTeamName(tiebreakerProgress.completedMatches[0].squad_b_id!)}
                        {' → '}
                        <Trophy className="w-3 h-3 inline" /> {getTeamName(tiebreakerProgress.completedMatches[0].winner_id!)}
                      </span>
                    ) : tiebreakerProgress.pendingMatches.length >= 1 ? (
                      <span className="text-amber-400">
                        {getTeamName(tiebreakerProgress.pendingMatches[0].squad_a_id!)} vs {getTeamName(tiebreakerProgress.pendingMatches[0].squad_b_id!)}
                        {' — awaiting result'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Pick 2 teams below</span>
                    )}
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-2">
                  {tiebreakerProgress.completedMatches.length >= 2 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  ) : needsNextMatch ? (
                    <Circle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0 animate-pulse" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <div className="text-xs">
                    <span className="font-medium text-foreground">Final: </span>
                    {tiebreakerProgress.completedMatches.length >= 2 ? (
                      <span className="text-green-400">Completed</span>
                    ) : needsNextMatch && tiebreakerProgress.suggestedNextMatch ? (
                      <span className="text-amber-400">
                        {getTeamName(tiebreakerProgress.suggestedNextMatch.squadAId)} vs {getTeamName(tiebreakerProgress.suggestedNextMatch.squadBId)}
                        {' — ready to create'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Winner of semi-final vs 3rd team</span>
                    )}
                  </div>
                </div>

                {/* Ranking explanation */}
                <div className="text-[10px] text-muted-foreground mt-1 pt-1 border-t border-border/30">
                  🏆 Final winner = Rank 1 · Final loser = Rank 3 · Semi-final loser = Rank 2
                </div>
              </div>
            )}

            {/* Pending match notice */}
            {hasExistingPendingTB && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-xs text-amber-400">
                  ⏳ A tiebreaker match is already pending. Enter the result in the match card below, then come back to create the next match.
                </p>
              </div>
            )}

            {/* Auto-create next match for 3-way Step 2 */}
            {needsNextMatch && tiebreakerProgress?.suggestedNextMatch && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 space-y-2">
                <p className="text-xs text-green-400 font-medium">
                  ✅ Semi-final complete! Create the final tiebreaker match:
                </p>
                <div className="flex items-center justify-center gap-3 py-1">
                  <span className="text-sm font-bold text-foreground">
                    {getTeamName(tiebreakerProgress.suggestedNextMatch.squadAId)}
                  </span>
                  <span className="text-xs text-muted-foreground font-bold">VS</span>
                  <span className="text-sm font-bold text-foreground">
                    {getTeamName(tiebreakerProgress.suggestedNextMatch.squadBId)}
                  </span>
                </div>
              </div>
            )}

            {/* Manual team selection — only for Step 1 or non-3-way ties */}
            {!hasExistingPendingTB && !needsNextMatch && isStep1 && (
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">
                    {deadlockedTeams.length === 3 ? 'Semi-final Team A' : 'Team A'}
                  </label>
                  <Select value={selectedTeamA} onValueChange={setSelectedTeamA}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {deadlockedStandings
                        .filter(s => s.squad_id !== selectedTeamB)
                        .map(s => (
                          <SelectItem key={s.squad_id} value={s.squad_id}>
                            {s.squad.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <span className="text-xs text-muted-foreground font-bold pb-2">VS</span>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">
                    {deadlockedTeams.length === 3 ? 'Semi-final Team B' : 'Team B'}
                  </label>
                  <Select value={selectedTeamB} onValueChange={setSelectedTeamB}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {deadlockedStandings
                        .filter(s => s.squad_id !== selectedTeamA)
                        .map(s => (
                          <SelectItem key={s.squad_id} value={s.squad_id}>
                            {s.squad.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Show the bye team for 3-way */}
                {deadlockedTeams.length === 3 && selectedTeamA && selectedTeamB && (
                  <div className="col-span-3 text-center text-[11px] text-muted-foreground mt-1">
                    🎯 <span className="font-medium text-foreground">
                      {getTeamName(deadlockedTeams.find(id => id !== selectedTeamA && id !== selectedTeamB)!)}
                    </span> will play the winner in the final
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTiebreakerDialog(false)}>
              {hasExistingPendingTB ? 'Close' : 'Cancel'}
            </Button>
            
            {/* Step 2: Auto-create final match */}
            {needsNextMatch && tiebreakerProgress?.suggestedNextMatch && (
              <Button
                onClick={handleAutoCreateNext}
                disabled={isTiebreakerPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isTiebreakerPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Trophy className="w-4 h-4 mr-1.5" />
                )}
                Create Final Match
              </Button>
            )}

            {/* Step 1: Create semi-final */}
            {!hasExistingPendingTB && !needsNextMatch && isStep1 && (
              <Button
                onClick={handleCreateTiebreaker}
                disabled={!selectedTeamA || !selectedTeamB || isTiebreakerPending}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {isTiebreakerPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Swords className="w-4 h-4 mr-1.5" />
                )}
                {deadlockedTeams.length === 3 ? 'Create Semi-Final' : 'Create Match'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
