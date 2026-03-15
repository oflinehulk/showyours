import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { GlowCard } from '@/components/tron/GlowCard';
import { ScoreEditSheet } from '@/components/tournament/ScoreEditSheet';
import { CoinTossOverlay } from '@/components/tournament/CoinTossOverlay';
import { GroupStageView } from './GroupStageView';
import { EliminationStageView } from './EliminationStageView';
import { DisputeDialog, ResolveDisputeDialog } from './DisputeDialogs';
import { useTournamentStages } from '@/hooks/useTournaments';
import { Check, Layers } from 'lucide-react';
import { TOURNAMENT_FORMAT_LABELS } from '@/lib/tournament-types';
import type { Tournament, TournamentMatch } from '@/lib/tournament-types';

export function MultiStageBracket({
  tournament,
  allMatches,
  isHost,
  userSquadIds,
}: {
  tournament: Tournament;
  allMatches: TournamentMatch[];
  isHost: boolean;
  userSquadIds: string[];
}) {
  const { data: stages } = useTournamentStages(tournament.id);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const hasAutoSelected = useRef(false);
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [disputeMatch, setDisputeMatch] = useState<TournamentMatch | null>(null);
  const [resolveMatch, setResolveMatch] = useState<TournamentMatch | null>(null);
  const [tossMatch, setTossMatch] = useState<TournamentMatch | null>(null);

  useEffect(() => {
    if (!stages || stages.length === 0 || hasAutoSelected.current) return;
    hasAutoSelected.current = true;
    const ongoingIdx = stages.findIndex(s => s.status === 'ongoing');
    if (ongoingIdx !== -1) { setActiveStageIndex(ongoingIdx); return; }
    const nonCompletedIdx = stages.findIndex(s => s.status !== 'completed');
    if (nonCompletedIdx !== -1) { setActiveStageIndex(nonCompletedIdx); return; }
  }, [stages]);

  if (!stages || stages.length === 0) {
    return (
      <GlowCard className="p-8 text-center">
        <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-display font-semibold text-foreground mb-1">No stages configured</h3>
        <p className="text-muted-foreground text-sm">
          Stages will be configured after registration closes.
        </p>
      </GlowCard>
    );
  }

  const currentStage = stages[activeStageIndex] || stages[0];
  const stageMatches = allMatches.filter(m => m.stage_id === currentStage.id);

  const sharedProps = {
    isHost,
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    tournamentStatus: tournament.status,
    userSquadIds,
    onToss: (match: TournamentMatch) => setTossMatch(match),
  };

  // Derive fresh match data from allMatches to avoid stale dialog state
  const freshSelectedMatch = selectedMatch ? allMatches.find(m => m.id === selectedMatch.id) ?? selectedMatch : null;
  const freshDisputeMatch = disputeMatch ? allMatches.find(m => m.id === disputeMatch.id) ?? disputeMatch : null;
  const freshResolveMatch = resolveMatch ? allMatches.find(m => m.id === resolveMatch.id) ?? resolveMatch : null;
  const freshTossMatch = tossMatch ? allMatches.find(m => m.id === tossMatch.id) ?? tossMatch : null;

  return (
    <div className="space-y-6">
      {/* Stage Tabs */}
      <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {stages.map((stage, i) => (
          <button
            key={stage.id}
            onClick={() => setActiveStageIndex(i)}
            className={cn(
              'flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 md:py-2.5 rounded-lg border text-[10px] md:text-xs font-display font-semibold uppercase tracking-wider transition-all min-h-[40px] md:min-h-[44px] shrink-0',
              i === activeStageIndex
                ? 'bg-[#FF4500]/10 border-[#FF4500]/50 text-[#FF4500] shadow-[0_0_8px_rgba(255,69,0,0.15)]'
                : 'border-border/50 text-muted-foreground hover:border-[#FF4500]/30 hover:text-foreground',
              stage.status === 'completed' && i !== activeStageIndex && 'border-green-500/30 text-green-500/70',
            )}
          >
            <span className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0',
              stage.status === 'completed' && 'bg-green-500/20 border-green-500 text-green-500',
              stage.status === 'ongoing' && 'bg-[#FF4500]/20 border-[#FF4500] text-[#FF4500]',
              (stage.status === 'pending' || stage.status === 'configuring') && 'border-muted-foreground/30 text-muted-foreground/50',
            )}>
              {stage.status === 'completed' ? <Check className="w-3 h-3" /> : i + 1}
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="whitespace-nowrap">{stage.name}</span>
              <span className="text-[9px] md:text-[10px] font-normal normal-case opacity-70 whitespace-nowrap">
                {TOURNAMENT_FORMAT_LABELS[stage.format]}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* Stage Content */}
      {currentStage.format === 'round_robin' && currentStage.group_count > 0 ? (
        <GroupStageView
          tournament={tournament}
          stage={currentStage}
          stageMatches={stageMatches}
          onMatchClick={setSelectedMatch}
          onDispute={setDisputeMatch}
          onResolve={setResolveMatch}
          {...sharedProps}
        />
      ) : (
        <EliminationStageView
          stage={currentStage}
          stageMatches={stageMatches}
          onMatchClick={setSelectedMatch}
          onDispute={setDisputeMatch}
          onResolve={setResolveMatch}
          {...sharedProps}
        />
      )}

      {/* Score Edit Sheet */}
      <ScoreEditSheet
        match={freshSelectedMatch}
        tournamentId={tournament.id}
        isHost={isHost}
        canEdit={isHost && (tournament.status === 'ongoing' || tournament.status === 'bracket_generated')}
        open={!!selectedMatch}
        onOpenChange={(open) => { if (!open) setSelectedMatch(null); }}
      />

      {/* Dispute Dialog */}
      <DisputeDialog
        match={freshDisputeMatch}
        tournamentId={tournament.id}
        open={!!disputeMatch}
        onOpenChange={(open) => { if (!open) setDisputeMatch(null); }}
      />

      {/* Resolve Dispute Dialog */}
      <ResolveDisputeDialog
        match={freshResolveMatch}
        tournamentId={tournament.id}
        open={!!resolveMatch}
        onOpenChange={(open) => { if (!open) setResolveMatch(null); }}
      />

      {/* Coin Toss Overlay */}
      {freshTossMatch && freshTossMatch.squad_a && freshTossMatch.squad_b && (
        <CoinTossOverlay
          match={freshTossMatch}
          squadA={freshTossMatch.squad_a}
          squadB={freshTossMatch.squad_b}
          tournamentId={tournament.id}
          onClose={() => setTossMatch(null)}
        />
      )}
    </div>
  );
}
