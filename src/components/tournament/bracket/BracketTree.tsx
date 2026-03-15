import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Zap } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { BracketMatchCard } from './BracketMatchCard';
import { BracketConnectors, computeBracketLayout } from './BracketConnectors';
import { isByeMatch, getWBRoundLabel, getLBRoundLabel } from './bracket-helpers';
import type { GlobalMatchInfo } from './bracket-helpers';
import type { TournamentMatch } from '@/lib/tournament-types';

interface BracketTreeProps {
  matches: TournamentMatch[];
  bracketType: 'winners' | 'losers';
  globalMatchMap: Map<string, GlobalMatchInfo>;
  totalWBRounds: number;
  onMatchClick: (match: TournamentMatch) => void;
  onWildCard?: (match: TournamentMatch) => void;
  lbRound1?: number;
}

export function BracketTree({
  matches,
  bracketType,
  globalMatchMap,
  totalWBRounds,
  onMatchClick,
  onWildCard,
  lbRound1,
}: BracketTreeProps) {
  const isMobile = useIsMobile();
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
  const totalLBRounds = bracketType === 'losers' ? Math.max(...rounds, 0) : 0;

  const getRoundLabel = (round: number) => {
    if (bracketType === 'winners') return getWBRoundLabel(round, totalWBRounds);
    return getLBRoundLabel(round, totalLBRounds);
  };

  const roundMatches = rounds.map(r =>
    matches.filter(m => m.round === r).sort((a, b) => a.match_number - b.match_number)
  );

  // Layout constants
  const CARD_W = isMobile ? 175 : 230;
  const MATCH_H = isMobile ? 88 : 96;
  const BASE_GAP = isMobile ? 8 : 12;
  const HEADER_H = 32;
  const CONNECTOR_W = isMobile ? 20 : 28;

  // Compute position-based layout
  const matchCountsPerRound = roundMatches.map(rm => rm.length);
  const { roundPositions, totalHeight } = computeBracketLayout(
    matchCountsPerRound,
    MATCH_H,
    BASE_GAP,
    HEADER_H,
  );

  return (
    <div className="flex items-start" style={{ minHeight: `${totalHeight}px` }}>
      {roundMatches.map((rMatches, ri) => {
        const roundNum = rounds[ri];
        const positions = roundPositions[ri] || [];

        return (
          <div key={roundNum} className="flex items-start shrink-0">
            {/* Round column */}
            <div className="relative shrink-0" style={{ width: `${CARD_W}px`, height: `${totalHeight}px` }}>
              {/* Round header */}
              <div
                className={cn(
                  'absolute top-0 left-0 right-0 flex items-center justify-center',
                  'text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider',
                  'bg-card/90 backdrop-blur-sm rounded z-10',
                )}
                style={{ height: `${HEADER_H}px` }}
              >
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    bracketType === 'winners' ? 'bg-[#FF4500]' : 'bg-[#FF6B35]',
                  )} />
                  {getRoundLabel(roundNum)}
                </div>
              </div>

              {/* Match cards positioned absolutely */}
              {rMatches.map((match, mi) => {
                const yCenter = positions[mi];
                if (yCenter === undefined) return null;
                const top = yCenter - MATCH_H / 2;

                const bye = isByeMatch(match);
                if (bye) {
                  const advancingTeam = match.squad_a || match.squad_b;
                  const canWildCard = !!onWildCard && bracketType === 'losers' && lbRound1 != null && match.round === lbRound1;
                  return (
                    <div
                      key={match.id}
                      className="absolute left-0"
                      style={{ top: `${top}px`, width: `${CARD_W}px`, height: `${MATCH_H}px` }}
                    >
                      <div
                        className={cn(
                          'h-full rounded-lg border border-dashed border-muted-foreground/15 bg-[#0a0a0a] flex items-center justify-between px-3',
                          canWildCard
                            ? 'opacity-80 hover:opacity-100 cursor-pointer hover:border-yellow-500/30 transition-all'
                            : 'opacity-50',
                        )}
                        onClick={canWildCard ? () => onWildCard!(match) : undefined}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-4 w-4 shrink-0">
                            {advancingTeam?.logo_url && <AvatarImage src={advancingTeam.logo_url} />}
                            <AvatarFallback className="text-[7px] bg-[#1a1a1a] text-muted-foreground">
                              {advancingTeam?.name?.charAt(0)?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[11px] text-muted-foreground truncate">
                            {advancingTeam?.name || 'TBD'}
                          </span>
                        </div>
                        {canWildCard ? (
                          <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-yellow-500/30 text-yellow-500 shrink-0 flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5" />
                            Wild Card
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 border-muted-foreground/20 text-muted-foreground shrink-0">
                            BYE
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                }

                const gn = globalMatchMap.get(match.id);
                return (
                  <div
                    key={match.id}
                    className="absolute left-0"
                    style={{ top: `${top}px`, width: `${CARD_W}px` }}
                  >
                    <BracketMatchCard
                      match={match}
                      globalNumber={gn?.globalNumber}
                      onClick={() => onMatchClick(match)}
                      bracketType={bracketType}
                      cardWidth={CARD_W}
                      compact={isMobile}
                    />
                  </div>
                );
              })}
            </div>

            {/* Connector lines to next round */}
            {ri < roundMatches.length - 1 && roundPositions[ri] && roundPositions[ri + 1] && (
              <BracketConnectors
                currentPositions={roundPositions[ri]}
                nextPositions={roundPositions[ri + 1]}
                totalHeight={totalHeight}
                width={CONNECTOR_W}
                bracketType={bracketType}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
