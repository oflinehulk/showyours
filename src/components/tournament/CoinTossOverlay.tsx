import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { X, RefreshCw, Check, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { secureCoinFlip } from '@/lib/secure-random';
import { resumeAudioContext, playDrumRoll, playImpactHit, playRevealFlourish } from '@/lib/audio-effects';
import { useSaveCoinToss } from '@/hooks/useTournaments';
import type { TournamentMatch, TournamentSquad } from '@/lib/tournament-types';

type Phase = 'pre-toss' | 'spinning' | 'result';

interface CoinTossOverlayProps {
  match: TournamentMatch;
  squadA: TournamentSquad;
  squadB: TournamentSquad;
  tournamentId: string;
  onClose: () => void;
  onSaved?: () => void;
}

export function CoinTossOverlay({
  match,
  squadA,
  squadB,
  tournamentId,
  onClose,
  onSaved,
}: CoinTossOverlayProps) {
  const [phase, setPhase] = useState<Phase>('pre-toss');
  const [winner, setWinner] = useState<'a' | 'b' | null>(null);
  const [blueSide, setBlueSide] = useState<'a' | 'b' | null>(null);
  const [spinRotation, setSpinRotation] = useState(0);
  const saveToss = useSaveCoinToss();
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, []);

  const winnerSquad = winner === 'a' ? squadA : winner === 'b' ? squadB : null;

  const handleFlip = useCallback(async () => {
    await resumeAudioContext();
    const result = secureCoinFlip(); // 0 = A wins, 1 = B wins
    const winSide: 'a' | 'b' = result === 0 ? 'a' : 'b';

    // Determine rotation: even multiples of 360 = heads (A), odd = tails (B)
    const baseSpins = 5; // minimum full rotations
    const totalRotation = (baseSpins * 360) + (winSide === 'a' ? 0 : 180);
    setSpinRotation(totalRotation);

    setPhase('spinning');
    playDrumRoll(2500);

    // After spin completes
    const t1 = setTimeout(() => {
      playImpactHit();
      setWinner(winSide);
      setBlueSide(winSide); // winner defaults to Blue Side
      setPhase('result');

      const t2 = setTimeout(() => {
        playRevealFlourish();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.5 },
          colors: ['#FF4500', '#3B82F6', '#EF4444', '#ffffff'],
        });
      }, 300);
      timersRef.current.push(t2);
    }, 2600);
    timersRef.current.push(t1);
  }, []);

  const handleSwapSides = () => {
    setBlueSide(prev => prev === 'a' ? 'b' : 'a');
  };

  const handleConfirm = async () => {
    if (!winner || !blueSide) return;
    const blueTeam = blueSide === 'a' ? squadA.id : squadB.id;
    const redTeam = blueSide === 'a' ? squadB.id : squadA.id;
    const tossWinner = winner === 'a' ? squadA.id : squadB.id;

    try {
      await saveToss.mutateAsync({
        matchId: match.id,
        tournamentId,
        stageId: match.stage_id,
        tossWinner,
        blueSideTeam: blueTeam,
        redSideTeam: redTeam,
      });
      onSaved?.();
      onClose();
    } catch { /* toast handled by caller */ }
  };

  const handleReflip = () => {
    setPhase('pre-toss');
    setWinner(null);
    setBlueSide(null);
    setSpinRotation(0);
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'spinning') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, onClose]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Close button */}
        {phase !== 'spinning' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        <div className="w-full max-w-md mx-auto px-4">
          {/* Title */}
          <motion.h2
            className="text-center text-lg font-bold text-white mb-6"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            {phase === 'pre-toss' && 'Coin Toss — Side Selection'}
            {phase === 'spinning' && 'Flipping...'}
            {phase === 'result' && 'Toss Result'}
          </motion.h2>

          {/* Teams */}
          <div className="flex items-center justify-between mb-8">
            <TeamDisplay squad={squadA} label="Team A" highlight={winner === 'a'} />
            <span className="text-white/40 text-sm font-medium">VS</span>
            <TeamDisplay squad={squadB} label="Team B" highlight={winner === 'b'} />
          </div>

          {/* Coin */}
          <div className="flex justify-center mb-8" style={{ perspective: '600px' }}>
            <motion.div
              className="relative w-28 h-28 sm:w-32 sm:h-32"
              style={{ transformStyle: 'preserve-3d' }}
              animate={{
                rotateY: phase === 'spinning' ? spinRotation : phase === 'pre-toss' ? [0, 10, -10, 0] : spinRotation,
              }}
              transition={
                phase === 'spinning'
                  ? { duration: 2.5, ease: [0.25, 0.1, 0.25, 1] }
                  : phase === 'pre-toss'
                    ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0 }
              }
            >
              {/* Heads — Team A */}
              <div
                className="absolute inset-0 rounded-full border-4 border-[#3B82F6]/60 bg-gradient-to-br from-[#1e3a5f] to-[#0f1f33] flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="text-center">
                  <Avatar className="h-12 w-12 mx-auto mb-1 border-2 border-[#3B82F6]/40">
                    {squadA.logo_url ? <AvatarImage src={squadA.logo_url} /> : null}
                    <AvatarFallback className="bg-[#1a1a2e] text-[#3B82F6] text-lg font-bold">
                      {squadA.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-[10px] text-[#3B82F6] font-bold truncate max-w-[80px]">{squadA.name}</p>
                </div>
              </div>

              {/* Tails — Team B */}
              <div
                className="absolute inset-0 rounded-full border-4 border-[#EF4444]/60 bg-gradient-to-br from-[#5f1e1e] to-[#330f0f] flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.3)]"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div className="text-center">
                  <Avatar className="h-12 w-12 mx-auto mb-1 border-2 border-[#EF4444]/40">
                    {squadB.logo_url ? <AvatarImage src={squadB.logo_url} /> : null}
                    <AvatarFallback className="bg-[#2e1a1a] text-[#EF4444] text-lg font-bold">
                      {squadB.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-[10px] text-[#EF4444] font-bold truncate max-w-[80px]">{squadB.name}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Pre-toss: Flip button */}
          {phase === 'pre-toss' && (
            <motion.div
              className="flex justify-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                size="lg"
                className="btn-gaming text-base px-8"
                onClick={handleFlip}
              >
                Flip Coin
              </Button>
            </motion.div>
          )}

          {/* Spinning: loading text */}
          {phase === 'spinning' && (
            <p className="text-center text-white/40 text-sm animate-pulse">The coin is in the air...</p>
          )}

          {/* Result: winner + side assignment */}
          {phase === 'result' && winnerSquad && blueSide && (
            <motion.div
              className="space-y-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {/* Winner announcement */}
              <div className="text-center">
                <p className="text-sm text-white/60 mb-1">Toss Won By</p>
                <p className="text-xl font-bold text-[#FF4500]">{winnerSquad.name}</p>
              </div>

              {/* Side assignment */}
              <div className="flex items-center gap-3 justify-center">
                <SideCard
                  color="blue"
                  label="Blue Side"
                  squad={blueSide === 'a' ? squadA : squadB}
                />
                <button
                  onClick={handleSwapSides}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  title="Swap sides"
                >
                  <ArrowLeftRight className="w-4 h-4 text-white/60" />
                </button>
                <SideCard
                  color="red"
                  label="Red Side"
                  squad={blueSide === 'a' ? squadB : squadA}
                />
              </div>
              <p className="text-center text-[10px] text-white/30">
                Tap the arrows to swap side assignments
              </p>

              {/* Actions */}
              <div className="flex gap-2 justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReflip}
                  className="border-white/20 text-white/70 hover:text-white"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Re-flip
                </Button>
                <Button
                  size="sm"
                  className="btn-gaming"
                  onClick={handleConfirm}
                  disabled={saveToss.isPending}
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  {saveToss.isPending ? 'Saving...' : 'Confirm & Save'}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

function TeamDisplay({ squad, label, highlight }: { squad: TournamentSquad; label: string; highlight: boolean }) {
  return (
    <div className={cn('flex flex-col items-center gap-2 transition-all', highlight && 'scale-110')}>
      <Avatar className={cn('h-14 w-14 border-2', highlight ? 'border-[#FF4500]' : 'border-white/20')}>
        {squad.logo_url ? <AvatarImage src={squad.logo_url} alt={squad.name} /> : null}
        <AvatarFallback className="bg-[#1a1a1a] text-white text-lg font-bold">
          {squad.name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="text-center">
        <p className={cn('text-sm font-semibold truncate max-w-[100px]', highlight ? 'text-[#FF4500]' : 'text-white')}>
          {squad.name}
        </p>
        <p className="text-[10px] text-white/40">{label}</p>
      </div>
    </div>
  );
}

function SideCard({ color, label, squad }: { color: 'blue' | 'red'; label: string; squad: TournamentSquad }) {
  const isBlue = color === 'blue';
  return (
    <div className={cn(
      'flex flex-col items-center gap-1.5 p-3 rounded-lg border min-w-[90px] sm:min-w-[110px]',
      isBlue
        ? 'bg-[#3B82F6]/10 border-[#3B82F6]/30'
        : 'bg-[#EF4444]/10 border-[#EF4444]/30',
    )}>
      <span className={cn(
        'text-[10px] font-bold uppercase tracking-wider',
        isBlue ? 'text-[#3B82F6]' : 'text-[#EF4444]',
      )}>
        {label}
      </span>
      <Avatar className="h-8 w-8">
        {squad.logo_url ? <AvatarImage src={squad.logo_url} alt={squad.name} /> : null}
        <AvatarFallback className="bg-[#1a1a1a] text-white text-xs font-bold">
          {squad.name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <p className={cn(
        'text-xs font-medium truncate max-w-[90px]',
        isBlue ? 'text-[#3B82F6]' : 'text-[#EF4444]',
      )}>
        {squad.name}
      </p>
    </div>
  );
}
