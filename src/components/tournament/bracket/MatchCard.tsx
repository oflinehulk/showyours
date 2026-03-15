import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DraftSummaryBadge } from '@/components/tournament/DraftPickPanel';
import { ShareCardGenerator } from '@/components/tournament/ShareCardGenerator';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Check,
  Flag,
  MoreHorizontal,
  Coins,
  RotateCcw,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  useUpdateMatchCheckIn,
  useForfeitMatch,
  useResetCoinToss,
  useResetMatchResult,
} from '@/hooks/useTournaments';
import { MATCH_STATUS_LABELS } from '@/lib/tournament-types';
import type { TournamentMatch, TournamentSquad, MatchStatus } from '@/lib/tournament-types';

export function MatchCard({
  match,
  onClick,
  onDispute,
  onResolve,
  onToss,
  isHost,
  tournamentId,
  tournamentName,
  tournamentStatus,
  userSquadIds,
  large = false,
}: {
  match: TournamentMatch;
  onClick: () => void;
  onDispute: () => void;
  onResolve: () => void;
  onToss?: (match: TournamentMatch) => void;
  isHost: boolean;
  tournamentId: string;
  tournamentName: string;
  tournamentStatus: string;
  userSquadIds: string[];
  large?: boolean;
}) {
  const updateCheckIn = useUpdateMatchCheckIn();
  const forfeitMatch = useForfeitMatch();
  const resetCoinToss = useResetCoinToss();
  const resetMatchResult = useResetMatchResult();

  const isOngoing = tournamentStatus === 'ongoing' || tournamentStatus === 'bracket_generated';
  const userInMatch = userSquadIds.some(id => id === match.squad_a_id || id === match.squad_b_id);
  const canDispute = userInMatch && match.status === 'completed' && !match.is_forfeit;

  const statusIcons: Record<MatchStatus, React.ReactNode> = {
    pending: <Clock className="w-3 h-3" />,
    ongoing: <AlertCircle className="w-3 h-3" />,
    completed: <CheckCircle className="w-3 h-3" />,
    disputed: <AlertTriangle className="w-3 h-3" />,
  };

  const statusColors: Record<MatchStatus, string> = {
    pending: 'text-muted-foreground',
    ongoing: 'text-yellow-400',
    completed: 'text-green-400',
    disputed: 'text-destructive',
  };

  const handleCheckIn = (field: 'squad_a_checked_in' | 'squad_b_checked_in', value: boolean) => {
    updateCheckIn.mutate({ matchId: match.id, field, value, tournamentId });
  };

  const handleForfeit = (e: React.MouseEvent, winnerId: string) => {
    e.stopPropagation();
    forfeitMatch.mutate({
      matchId: match.id,
      winnerId,
      bestOf: match.best_of,
      tournamentId,
    }, {
      onSuccess: () => toast.success('Match forfeited'),
      onError: (err: Error) => toast.error('Failed to forfeit', { description: err.message }),
    });
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'w-full p-2.5 md:p-3 rounded-lg border bg-[#111111] transition-all text-left cursor-pointer',
        'border-[#FF4500]/20 hover:border-[#FF4500]/50 hover:shadow-[0_0_10px_rgba(255,69,0,0.15)]',
        'active:scale-[0.98]',
        match.status === 'ongoing' && 'border-yellow-400/40',
        match.status === 'completed' && 'border-green-500/20',
        match.status === 'disputed' && 'border-destructive/40',
        large && 'p-3 md:p-4 neon-border'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Bo{match.best_of}</span>
          <DraftSummaryBadge matchId={match.id} />
        </div>
        <span className={cn('flex items-center gap-1 text-xs',
          match.status === 'disputed' ? 'text-destructive' :
          match.status === 'completed' ? (match.is_forfeit ? 'text-destructive' : 'text-green-400') :
          statusColors[match.status]
        )}>
          {match.is_forfeit ? <Flag className="w-3 h-3" /> : statusIcons[match.status]}
          {match.is_forfeit ? 'Forfeit' : MATCH_STATUS_LABELS[match.status]}
        </span>
      </div>

      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {match.scheduled_time
          ? format(new Date(match.scheduled_time), 'MMM d, h:mm a')
          : 'TBA'}
      </p>

      <div className="space-y-2">
        <MatchTeamRow
          squad={match.squad_a}
          score={match.squad_a_score}
          isWinner={match.winner_id === match.squad_a_id}
          checkedIn={match.squad_a_checked_in}
          showCheckIn={isHost && isOngoing && match.status === 'pending' && !!match.squad_a_id}
          onCheckIn={(val) => handleCheckIn('squad_a_checked_in', val)}
          large={large}
          sideBadge={match.toss_completed_at ? (match.blue_side_team === match.squad_a_id ? 'blue' : match.red_side_team === match.squad_a_id ? 'red' : undefined) : undefined}
        />
        <div className="flex items-center gap-2 text-xs">
          <div className="flex-1 h-px bg-[#FF4500]/20" />
          <span className="text-[#FF4500] font-display font-bold tracking-wider">VS</span>
          <div className="flex-1 h-px bg-[#FF4500]/20" />
        </div>
        <MatchTeamRow
          squad={match.squad_b}
          score={match.squad_b_score}
          isWinner={match.winner_id === match.squad_b_id}
          checkedIn={match.squad_b_checked_in}
          showCheckIn={isHost && isOngoing && match.status === 'pending' && !!match.squad_b_id}
          onCheckIn={(val) => handleCheckIn('squad_b_checked_in', val)}
          large={large}
          sideBadge={match.toss_completed_at ? (match.blue_side_team === match.squad_b_id ? 'blue' : match.red_side_team === match.squad_b_id ? 'red' : undefined) : undefined}
        />
      </div>

      {/* Actions row: dropdown + share */}
      <div className="mt-2 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1">
          {(() => {
            const showForfeitA = isHost && isOngoing && match.status === 'pending' && match.squad_a_id && match.squad_b_id;
            const showForfeitB = isHost && isOngoing && match.status === 'pending' && match.squad_a_id && match.squad_b_id;
            const showDispute = canDispute;
            const showResolve = isHost && match.status === 'disputed';
            const showDoToss = onToss && isHost && isOngoing && match.status === 'pending' && match.squad_a_id && match.squad_b_id && !match.toss_completed_at;
            const showRedoToss = onToss && isHost && isOngoing && (match.status === 'pending' || match.status === 'ongoing') && match.toss_completed_at;
            const showResetResult = isHost && isOngoing && match.status === 'completed';
            const hasActions = showForfeitA || showForfeitB || showDispute || showResolve || showDoToss || showRedoToss || showResetResult;

            if (!hasActions) return null;

            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[160px]">
                  {showDoToss && (
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onToss!(match); }}
                    >
                      <Coins className="w-3.5 h-3.5 mr-2" />
                      Do Toss
                    </DropdownMenuItem>
                  )}
                  {showRedoToss && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        resetCoinToss.mutate(
                          { matchId: match.id, tournamentId, stageId: match.stage_id },
                          { onSuccess: () => { toast.success('Toss reset'); onToss!(match); } }
                        );
                      }}
                      disabled={resetCoinToss.isPending}
                    >
                      <Coins className="w-3.5 h-3.5 mr-2" />
                      Redo Toss
                    </DropdownMenuItem>
                  )}
                  {showForfeitA && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => handleForfeit(e, match.squad_b_id!)}
                      disabled={forfeitMatch.isPending}
                    >
                      <Flag className="w-3.5 h-3.5 mr-2" />
                      Forfeit {match.squad_a?.name || 'Squad A'}
                    </DropdownMenuItem>
                  )}
                  {showForfeitB && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => handleForfeit(e, match.squad_a_id!)}
                      disabled={forfeitMatch.isPending}
                    >
                      <Flag className="w-3.5 h-3.5 mr-2" />
                      Forfeit {match.squad_b?.name || 'Squad B'}
                    </DropdownMenuItem>
                  )}
                  {showDispute && (
                    <DropdownMenuItem
                      className="text-yellow-500 focus:text-yellow-500"
                      onClick={(e) => { e.stopPropagation(); onDispute(); }}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-2" />
                      Dispute Result
                    </DropdownMenuItem>
                  )}
                  {showResolve && (
                    <DropdownMenuItem
                      className="text-primary focus:text-primary"
                      onClick={(e) => { e.stopPropagation(); onResolve(); }}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-2" />
                      Resolve Dispute
                    </DropdownMenuItem>
                  )}
                  {showResetResult && (
                    <DropdownMenuItem
                      className="text-orange-400 focus:text-orange-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetMatchResult.mutate(
                          { matchId: match.id, tournamentId },
                          {
                            onSuccess: () => toast.success('Match result reset to pending'),
                            onError: (err: Error) => toast.error('Failed to reset', { description: err.message }),
                          }
                        );
                      }}
                      disabled={resetMatchResult.isPending}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-2" />
                      Reset Result
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })()}
        </div>
        {match.status === 'completed' && (
          <ShareCardGenerator match={match} tournamentName={tournamentName} />
        )}
      </div>
    </div>
  );
}

