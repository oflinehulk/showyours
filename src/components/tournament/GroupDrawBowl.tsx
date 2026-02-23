import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { X, Play, RefreshCw, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { secureShuffleArray, generateDrawSeed } from '@/lib/secure-random';
import { resumeAudioContext, playWhoosh, playImpactHit, playRevealFlourish } from '@/lib/audio-effects';
import { useSaveGroupDraw } from '@/hooks/useTournaments';
import { GroupDrawShareButton } from '@/components/tournament/GroupDrawShareCard';
import type { TournamentSquad, TournamentStage, GroupDrawEntry } from '@/lib/tournament-types';

type Phase = 'setup' | 'drawing' | 'result';

interface GroupDrawBowlProps {
  tournamentId: string;
  tournamentName?: string;
  stage: TournamentStage;
  squads: TournamentSquad[];
  onClose: () => void;
  onConfirmed?: () => void;
}

export function GroupDrawBowl({
  tournamentId,
  tournamentName,
  stage,
  squads,
  onClose,
  onConfirmed,
}: GroupDrawBowlProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [drawSeed, setDrawSeed] = useState('');
  const [sequence, setSequence] = useState<GroupDrawEntry[]>([]);
  const [revealIndex, setRevealIndex] = useState(-1);
  const [isAnimating, setIsAnimating] = useState(false);
  const saveGroupDraw = useSaveGroupDraw();
  const autoDrawRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const groupCount = stage.group_count;
  const groupLabels = Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i));

  // Pre-compute draw sequence
  const startDraw = useCallback(async () => {
    await resumeAudioContext();
    const seed = generateDrawSeed();
    const shuffled = secureShuffleArray(squads);

    // Round-robin assignment: squad 0 → Group A, squad 1 → Group B, ..., repeat
    const entries: GroupDrawEntry[] = shuffled.map((squad, i) => ({
      squad_id: squad.id,
      squad_name: squad.name,
      group_label: groupLabels[i % groupCount],
      draw_order: i,
    }));

    setDrawSeed(seed);
    setSequence(entries);
    setRevealIndex(-1);
    setPhase('drawing');
  }, [squads, groupCount, groupLabels]);

  // Reveal next team
  const revealNext = useCallback(() => {
    if (isAnimating) return;
    const nextIdx = revealIndex + 1;
    if (nextIdx >= sequence.length) return;

    setIsAnimating(true);
    playWhoosh();

    setTimeout(() => {
      setRevealIndex(nextIdx);
      playImpactHit();
      setIsAnimating(false);

      // If last team, transition to result
      if (nextIdx === sequence.length - 1) {
        setTimeout(() => {
          setPhase('result');
          playRevealFlourish();
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.5 },
            colors: ['#FF4500', '#FF6B35', '#3B82F6', '#ffffff'],
          });
        }, 600);
      }
    }, 400);
  }, [revealIndex, sequence, isAnimating]);

  // Auto-draw remaining
  const autoDrawAll = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    let idx = revealIndex + 1;
    const doNext = () => {
      if (idx >= sequence.length) {
        setIsAnimating(false);
        return;
      }
      playWhoosh();
      setTimeout(() => {
        setRevealIndex(idx);
        playImpactHit();
        idx++;
        if (idx < sequence.length) {
          autoDrawRef.current = setTimeout(doNext, 500);
        } else {
          setIsAnimating(false);
          setTimeout(() => {
            setPhase('result');
            playRevealFlourish();
            confetti({
              particleCount: 100,
              spread: 80,
              origin: { y: 0.5 },
              colors: ['#FF4500', '#FF6B35', '#3B82F6', '#ffffff'],
            });
          }, 600);
        }
      }, 300);
    };
    doNext();
  }, [revealIndex, sequence, isAnimating]);

  // Cleanup auto-draw on unmount
  useEffect(() => {
    return () => {
      if (autoDrawRef.current) clearTimeout(autoDrawRef.current);
    };
  }, []);

  const handleConfirm = async () => {
    try {
      await saveGroupDraw.mutateAsync({
        tournamentId,
        stageId: stage.id,
        groupCount,
        drawSeed,
        drawSequence: sequence,
      });
      onConfirmed?.();
      onClose();
    } catch { /* error toast handled by hook */ }
  };

  const handleRedo = () => {
    if (autoDrawRef.current) clearTimeout(autoDrawRef.current);
    setPhase('setup');
    setSequence([]);
    setRevealIndex(-1);
    setDrawSeed('');
  };

  // Build group display from revealed entries
  const groupDisplay = groupLabels.map(label => ({
    label,
    squads: sequence
      .filter((e, i) => i <= revealIndex && e.group_label === label)
      .map(e => squads.find(s => s.id === e.squad_id)!)
      .filter(Boolean),
  }));

  const remainingCount = sequence.length - (revealIndex + 1);

  // Close on Escape (not during animation)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isAnimating) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAnimating, onClose]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex flex-col bg-[#0a0a0a] overflow-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-base font-bold text-white">
            Group Draw — {stage.name}
          </h2>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-6xl mx-auto w-full">
          {/* Left: Bowl / controls */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            {phase === 'setup' && (
              <motion.div
                className="text-center space-y-6"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                {/* Bowl illustration */}
                <div className="relative w-48 h-32 mx-auto">
                  <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-[#FF4500]/20 to-transparent rounded-b-[60%] border-2 border-[#FF4500]/30 border-t-0" />
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-1 w-32">
                    {squads.slice(0, 12).map((s, i) => (
                      <motion.div
                        key={s.id}
                        className="w-5 h-5 rounded-full bg-[#FF4500]/40 border border-[#FF4500]/60"
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                      />
                    ))}
                    {squads.length > 12 && (
                      <span className="text-[9px] text-white/40">+{squads.length - 12}</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-white/60 text-sm">{squads.length} teams into {groupCount} groups</p>
                  <p className="text-white/30 text-xs mt-1">Cryptographically secure random shuffle</p>
                </div>

                <Button
                  size="lg"
                  className="btn-gaming text-base px-8"
                  onClick={startDraw}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Draw
                </Button>
              </motion.div>
            )}

            {phase === 'drawing' && (
              <div className="text-center space-y-6 w-full max-w-xs">
                {/* Bowl with remaining balls */}
                <div className="relative w-48 h-32 mx-auto">
                  <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-[#FF4500]/20 to-transparent rounded-b-[60%] border-2 border-[#FF4500]/30 border-t-0" />
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-1 w-32">
                    {Array.from({ length: Math.min(remainingCount, 12) }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-5 h-5 rounded-full bg-[#FF4500]/40 border border-[#FF4500]/60"
                        animate={{ y: [0, -2, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>

                {/* Current reveal animation */}
                <AnimatePresence mode="wait">
                  {revealIndex >= 0 && (
                    <motion.div
                      key={revealIndex}
                      className="flex items-center gap-2 justify-center p-3 rounded-lg border border-[#FF4500]/30 bg-[#FF4500]/5"
                      initial={{ y: -40, opacity: 0, scale: 0.8 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', damping: 12 }}
                    >
                      <Avatar className="h-7 w-7">
                        {squads.find(s => s.id === sequence[revealIndex]?.squad_id)?.logo_url ? (
                          <AvatarImage src={squads.find(s => s.id === sequence[revealIndex]?.squad_id)!.logo_url!} />
                        ) : null}
                        <AvatarFallback className="bg-[#1a1a1a] text-white text-xs font-bold">
                          {sequence[revealIndex]?.squad_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-white">{sequence[revealIndex]?.squad_name}</span>
                      <span className="text-xs font-bold text-[#FF4500]">→ Group {sequence[revealIndex]?.group_label}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-white/40 text-xs">{remainingCount} remaining</p>

                <div className="flex gap-2 justify-center">
                  <Button
                    size="sm"
                    className="btn-gaming"
                    onClick={revealNext}
                    disabled={isAnimating || remainingCount === 0}
                  >
                    Draw Next
                  </Button>
                  {remainingCount > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-white/70 hover:text-white"
                      onClick={autoDrawAll}
                      disabled={isAnimating}
                    >
                      Draw All
                    </Button>
                  )}
                </div>
              </div>
            )}

            {phase === 'result' && (
              <motion.div
                className="text-center space-y-4"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <h3 className="text-lg font-bold text-white">Draw Complete</h3>
                <p className="text-white/40 text-xs">Seed: {drawSeed.slice(0, 12)}...</p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white/70 hover:text-white"
                    onClick={handleRedo}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Redo Draw
                  </Button>
                  <Button
                    size="sm"
                    className="btn-gaming"
                    onClick={handleConfirm}
                    disabled={saveGroupDraw.isPending}
                  >
                    {saveGroupDraw.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Confirm & Save
                  </Button>
                </div>
                {tournamentName && (
                  <div className="pt-2 flex justify-center">
                    <GroupDrawShareButton
                      tournamentName={tournamentName}
                      stageName={stage.name}
                      drawSeed={drawSeed}
                      sequence={sequence}
                      groupLabels={groupLabels}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Right: Group grid */}
          {(phase === 'drawing' || phase === 'result') && (
            <div className="lg:w-96 grid grid-cols-2 gap-3 auto-rows-min">
              {groupDisplay.map(group => (
                <div
                  key={group.label}
                  className={cn(
                    'p-3 rounded-lg border transition-all',
                    group.squads.length > 0
                      ? 'bg-white/5 border-[#FF4500]/20'
                      : 'bg-white/[0.02] border-white/10',
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded bg-[#FF4500]/10 border border-[#FF4500]/30 flex items-center justify-center text-xs font-bold text-[#FF4500]">
                      {group.label}
                    </div>
                    <span className="text-[10px] text-white/40">{group.squads.length} teams</span>
                  </div>
                  <div className="space-y-1 min-h-[40px]">
                    {group.squads.map((squad) => (
                      <motion.div
                        key={squad.id}
                        className="flex items-center gap-1.5 p-1 rounded bg-white/5"
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ type: 'spring', damping: 15 }}
                      >
                        <Avatar className="h-4 w-4 shrink-0">
                          {squad.logo_url ? <AvatarImage src={squad.logo_url} alt={squad.name} /> : null}
                          <AvatarFallback className="text-[7px] bg-[#1a1a1a] text-white/70">
                            {squad.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] text-white/80 font-medium truncate">{squad.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
