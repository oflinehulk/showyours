import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { captureAndShare, captureAndDownload } from '@/lib/screenshot';
import type { GroupDrawEntry } from '@/lib/tournament-types';

interface GroupDrawShareCardProps {
  tournamentName: string;
  stageName: string;
  drawSeed: string;
  sequence: GroupDrawEntry[];
  groupLabels: string[];
}

export function GroupDrawShareButton({
  tournamentName,
  stageName,
  drawSeed,
  sequence,
  groupLabels,
}: GroupDrawShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [renderCard, setRenderCard] = useState(false);
  const [sharing, setSharing] = useState(false);

  const groupMap = new Map<string, GroupDrawEntry[]>();
  for (const label of groupLabels) groupMap.set(label, []);
  for (const entry of sequence) {
    groupMap.get(entry.group_label)?.push(entry);
  }

  const hasPots = sequence.some(e => e.pot_number != null);

  const POT_COLORS: Record<number, string> = {
    1: '#EAB308',
    2: '#3B82F6',
    3: '#22C55E',
    4: '#A855F7',
  };

  const handleCapture = async (mode: 'share' | 'download') => {
    setSharing(true);
    setRenderCard(true);

    // Wait for DOM paint
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    try {
      if (!cardRef.current) return;
      const filename = `draw-${stageName.replace(/\s+/g, '_').toLowerCase()}.png`;
      if (mode === 'share') {
        await captureAndShare(cardRef.current, filename);
      } else {
        await captureAndDownload(cardRef.current, filename);
      }
    } finally {
      setRenderCard(false);
      setSharing(false);
    }
  };

  // 2-column grid, up to 26 groups supported
  const cols = groupLabels.length <= 4 ? 2 : 3;

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-white/20 text-white/70 hover:text-white"
          onClick={() => handleCapture('download')}
          disabled={sharing}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Download
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-white/20 text-white/70 hover:text-white"
          onClick={() => handleCapture('share')}
          disabled={sharing}
        >
          <Share2 className="w-3.5 h-3.5 mr-1.5" />
          Share
        </Button>
      </div>

      {/* Hidden card for capture */}
      {renderCard && (
        <div
          ref={cardRef}
          style={{
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            width: '500px',
            padding: '24px',
            backgroundColor: '#0a0a0a',
            fontFamily: 'Orbitron, Rajdhani, sans-serif',
            color: '#ffffff',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{
              fontSize: '10px',
              color: '#FF4500',
              textTransform: 'uppercase' as const,
              letterSpacing: '2px',
              marginBottom: '4px',
            }}>
              Group Draw Results
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: '4px',
            }}>
              {tournamentName}
            </div>
            <div style={{
              fontSize: '11px',
              color: '#999999',
            }}>
              {stageName}
            </div>
            {hasPots && (
              <div style={{
                fontSize: '9px',
                color: '#EAB308',
                marginTop: '4px',
                textTransform: 'uppercase' as const,
                letterSpacing: '1px',
              }}>
                Pot-Seeded Draw
              </div>
            )}
          </div>

          {/* Separator */}
          <div style={{
            height: '2px',
            background: 'linear-gradient(to right, transparent, #FF4500, transparent)',
            marginBottom: '16px',
          }} />

          {/* Groups grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: '12px',
            marginBottom: '16px',
          }}>
            {groupLabels.map(label => {
              const entries = groupMap.get(label) || [];
              return (
                <div key={label} style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,69,0,0.2)',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px',
                  }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255,69,0,0.1)',
                      border: '1px solid rgba(255,69,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#FF4500',
                    }}>
                      {label}
                    </div>
                    <span style={{ fontSize: '10px', color: '#666666' }}>
                      Group {label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
                    {entries.map(entry => (
                      <div key={entry.squad_id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                      }}>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: '#1a1a1a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '8px',
                          fontWeight: 700,
                          color: '#666666',
                        }}>
                          {entry.squad_name.charAt(0)}
                        </div>
                        <span style={{ fontSize: '10px', color: '#cccccc', flex: 1 }}>
                          {entry.squad_name}
                        </span>
                        {entry.pot_number != null && (
                          <span style={{
                            fontSize: '7px',
                            fontWeight: 700,
                            padding: '1px 4px',
                            borderRadius: '3px',
                            backgroundColor: `${POT_COLORS[entry.pot_number] ?? '#FF4500'}20`,
                            color: POT_COLORS[entry.pot_number] ?? '#FF4500',
                          }}>
                            P{entry.pot_number}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            <span style={{ fontSize: '8px', color: '#444444' }}>
              Seed: {drawSeed.slice(0, 16)}
            </span>
            <span style={{ fontSize: '9px', color: '#FF4500', fontWeight: 700 }}>
              ShowYours
            </span>
          </div>
        </div>
      )}
    </>
  );
}
