import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GlowCard } from '@/components/tron/GlowCard';
import { ScoreEditSheet } from '@/components/tournament/ScoreEditSheet';
import { CoinTossOverlay } from '@/components/tournament/CoinTossOverlay';
import { captureAndShare, captureAndDownload } from '@/lib/screenshot';
import { useIsMobile } from '@/hooks/use-mobile';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  useUpdateMatchCheckIn,
  useForfeitMatch,
  useResetCoinToss,
} from '@/hooks/useTournaments';
import {
  Clock,
  Share2,
  Loader2,
  AlertCircle,
  CalendarDays,
  ChevronDown,
  Coins,
  ClipboardCheck,
  Flag,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow } from 'date-fns';
import { toast } from 'sonner';
import type { TournamentMatch } from '@/lib/tournament-types';

interface UpcomingMatchesProps {
  matches: TournamentMatch[];
  tournamentName: string;
  isHost?: boolean;
  tournamentId?: string;
  tournamentStatus?: string;
  userSquadIds?: string[];
}

export function UpcomingMatches({
  matches,
  tournamentName,
  isHost = false,
  tournamentId,
  tournamentStatus,
  userSquadIds = [],
}: UpcomingMatchesProps) {
  // Only show matches that have a scheduled time — TBA matches are already visible in the Bracket tab
  const upcoming = matches
    .filter(m => (m.status === 'pending' || m.status === 'ongoing') && m.scheduled_time)
    .sort((a, b) => new Date(a.scheduled_time!).getTime() - new Date(b.scheduled_time!).getTime());

  if (upcoming.length === 0) {
    return (
      <GlowCard className="p-8 text-center">
        <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-display font-semibold text-foreground mb-1">No scheduled matches</h3>
        <p className="text-muted-foreground text-sm">
          Matches will appear here once the host assigns times.
        </p>
      </GlowCard>
    );
  }

  // Group by date
  const groups = new Map<string, TournamentMatch[]>();
  for (const match of upcoming) {
    const date = new Date(match.scheduled_time!);
    let label: string;
    if (isToday(date)) {
      label = 'Today';
    } else if (isTomorrow(date)) {
      label = 'Tomorrow';
    } else {
      label = format(date, 'EEEE, MMM d');
    }
    const existing = groups.get(label) || [];
    existing.push(match);
    groups.set(label, existing);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([dateLabel, dateMatches]) => (
        <div key={dateLabel}>
          <h3 className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5" />
            {dateLabel}
          </h3>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {dateMatches.map((match) => (
              <UpcomingMatchCard
                key={match.id}
                match={match}
                tournamentName={tournamentName}
                isHost={isHost}
                tournamentId={tournamentId}
                tournamentStatus={tournamentStatus}
                userSquadIds={userSquadIds}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function UpcomingMatchCard({
  match,
  tournamentName,
  isHost,
  tournamentId,
  tournamentStatus,
  userSquadIds,
}: {
  match: TournamentMatch;
  tournamentName: string;
  isHost: boolean;
  tournamentId?: string;
  tournamentStatus?: string;
  userSquadIds: string[];
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [sharing, setSharing] = useState(false);
  const [renderCard, setRenderCard] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showScoreSheet, setShowScoreSheet] = useState(false);
  const [tossMatch, setTossMatch] = useState<TournamentMatch | null>(null);

  const updateCheckIn = useUpdateMatchCheckIn();
  const forfeitMatch = useForfeitMatch();
  const resetCoinToss = useResetCoinToss();

  const isOngoing = tournamentStatus === 'ongoing' || tournamentStatus === 'bracket_generated';
  const canDoToss = isHost && isOngoing && match.status === 'pending' && match.squad_a_id && match.squad_b_id && !match.toss_completed_at;
  const canRedoToss = isHost && isOngoing && (match.status === 'pending' || match.status === 'ongoing') && match.toss_completed_at;
  const canCheckIn = isHost && isOngoing && match.status === 'pending';
  const canEditScore = isHost && match.squad_a_id && match.squad_b_id;
  const canForfeitA = isHost && isOngoing && match.status === 'pending' && match.squad_a_id && match.squad_b_id && !match.squad_a_checked_in && match.squad_b_checked_in;
  const canForfeitB = isHost && isOngoing && match.status === 'pending' && match.squad_a_id && match.squad_b_id && match.squad_a_checked_in && !match.squad_b_checked_in;

  const hasHostActions = isHost && tournamentId && (canDoToss || canRedoToss || canCheckIn || canEditScore);

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
  const filename = `showyours-upcoming-${sanitize(match.squad_a?.name || 'teamA')}-vs-${sanitize(match.squad_b?.name || 'teamB')}`;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSharing(true);
    setRenderCard(true);

    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    try {
      if (cardRef.current) {
        if (isMobile) {
          await captureAndShare(cardRef.current, filename);
        } else {
          await captureAndDownload(cardRef.current, filename);
        }
      }
    } finally {
      setSharing(false);
      setRenderCard(false);
    }
  };

  const handleCheckIn = (field: 'squad_a_checked_in' | 'squad_b_checked_in', value: boolean) => {
    if (!tournamentId) return;
    updateCheckIn.mutate({ matchId: match.id, field, value, tournamentId });
  };

  const handleForfeit = (winnerId: string) => {
    if (!tournamentId) return;
    forfeitMatch.mutate(
      { matchId: match.id, winnerId, bestOf: match.best_of, tournamentId },
      {
        onSuccess: () => toast.success('Match forfeited'),
        onError: (err: Error) => toast.error('Failed to forfeit', { description: err.message }),
      }
    );
  };

  return (
    <>
      <GlowCard className={cn(
        'p-4 space-y-3',
        match.status === 'ongoing' && 'border-yellow-400/40',
      )}>
        {/* Header: time + status */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {match.scheduled_time
              ? format(new Date(match.scheduled_time), 'h:mm a')
              : 'TBA'}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Bo{match.best_of}</span>
            <span className={cn(
              'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium',
              match.status === 'ongoing'
                ? 'bg-yellow-500/10 text-yellow-400'
                : 'bg-muted text-muted-foreground',
            )}>
              {match.status === 'ongoing' && <AlertCircle className="w-2.5 h-2.5" />}
              {match.status === 'ongoing' ? 'Live' : 'Upcoming'}
            </span>
          </div>
        </div>

        {/* Teams */}
        <div className="space-y-2">
          <TeamRow
            squad={match.squad_a}
            sideBadge={match.toss_completed_at ? (match.blue_side_team === match.squad_a_id ? 'blue' : match.red_side_team === match.squad_a_id ? 'red' : undefined) : undefined}
            checkedIn={match.squad_a_checked_in}
            showCheckIn={canCheckIn && !!match.squad_a_id && expanded}
            onCheckIn={(val) => handleCheckIn('squad_a_checked_in', val)}
          />
          <div className="flex items-center gap-2 text-xs">
            <div className="flex-1 h-px bg-[#FF4500]/20" />
            <span className="text-[#FF4500] font-display font-bold tracking-wider text-[10px]">VS</span>
            <div className="flex-1 h-px bg-[#FF4500]/20" />
          </div>
          <TeamRow
            squad={match.squad_b}
            sideBadge={match.toss_completed_at ? (match.blue_side_team === match.squad_b_id ? 'blue' : match.red_side_team === match.squad_b_id ? 'red' : undefined) : undefined}
            checkedIn={match.squad_b_checked_in}
            showCheckIn={canCheckIn && !!match.squad_b_id && expanded}
            onCheckIn={(val) => handleCheckIn('squad_b_checked_in', val)}
          />
        </div>

        {/* Round info + share + expand */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-muted-foreground">
            Round {match.round} &middot; Match #{match.match_number}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              disabled={sharing}
              className="h-7 px-2 text-muted-foreground hover:text-[#FF4500]"
            >
              {sharing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
            </Button>
            {hasHostActions && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="h-7 px-2 text-muted-foreground hover:text-[#FF4500]"
              >
                <ChevronDown className={cn(
                  'w-3.5 h-3.5 transition-transform duration-200',
                  expanded && 'rotate-180'
                )} />
              </Button>
            )}
          </div>
        </div>

        {/* Expandable Host Actions Panel */}
        {hasHostActions && expanded && (
          <div className="border-t border-[#FF4500]/10 pt-3 space-y-2">
            <p className="text-[10px] font-display uppercase tracking-wider text-[#FF4500] font-medium">
              Host Actions
            </p>
            <div className="flex flex-wrap gap-2">
              {/* Toss */}
              {canDoToss && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-[#FF4500]/20 hover:border-[#FF4500]/40"
                  onClick={() => setTossMatch(match)}
                >
                  <Coins className="w-3.5 h-3.5 mr-1.5" />
                  Do Toss
                </Button>
              )}
              {canRedoToss && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-[#FF4500]/20 hover:border-[#FF4500]/40"
                  onClick={() => {
                    if (!tournamentId) return;
                    resetCoinToss.mutate(
                      { matchId: match.id, tournamentId, stageId: match.stage_id },
                      { onSuccess: () => { toast.success('Toss reset'); setTossMatch(match); } }
                    );
                  }}
                  disabled={resetCoinToss.isPending}
                >
                  <Coins className="w-3.5 h-3.5 mr-1.5" />
                  Redo Toss
                </Button>
              )}

              {/* Score Entry */}
              {canEditScore && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-[#FF4500]/20 hover:border-[#FF4500]/40"
                  onClick={() => setShowScoreSheet(true)}
                >
                  <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" />
                  Enter Result
                </Button>
              )}

              {/* Forfeit options */}
              {canForfeitA && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => handleForfeit(match.squad_b_id!)}
                  disabled={forfeitMatch.isPending}
                >
                  <Flag className="w-3.5 h-3.5 mr-1.5" />
                  Forfeit {match.squad_a?.name || 'A'}
                </Button>
              )}
              {canForfeitB && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => handleForfeit(match.squad_a_id!)}
                  disabled={forfeitMatch.isPending}
                >
                  <Flag className="w-3.5 h-3.5 mr-1.5" />
                  Forfeit {match.squad_b?.name || 'B'}
                </Button>
              )}
            </div>

            {/* Toss status indicator */}
            {match.toss_completed_at && (
              <p className="text-[10px] text-green-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Toss completed
              </p>
            )}
          </div>
        )}
      </GlowCard>

      {/* Score Edit Sheet */}
      {tournamentId && (
        <ScoreEditSheet
          match={showScoreSheet ? match : null}
          tournamentId={tournamentId}
          isHost={isHost}
          canEdit={isHost}
          open={showScoreSheet}
          onOpenChange={setShowScoreSheet}
        />
      )}

      {/* Coin Toss Overlay */}
      {tossMatch && tournamentId && tossMatch.squad_a && tossMatch.squad_b && (
        <CoinTossOverlay
          match={tossMatch}
          squadA={tossMatch.squad_a}
          squadB={tossMatch.squad_b}
          tournamentId={tournamentId}
          onClose={() => setTossMatch(null)}
          onSaved={() => setTossMatch(null)}
        />
      )}

      {/* Hidden render target for shareable card */}
      {renderCard && (
        <div
          ref={cardRef}
          style={{
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            width: '400px',
            backgroundColor: '#0a0a0a',
            fontFamily: 'Orbitron, Rajdhani, sans-serif',
          }}
        >
          <div style={{ padding: '24px', border: '1px solid rgba(255,69,0,0.3)', borderRadius: '12px' }}>
            {/* Tournament name */}
            <div style={{ color: '#FF4500', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
              {tournamentName}
            </div>

            {/* Schedule info */}
            <div style={{ color: '#888', fontSize: '11px', marginBottom: '16px' }}>
              {match.scheduled_time
                ? format(new Date(match.scheduled_time), 'EEEE, MMM d \u2022 h:mm a')
                : 'Schedule TBA'}
              {' \u2022 '}Bo{match.best_of}
            </div>

            {/* Separator */}
            <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(255,69,0,0.4), transparent)', marginBottom: '16px' }} />

            {/* Team A */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: '8px',
              marginBottom: '8px',
              backgroundColor: 'rgba(255,255,255,0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                {match.squad_a?.logo_url ? (
                  <img
                    src={match.squad_a.logo_url}
                    crossOrigin="anonymous"
                    style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#666', flexShrink: 0 }}>
                    {match.squad_a?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <span style={{ color: '#ccc', fontWeight: 600, fontSize: '15px' }}>
                  {match.squad_a?.name || 'TBD'}
                </span>
              </div>
            </div>

            {/* VS */}
            <div style={{ textAlign: 'center', color: 'rgba(255,69,0,0.5)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', margin: '4px 0' }}>
              VS
            </div>

            {/* Team B */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: '8px',
              marginBottom: '16px',
              backgroundColor: 'rgba(255,255,255,0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                {match.squad_b?.logo_url ? (
                  <img
                    src={match.squad_b.logo_url}
                    crossOrigin="anonymous"
                    style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#666', flexShrink: 0 }}>
                    {match.squad_b?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <span style={{ color: '#ccc', fontWeight: 600, fontSize: '15px' }}>
                  {match.squad_b?.name || 'TBD'}
                </span>
              </div>
            </div>

            {/* Round info */}
            <div style={{ color: '#666', fontSize: '10px', marginBottom: '16px' }}>
              Round {match.round} &middot; Match #{match.match_number}
            </div>

            {/* Branding footer */}
            <div style={{ borderTop: '1px solid rgba(255,69,0,0.2)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#FF4500', fontSize: '10px', letterSpacing: '0.25em', fontWeight: 700, textTransform: 'uppercase' }}>
                ShowYours
              </span>
              <span style={{ color: '#444', fontSize: '9px' }}>
                showyours.lovable.app
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TeamRow({
  squad,
  sideBadge,
  checkedIn,
  showCheckIn,
  onCheckIn,
}: {
  squad: TournamentMatch['squad_a'];
  sideBadge?: 'blue' | 'red';
  checkedIn?: boolean;
  showCheckIn?: boolean;
  onCheckIn?: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded">
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
      <Avatar className="h-6 w-6 shrink-0">
        {squad?.logo_url ? (
          <AvatarImage src={squad.logo_url} alt={squad.name} />
        ) : null}
        <AvatarFallback className="text-[10px] bg-[#1a1a1a] text-muted-foreground">
          {squad?.name?.charAt(0)?.toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium truncate">
        {squad?.name || 'TBD'}
      </span>
      {sideBadge && (
        <span className={cn(
          'text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0',
          sideBadge === 'blue'
            ? 'bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30'
            : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30',
        )}>
          {sideBadge === 'blue' ? 'Blue' : 'Red'}
        </span>
      )}
      {!showCheckIn && checkedIn !== undefined && checkedIn && (
        <span className="text-[9px] text-green-400 flex items-center gap-0.5 shrink-0">
          <Check className="w-3 h-3" />
        </span>
      )}
    </div>
  );
}
