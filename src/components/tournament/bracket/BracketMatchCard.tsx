import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle, AlertCircle, AlertTriangle, Clock, Flag } from 'lucide-react';
import { safeFormatDate } from './bracket-helpers';
import type { TournamentMatch, TournamentSquad } from '@/lib/tournament-types';

interface BracketMatchCardProps {
  match: TournamentMatch;
  globalNumber?: number;
  onClick: () => void;
  bracketType: string;
  cardWidth?: number;
  compact?: boolean;
}

export function BracketMatchCard({
  match,
  globalNumber,
  onClick,
  bracketType,
  cardWidth = 230,
  compact = false,
}: BracketMatchCardProps) {
  const isCompleted = match.status === 'completed';
  const isOngoing = match.status === 'ongoing';
  const isDisputed = match.status === 'disputed';

  const teamAName = match.squad_a?.name || 'TBD';
  const teamBName = match.squad_b?.name || 'TBD';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Match: ${teamAName} vs ${teamBName}${isCompleted ? ' (Completed)' : isOngoing ? ' (Live)' : ''}`}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      style={{ width: `${cardWidth}px` }}
      className={cn(
        'rounded-lg border bg-[#111] cursor-pointer transition-all overflow-hidden select-none',
        'hover:border-[#FF4500]/50 hover:shadow-[0_0_10px_rgba(255,69,0,0.15)]',
        'active:scale-[0.98]',
        // Left accent border for status
        isCompleted && 'border-l-2 border-l-green-500/60 border-green-500/20',
        isOngoing && 'border-l-2 border-l-yellow-400/80 border-yellow-400/30',
        isDisputed && 'border-l-2 border-l-red-500/80 border-destructive/30',
        !isCompleted && !isOngoing && !isDisputed && 'border-[#FF4500]/15',
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-2.5 py-1 bg-[#0a0a0a] border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-[10px] font-display font-bold uppercase tracking-wider',
            bracketType === 'winners' ? 'text-[#FF4500]' : 'text-[#FF6B35]',
          )}>
            {globalNumber ? `M${globalNumber}` : `#${match.match_number}`}
          </span>
          <span className="text-[9px] text-muted-foreground/70">Bo{match.best_of}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {!compact && match.scheduled_time && safeFormatDate(match.scheduled_time, 'MMM d') && (
            <span className="text-[9px] text-muted-foreground/60 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {safeFormatDate(match.scheduled_time, 'MMM d')}
            </span>
          )}
          {isCompleted && <CheckCircle className="w-3 h-3 text-green-400" />}
          {isOngoing && <AlertCircle className="w-3 h-3 text-yellow-400" />}
          {isDisputed && <AlertTriangle className="w-3 h-3 text-destructive" />}
          {match.is_forfeit && <Flag className="w-3 h-3 text-destructive" />}
        </div>
      </div>

      {/* Team A — top row */}
      <BracketTeamRow
        squad={match.squad_a}
        score={match.squad_a_score}
        isWinner={match.winner_id === match.squad_a_id}
        isCompleted={isCompleted}
        compact={compact}
      />

      {/* Divider */}
      <div className="h-px bg-[#1a1a1a]" />

      {/* Team B — bottom row */}
      <BracketTeamRow
        squad={match.squad_b}
        score={match.squad_b_score}
        isWinner={match.winner_id === match.squad_b_id}
        isCompleted={isCompleted}
        compact={compact}
      />
    </div>
  );
}

function BracketTeamRow({
  squad,
  score,
  isWinner,
  isCompleted,
  compact,
}: {
  squad: TournamentSquad | null | undefined;
  score: number;
  isWinner: boolean;
  isCompleted: boolean;
  compact: boolean;
}) {
  const fontSize = compact ? 'text-[11px]' : 'text-xs';
  const avatarSize = compact ? 'h-4 w-4' : 'h-[18px] w-[18px]';
  const avatarFallbackSize = compact ? 'text-[7px]' : 'text-[8px]';
  const rowPadding = compact ? 'px-2 py-1.5' : 'px-2.5 py-2';
  const scoreSize = compact ? 'text-[11px]' : 'text-[13px]';

  return (
    <div
      className={cn(
        'flex items-center justify-between min-h-[32px]',
        rowPadding,
        isWinner && 'bg-green-500/8',
        !squad && 'opacity-35',
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Avatar className={cn(avatarSize, 'shrink-0')}>
          {squad?.logo_url && <AvatarImage src={squad.logo_url} alt={squad.name} />}
          <AvatarFallback className={cn(avatarFallbackSize, 'bg-[#1a1a1a] text-muted-foreground')}>
            {squad?.name?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <span className={cn(
          fontSize, 'truncate leading-tight',
          isWinner ? 'font-semibold text-foreground' : 'text-muted-foreground',
          !squad && 'italic',
        )}>
          {squad?.name || 'TBD'}
        </span>
        {isWinner && <CheckCircle className="w-3 h-3 text-green-400 shrink-0" />}
      </div>
      <span className={cn(
        scoreSize, 'font-display font-bold ml-2 shrink-0 min-w-[18px] text-right tabular-nums',
        isWinner ? 'text-green-400' : isCompleted ? 'text-muted-foreground' : 'text-muted-foreground/50',
      )}>
        {isCompleted || score > 0 ? score : '-'}
      </span>
    </div>
  );
}
