import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { captureAndShare, captureAndDownload } from '@/lib/screenshot';
import { useIsMobile } from '@/hooks/use-mobile';
import { Share2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { TournamentMatch } from '@/lib/tournament-types';

interface ShareCardGeneratorProps {
  match: TournamentMatch;
  tournamentName: string;
}

export function ShareCardGenerator({ match, tournamentName }: ShareCardGeneratorProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [sharing, setSharing] = useState(false);
  const [renderCard, setRenderCard] = useState(false);

  if (match.status !== 'completed') return null;

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
  const filename = `showyours-${sanitize(match.squad_a?.name || 'teamA')}-vs-${sanitize(match.squad_b?.name || 'teamB')}`;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSharing(true);
    setRenderCard(true);

    // Wait for DOM paint
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

  const displayDate = match.completed_at || match.scheduled_time || match.created_at;
  const isSquadAWinner = match.winner_id === match.squad_a_id;
  const isSquadBWinner = match.winner_id === match.squad_b_id;

  // Inline SVG trophy for html2canvas compatibility
  const trophySvg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>')}`;

  return (
    <>
      {/* Share button */}
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

      {/* Hidden render target for html2canvas — only in DOM during capture */}
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

            {/* Round info */}
            <div style={{ color: '#888', fontSize: '11px', marginBottom: '16px' }}>
              Round {match.round} &middot; Match #{match.match_number}
            </div>

            {/* Separator */}
            <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(255,69,0,0.4), transparent)', marginBottom: '16px' }} />

            {/* Team A */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: '8px',
                marginBottom: '8px',
                ...(isSquadAWinner
                  ? { backgroundColor: 'rgba(255,215,0,0.08)', borderLeft: '3px solid #FFD700' }
                  : { backgroundColor: 'rgba(255,255,255,0.03)' }),
              }}
            >
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
                <span style={{ color: isSquadAWinner ? '#FFD700' : '#aaa', fontWeight: isSquadAWinner ? 700 : 400, fontSize: '15px' }}>
                  {match.squad_a?.name || 'TBD'}
                </span>
                {isSquadAWinner && (
                  <img src={trophySvg} style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                )}
              </div>
              <span style={{ color: isSquadAWinner ? '#FFD700' : '#555', fontWeight: 800, fontSize: '22px', fontFamily: 'Orbitron, monospace' }}>
                {match.squad_a_score}
              </span>
            </div>

            {/* VS */}
            <div style={{ textAlign: 'center', color: 'rgba(255,69,0,0.5)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', margin: '4px 0' }}>
              VS
            </div>

            {/* Team B */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: '8px',
                marginBottom: '16px',
                ...(isSquadBWinner
                  ? { backgroundColor: 'rgba(255,215,0,0.08)', borderLeft: '3px solid #FFD700' }
                  : { backgroundColor: 'rgba(255,255,255,0.03)' }),
              }}
            >
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
                <span style={{ color: isSquadBWinner ? '#FFD700' : '#aaa', fontWeight: isSquadBWinner ? 700 : 400, fontSize: '15px' }}>
                  {match.squad_b?.name || 'TBD'}
                </span>
                {isSquadBWinner && (
                  <img src={trophySvg} style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                )}
              </div>
              <span style={{ color: isSquadBWinner ? '#FFD700' : '#555', fontWeight: 800, fontSize: '22px', fontFamily: 'Orbitron, monospace' }}>
                {match.squad_b_score}
              </span>
            </div>

            {/* Date */}
            <div style={{ color: '#666', fontSize: '10px', marginBottom: '16px' }}>
              {format(new Date(displayDate), 'MMM d, yyyy \u2022 h:mm a')}
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
