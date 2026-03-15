import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { GlowCard } from '@/components/tron/GlowCard';
import { WildCardDialog } from '@/components/tournament/WildCardDialog';
import { BracketTree } from './BracketTree';
import { FinalsSection } from './FinalsSection';
import { MatchCard } from './MatchCard';
import { buildGlobalMatchMap } from './bracket-helpers';
import { useDragToScroll } from './useDragToScroll';
import { useIsMobile } from '@/hooks/use-mobile';
import { Trophy } from 'lucide-react';
import type { TournamentMatch, TournamentStage } from '@/lib/tournament-types';

interface EliminationStageViewProps {
  stage: TournamentStage;
  stageMatches: TournamentMatch[];
  onMatchClick: (m: TournamentMatch) => void;
  onDispute: (m: TournamentMatch) => void;
  onResolve: (m: TournamentMatch) => void;
  isHost: boolean;
  tournamentId: string;
  tournamentName: string;
  tournamentStatus: string;
  userSquadIds: string[];
  onToss?: (m: TournamentMatch) => void;
}

export function EliminationStageView({
  stage,
  stageMatches,
  onMatchClick,
  onDispute,
  onResolve,
  isHost,
  tournamentId,
  tournamentName,
  tournamentStatus,
  userSquadIds,
  onToss,
}: EliminationStageViewProps) {
  const [wildCardMatch, setWildCardMatch] = useState<TournamentMatch | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  useDragToScroll(scrollRef);

  if (stageMatches.length === 0) {
    return (
      <GlowCard className="p-8 text-center">
        <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-display font-semibold text-foreground mb-1">No bracket yet</h3>
        <p className="text-muted-foreground text-sm">
          This stage's bracket hasn't been generated yet.
        </p>
      </GlowCard>
    );
  }

  const winnersMatches = stageMatches.filter(m => m.bracket_type === 'winners');
  const losersMatches = stageMatches.filter(m => m.bracket_type === 'losers');
  const semiFinalsMatches = stageMatches.filter(m => m.bracket_type === 'semi_finals');
  const finalsMatches = stageMatches.filter(m => m.bracket_type === 'finals');

  const lbRound1 = losersMatches.length > 0
    ? Math.min(...losersMatches.map(m => m.round))
    : 0;

  const handleWildCard = isHost ? (match: TournamentMatch) => {
    setWildCardMatch(match);
  } : undefined;

  const globalMatchMap = buildGlobalMatchMap(winnersMatches, losersMatches, semiFinalsMatches, finalsMatches);
  const isDE = stage.format === 'double_elimination' || losersMatches.length > 0;

  // Round robin without groups renders as grid
  if (stage.format === 'round_robin') {
    return (
      <GlowCard className="p-6">
        <h3 className="text-lg font-display font-semibold text-foreground mb-4 tracking-wide">
          {stage.name} — All Matches
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stageMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onClick={() => onMatchClick(match)}
              onDispute={() => onDispute(match)}
              onResolve={() => onResolve(match)}
              isHost={isHost}
              tournamentId={tournamentId}
              tournamentName={tournamentName}
              tournamentStatus={tournamentStatus}
              userSquadIds={userSquadIds}
              onToss={onToss ? () => onToss(match) : undefined}
            />
          ))}
        </div>
      </GlowCard>
    );
  }

  // Elimination bracket — unified scroll view
  return (
    <div className="space-y-0">
      <GlowCard className="p-2 md:p-4 overflow-hidden">
        {/* Scrollable bracket container */}
        <div
          ref={scrollRef}
          className="overflow-x-auto overflow-y-auto scrollbar-hide -mx-1 px-1"
          style={{ maxHeight: isMobile ? '70vh' : undefined }}
        >
          <div className="min-w-max py-2">
            {/* Upper Bracket */}
            {winnersMatches.length > 0 && (
              <div>
                {/* Section label */}
                <div className="flex items-center gap-2 mb-3 sticky left-0">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#FF4500]" />
                  <span className="text-xs font-display font-bold text-[#FF4500] uppercase tracking-wider">
                    {isDE ? 'Upper Bracket' : 'Bracket'}
                  </span>
                </div>

                <div className="flex items-start">
                  <BracketTree
                    matches={winnersMatches}
                    bracketType="winners"
                    globalMatchMap={globalMatchMap}
                    totalWBRounds={Math.max(...winnersMatches.map(m => m.round), 0)}
                    onMatchClick={onMatchClick}
                  />

                  {/* Finals inline (for SE or when no LB) */}
                  {!isDE && (
                    <FinalsSection
                      semiFinalsMatches={semiFinalsMatches}
                      finalsMatches={finalsMatches}
                      globalMatchMap={globalMatchMap}
                      onMatchClick={onMatchClick}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Divider between UB and LB */}
            {isDE && winnersMatches.length > 0 && losersMatches.length > 0 && (
              <div className="flex items-center gap-3 my-4 sticky left-0 pr-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm bg-[#FF4500]/30" />
                  <span className="text-[9px] font-display font-medium text-muted-foreground/60 uppercase tracking-widest whitespace-nowrap">UB</span>
                </div>
                <div className="flex-1 border-t border-dashed border-muted-foreground/15 min-w-[100px]" />
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm bg-[#FF6B35]/50" />
                  <span className="text-[9px] font-display font-medium text-muted-foreground/60 uppercase tracking-widest whitespace-nowrap">LB</span>
                </div>
              </div>
            )}

            {/* Lower Bracket */}
            {losersMatches.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 sticky left-0">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#FF6B35]" />
                  <span className="text-xs font-display font-bold text-[#FF6B35] uppercase tracking-wider">
                    Lower Bracket
                  </span>
                </div>

                <div className="flex items-start">
                  <BracketTree
                    matches={losersMatches}
                    bracketType="losers"
                    globalMatchMap={globalMatchMap}
                    totalWBRounds={Math.max(...winnersMatches.map(m => m.round), 0)}
                    onMatchClick={onMatchClick}
                    onWildCard={handleWildCard}
                    lbRound1={lbRound1}
                  />

                  {/* Finals inline for DE */}
                  <FinalsSection
                    semiFinalsMatches={semiFinalsMatches}
                    finalsMatches={finalsMatches}
                    globalMatchMap={globalMatchMap}
                    onMatchClick={onMatchClick}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </GlowCard>

      {/* Wild Card Dialog */}
      <WildCardDialog
        open={!!wildCardMatch}
        onOpenChange={(open) => { if (!open) setWildCardMatch(null); }}
        tournamentId={tournamentId}
        match={wildCardMatch}
      />
    </div>
  );
}