function MatchTeamRow({
  squad,
  score,
  isWinner,
  checkedIn,
  showCheckIn,
  onCheckIn,
  large,
  sideBadge,
}: {
  squad: TournamentSquad | null | undefined;
  score: number;
  isWinner: boolean;
  checkedIn?: boolean;
  showCheckIn?: boolean;
  onCheckIn?: (value: boolean) => void;
  large: boolean;
  sideBadge?: 'blue' | 'red';
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-2 rounded',
        isWinner && 'bg-green-500/10 border border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.15)]',
        !squad && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {showCheckIn && onCheckIn && (
          <button
            onClick={(e) => { e.stopPropagation(); onCheckIn(!checkedIn); }}
            className={cn(
              'w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors',
              checkedIn
                ? 'bg-green-500/20 border-green-500/50 text-green-500'
                : 'border-muted-foreground/30 text-muted-foreground hover:border-green-500/30'
            )}
          >
            {checkedIn ? <Check className="w-3 h-3" /> : null}
          </button>
        )}
        {!showCheckIn && checkedIn !== undefined && checkedIn && squad && (
          <Check className="w-3 h-3 text-green-500 shrink-0" />
        )}
        <Avatar className={cn('shrink-0', large ? 'h-7 w-7' : 'h-5 w-5')}>
          {squad?.logo_url ? (
            <AvatarImage src={squad.logo_url} alt={squad.name} />
          ) : null}
          <AvatarFallback className="text-[10px] bg-[#1a1a1a] text-muted-foreground">
            {squad?.name?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <span className={cn('font-medium truncate', large ? 'text-base' : 'text-sm')}>
          {squad?.name || 'TBD'}
        </span>
        {sideBadge && (
          <span className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0',
            sideBadge === 'blue'
              ? 'bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30'
              : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30',
          )}>
            {sideBadge === 'blue' ? 'Blue' : 'Red'}
          </span>
        )}
      </div>
      <span className={cn('font-display font-bold', large ? 'text-lg' : 'text-sm')}>
        {score}
      </span>
    </div>
  );
}
