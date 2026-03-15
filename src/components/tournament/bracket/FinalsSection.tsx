import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { BracketMatchCard } from './BracketMatchCard';
import type { GlobalMatchInfo } from './bracket-helpers';
import type { TournamentMatch } from '@/lib/tournament-types';

interface FinalsSectionProps {
  semiFinalsMatches: TournamentMatch[];
  finalsMatches: TournamentMatch[];
  globalMatchMap: Map<string, GlobalMatchInfo>;
  onMatchClick: (match: TournamentMatch) => void;
}

export function FinalsSection({
  semiFinalsMatches,
  finalsMatches,
  globalMatchMap,
  onMatchClick,
}: FinalsSectionProps) {
  const isMobile = useIsMobile();
  const CARD_W = isMobile ? 190 : 260;

  if (semiFinalsMatches.length === 0 && finalsMatches.length === 0) return null;

  return (
    <div className="flex items-center gap-4 md:gap-6 shrink-0 pl-4 md:pl-6">
      {/* Connector line from bracket to finals */}
      <div className="w-6 md:w-8 flex items-center">
        <div className="w-full h-px bg-[#FF4500]/20" />
      </div>

      {/* Semi-Finals */}
      {semiFinalsMatches.length > 0 && (
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[10px] font-display font-bold text-orange-400 uppercase tracking-wider">
              Semi-Final
            </span>
          </div>
          {semiFinalsMatches.map((match) => {
            const gn = globalMatchMap.get(match.id);
            return (
              <div key={match.id} className="flex flex-col items-center gap-1">
                {gn && (
                  <span className="text-[9px] font-display font-bold text-[#FF6B35] uppercase tracking-wider">
                    M{gn.globalNumber}
                  </span>
                )}
                <BracketMatchCard
                  match={match}
                  globalNumber={gn?.globalNumber}
                  onClick={() => onMatchClick(match)}
                  bracketType="losers"
                  cardWidth={CARD_W}
                  compact={isMobile}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Connector between SF and GF */}
      {semiFinalsMatches.length > 0 && finalsMatches.length > 0 && (
        <div className="w-6 md:w-8 flex items-center">
          <div className="w-full h-px bg-[#FF4500]/20" />
        </div>
      )}

      {/* Grand Final */}
      {finalsMatches.length > 0 && (
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-[10px] font-display font-bold text-yellow-500 uppercase tracking-wider">
              Grand Final
            </span>
          </div>
          {finalsMatches.map((match) => {
            const gn = globalMatchMap.get(match.id);
            const winner = match.winner_id
              ? (match.winner_id === match.squad_a_id ? match.squad_a : match.squad_b)
              : null;

            return (
              <div key={match.id} className="flex flex-col items-center gap-1.5">
                {gn && (
                  <span className="text-[9px] font-display font-bold text-yellow-500 uppercase tracking-wider">
                    M{gn.globalNumber}
                  </span>
                )}
                <div className={cn(
                  'rounded-xl p-[2px]',
                  'bg-gradient-to-br from-yellow-500/30 via-[#FF4500]/20 to-yellow-500/30',
                )}>
                  <BracketMatchCard
                    match={match}
                    globalNumber={gn?.globalNumber}
                    onClick={() => onMatchClick(match)}
                    bracketType="winners"
                    cardWidth={CARD_W}
                    compact={isMobile}
                  />
                </div>

                {/* Champion badge */}
                {winner && match.status === 'completed' && (
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30">
                      <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                      <span className="text-[10px] font-display font-bold text-yellow-500 uppercase tracking-wider">
                        Champion
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-foreground">
                      {winner.name}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
