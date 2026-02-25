import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GlowCard } from '@/components/tron/GlowCard';
import { captureAndShare, captureAndDownload } from '@/lib/screenshot';
import { useIsMobile } from '@/hooks/use-mobile';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Clock,
  Share2,
  Loader2,
  AlertCircle,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow } from 'date-fns';
import type { TournamentMatch } from '@/lib/tournament-types';

interface UpcomingMatchesProps {
  matches: TournamentMatch[];
  tournamentName: string;
}

export function UpcomingMatches({ matches, tournamentName }: UpcomingMatchesProps) {
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
}: {
  match: TournamentMatch;
  tournamentName: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [sharing, setSharing] = useState(false);
  const [renderCard, setRenderCard] = useState(false);

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
          <TeamRow squad={match.squad_a} sideBadge={match.toss_completed_at ? (match.blue_side_team === match.squad_a_id ? 'blue' : match.red_side_team === match.squad_a_id ? 'red' : undefined) : undefined} />
          <div className="flex items-center gap-2 text-xs">
            <div className="flex-1 h-px bg-[#FF4500]/20" />
            <span className="text-[#FF4500] font-display font-bold tracking-wider text-[10px]">VS</span>
            <div className="flex-1 h-px bg-[#FF4500]/20" />
          </div>
          <TeamRow squad={match.squad_b} sideBadge={match.toss_completed_at ? (match.blue_side_team === match.squad_b_id ? 'blue' : match.red_side_team === match.squad_b_id ? 'red' : undefined) : undefined} />
        </div>

        {/* Round info + share */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-muted-foreground">
            Round {match.round} &middot; Match #{match.match_number}
          </span>
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
        </div>
      </GlowCard>

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
}: {
  squad: TournamentMatch['squad_a'];
  sideBadge?: 'blue' | 'red';
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded">
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
    </div>
  );
}
