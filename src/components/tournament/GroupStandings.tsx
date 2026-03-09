import { useState } from 'react';
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
import { ArrowRightLeft, Swords, AlertTriangle, Loader2 } from 'lucide-react';
import type { GroupStanding } from '@/lib/tournament-types';
import type { TournamentMatch } from '@/lib/tournament-types';
import { detectDeadlockedTeams } from '@/lib/bracket-utils';

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

  const handleCreateTiebreaker = () => {
    if (selectedTeamA && selectedTeamB && onCreateTiebreaker) {
      onCreateTiebreaker(selectedTeamA, selectedTeamB);
      setShowTiebreakerDialog(false);
      setSelectedTeamA('');
      setSelectedTeamB('');
    }
  };

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
              Create Tiebreaker Match
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
              Tiebreaker Match — Group {groupLabel}
            </DialogTitle>
            <DialogDescription>
              These teams are deadlocked on all tiebreaker criteria. Create a tiebreaker match to decide their final ranking.
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

            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Team A</label>
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
                <label className="text-xs text-muted-foreground font-medium">Team B</label>
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
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTiebreakerDialog(false)}>
              Cancel
            </Button>
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
              Create Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}