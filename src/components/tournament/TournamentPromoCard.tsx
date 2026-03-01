import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { captureAndShare, captureAndDownload } from '@/lib/screenshot';
import { useIsMobile } from '@/hooks/use-mobile';
import { Share2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { TOURNAMENT_FORMAT_LABELS } from '@/lib/tournament-types';
import type { Tournament } from '@/lib/tournament-types';

interface TournamentPromoCardProps {
  tournament: Tournament;
  spotsLeft: number;
  registrationCount: number;
}

export function TournamentPromoCard({
  tournament,
  spotsLeft,
  registrationCount,
}: TournamentPromoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [sharing, setSharing] = useState(false);
  const [renderCard, setRenderCard] = useState(false);

  const filename = `showyours-${tournament.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
  const fillPercent = tournament.max_squads > 0 ? (registrationCount / tournament.max_squads) * 100 : 0;

  const handleShare = async () => {
    setSharing(true);
    setRenderCard(true);

    await new Promise<void>(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );

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

  const dateStr = format(new Date(tournament.date_time), 'EEEE, MMMM d, yyyy');
  const timeStr = format(new Date(tournament.date_time), 'h:mm a');
  const formatLabel = tournament.format ? TOURNAMENT_FORMAT_LABELS[tournament.format] : null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleShare}
        disabled={sharing}
        className="text-muted-foreground hover:text-[#FF4500]"
      >
        {sharing ? (
          <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
        ) : (
          <Share2 className="w-4 h-4 mr-1.5" />
        )}
        Share
      </Button>

      {renderCard && (
        <div
          ref={cardRef}
          style={{
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            width: '480px',
            backgroundColor: '#0a0a0a',
            fontFamily: 'Orbitron, Rajdhani, sans-serif',
          }}
        >
          <div style={{
            padding: '32px',
            border: '1px solid rgba(255,69,0,0.3)',
            borderRadius: '16px',
          }}>
            {/* Header */}
            <div style={{
              color: '#FF4500',
              fontSize: '11px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              fontWeight: 700,
              marginBottom: '8px',
            }}>
              Tournament
            </div>

            {/* Tournament Name */}
            <div style={{
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: '20px',
              wordBreak: 'break-word',
            }}>
              {tournament.name}
            </div>

            {/* Separator */}
            <div style={{
              height: '1px',
              background: 'linear-gradient(90deg, rgba(255,69,0,0.5), transparent)',
              marginBottom: '20px',
            }} />

            {/* Details Grid */}
            <div style={{ marginBottom: '20px' }}>
              <DetailRow label="Date" value={dateStr} />
              <DetailRow label="Time" value={timeStr} />
              {tournament.prize_pool && (
                <DetailRow label="Prize Pool" value={tournament.prize_pool} highlight />
              )}
              {tournament.team_size && formatLabel && (
                <DetailRow label="Format" value={`${tournament.team_size} ${formatLabel}`} />
              )}
              {tournament.entry_fee && (
                <DetailRow label="Entry Fee" value={tournament.entry_fee} />
              )}
              {tournament.region && (
                <DetailRow label="Region" value={tournament.region} />
              )}
            </div>

            {/* Registration Progress */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              {/* Progress bar */}
              <div style={{
                height: '8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                marginBottom: '12px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  borderRadius: '4px',
                  background: 'linear-gradient(90deg, #FF4500, #FF6B35)',
                  width: `${fillPercent}%`,
                  transition: 'width 0.3s',
                }} />
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
              }}>
                <div>
                  <div style={{ color: '#888', fontSize: '11px', marginBottom: '2px' }}>
                    {registrationCount} / {tournament.max_squads} squads registered
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    color: spotsLeft <= 5 ? '#FF4500' : '#ffffff',
                    fontSize: '28px',
                    fontWeight: 800,
                    lineHeight: 1,
                  }}>
                    {spotsLeft}
                  </div>
                  <div style={{ color: '#888', fontSize: '10px', marginTop: '2px' }}>
                    spots left
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div style={{
              textAlign: 'center',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255,69,0,0.1)',
              border: '1px solid rgba(255,69,0,0.3)',
              marginBottom: '20px',
            }}>
              <span style={{
                color: '#FF4500',
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}>
                {spotsLeft > 0 ? 'Register Now' : 'Registration Full'}
              </span>
            </div>

            {/* Branding footer */}
            <div style={{
              borderTop: '1px solid rgba(255,69,0,0.2)',
              paddingTop: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{
                color: '#FF4500',
                fontSize: '11px',
                letterSpacing: '0.25em',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}>
                ShowYours
              </span>
              <span style={{ color: '#444', fontSize: '10px' }}>
                showyours.lovable.app
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DetailRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '6px 0',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
    }}>
      <span style={{ color: '#666', fontSize: '12px' }}>{label}</span>
      <span style={{
        color: highlight ? '#FFD700' : '#ccc',
        fontSize: '13px',
        fontWeight: 600,
      }}>
        {value}
      </span>
    </div>
  );
}
