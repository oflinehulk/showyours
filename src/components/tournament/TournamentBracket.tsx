import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { WildCardDialog } from '@/components/tournament/WildCardDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DraftSummaryBadge } from '@/components/tournament/DraftPickPanel';
import { ScoreEditSheet } from '@/components/tournament/ScoreEditSheet';
import { ShareCardGenerator } from '@/components/tournament/ShareCardGenerator';
import { CoinTossOverlay } from '@/components/tournament/CoinTossOverlay';
import { GroupStandings } from '@/components/tournament/GroupStandings';
import { SwapTeamDialog } from '@/components/tournament/SwapTeamDialog';
import { GlowCard } from '@/components/tron/GlowCard';
import { cn } from '@/lib/utils';
import {
  useUpdateMatchCheckIn,
  useForfeitMatch,
  useRaiseDispute,
  useResolveDispute,
  useResetCoinToss,
  useResetMatchResult,
  useTournamentStages,
  useTournamentGroups,
  useTournamentGroupTeams,
  useStageMatches,
  useTournamentRegistrations,
  useCreateTiebreakerMatch,
  useCreateMiniRRTiebreaker,
  useDeleteTiebreakerMatch,
} from '@/hooks/useTournaments';
import { computeGroupStandings } from '@/lib/bracket-utils';
import {
  Trophy,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Check,
  X,
  Flag,
  AlertTriangle,
  Loader2,
  MoreHorizontal,
  Layers,
  Coins,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Tournament, TournamentMatch, TournamentSquad, TournamentStage, MatchStatus } from '@/lib/tournament-types';
import { MATCH_STATUS_LABELS, TOURNAMENT_FORMAT_LABELS } from '@/lib/tournament-types';

interface TournamentBracketProps {
  tournament: Tournament;
  matches: TournamentMatch[];
  isHost: boolean;
  userSquadIds?: string[];
}

export function TournamentBracket({ tournament, matches, isHost, userSquadIds = [] }: TournamentBracketProps) {
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [disputeMatch, setDisputeMatch] = useState<TournamentMatch | null>(null);
  const [resolveMatch, setResolveMatch] = useState<TournamentMatch | null>(null);
  const [tossMatch, setTossMatch] = useState<TournamentMatch | null>(null);

  const isMultiStage = tournament.is_multi_stage;

  if (isMultiStage) {
    return (
      <MultiStageBracket
        tournament={tournament}
        allMatches={matches}
        isHost={isHost}
        userSquadIds={userSquadIds}
      />
    );
  }

  // Single-stage fallback — use same M6-style view
  const singleStageView = {
    tournament,
    stage: { format: tournament.format, group_count: 0 } as TournamentStage,
    stageMatches: matches,
    onMatchClick: (m: TournamentMatch) => setSelectedMatch(m),
    onDispute: (m: TournamentMatch) => setDisputeMatch(m),
    onResolve: (m: TournamentMatch) => setResolveMatch(m),
    isHost,
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    tournamentStatus: tournament.status,
    userSquadIds,
    onToss: (match: TournamentMatch) => setTossMatch(match),
  };

  if (matches.length === 0) {
    return (
      <GlowCard className="p-8 text-center">
        <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-display font-semibold text-foreground mb-1">No bracket yet</h3>
        <p className="text-muted-foreground text-sm">
          The bracket will be generated once registration closes.
        </p>
      </GlowCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Round Robin View */}
      {tournament.format === 'round_robin' && (
        <GlowCard className="p-6">
          <h3 className="text-lg font-display font-semibold text-foreground mb-4 tracking-wide">All Matches</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onClick={() => setSelectedMatch(match)}
                onDispute={() => setDisputeMatch(match)}
                onResolve={() => setResolveMatch(match)}
                isHost={isHost}
                tournamentId={tournament.id}
                tournamentName={tournament.name}
                tournamentStatus={tournament.status}
                userSquadIds={userSquadIds}
                onToss={(m: TournamentMatch) => setTossMatch(m)}
              />
            ))}
          </div>
        </GlowCard>
      )}

      {/* Elimination Bracket View — M6 style */}
      {tournament.format !== 'round_robin' && (
        <EliminationStageView {...singleStageView} />
      )}

      {/* Score Edit Sheet */}
      <ScoreEditSheet
        match={selectedMatch}
        tournamentId={tournament.id}
        isHost={isHost}
        canEdit={isHost && (tournament.status === 'ongoing' || tournament.status === 'bracket_generated')}
        open={!!selectedMatch}
        onOpenChange={(open) => { if (!open) setSelectedMatch(null); }}
      />

      {/* Dispute Dialog */}
      <DisputeDialog
        match={disputeMatch}
        tournamentId={tournament.id}
        open={!!disputeMatch}
        onOpenChange={(open) => { if (!open) setDisputeMatch(null); }}
      />

      {/* Resolve Dispute Dialog */}
      <ResolveDisputeDialog
        match={resolveMatch}
        tournamentId={tournament.id}
        open={!!resolveMatch}
        onOpenChange={(open) => { if (!open) setResolveMatch(null); }}
      />

      {/* Coin Toss Overlay */}
      {tossMatch && tossMatch.squad_a && tossMatch.squad_b && (
        <CoinTossOverlay
          match={tossMatch}
          squadA={tossMatch.squad_a}
          squadB={tossMatch.squad_b}
          tournamentId={tournament.id}
          onClose={() => setTossMatch(null)}
        />
      )}
    </div>
  );
}

// ========== Multi-Stage Bracket View ==========

function MultiStageBracket({
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

  // Auto-select the latest active stage when stages first load
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
        match={selectedMatch}
        tournamentId={tournament.id}
        isHost={isHost}
        canEdit={isHost && (tournament.status === 'ongoing' || tournament.status === 'bracket_generated')}
        open={!!selectedMatch}
        onOpenChange={(open) => { if (!open) setSelectedMatch(null); }}
      />

      {/* Dispute Dialog */}
      <DisputeDialog
        match={disputeMatch}
        tournamentId={tournament.id}
        open={!!disputeMatch}
        onOpenChange={(open) => { if (!open) setDisputeMatch(null); }}
      />

      {/* Resolve Dispute Dialog */}
      <ResolveDisputeDialog
        match={resolveMatch}
        tournamentId={tournament.id}
        open={!!resolveMatch}
        onOpenChange={(open) => { if (!open) setResolveMatch(null); }}
      />

      {/* Coin Toss Overlay */}
      {tossMatch && tossMatch.squad_a && tossMatch.squad_b && (
        <CoinTossOverlay
          match={tossMatch}
          squadA={tossMatch.squad_a}
          squadB={tossMatch.squad_b}
          tournamentId={tournament.id}
          onClose={() => setTossMatch(null)}
        />
      )}
    </div>
  );
}

// Group stage: show standings per group + match cards
function GroupStageView({
  tournament,
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
}: {
  tournament: Tournament;
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
}) {
  const { data: groups } = useTournamentGroups(stage.id);
  const { data: groupTeams } = useTournamentGroupTeams(stage.id);
  const { data: registrations } = useTournamentRegistrations(tournament.id);
  const createTiebreaker = useCreateTiebreakerMatch();
  const createMiniRR = useCreateMiniRRTiebreaker();
  const deleteTiebreaker = useDeleteTiebreakerMatch();
  const [swapTarget, setSwapTarget] = useState<{
    groupId: string;
    squadId: string;
    squadName: string;
  } | null>(null);
  const [skippedTiebreakers, setSkippedTiebreakers] = useState<Set<string>>(new Set());

  // Build set of withdrawn squad IDs
  const withdrawnSquadIds = new Set(
    (registrations || [])
      .filter(r => r.status === 'withdrawn')
      .map(r => r.tournament_squad_id)
  );

  if (!groups || groups.length === 0) {
    return (
      <GlowCard className="p-6 text-center">
        <p className="text-muted-foreground text-sm">Groups have not been configured yet.</p>
      </GlowCard>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const groupMatches = stageMatches.filter(m => m.group_id === group.id);

        // Build squad map from match data
        const squadMap = new Map<string, TournamentSquad>();
        for (const m of groupMatches) {
          if (m.squad_a && m.squad_a_id) squadMap.set(m.squad_a_id, m.squad_a);
          if (m.squad_b && m.squad_b_id) squadMap.set(m.squad_b_id, m.squad_b);
        }
        // Also use groupTeams data if available
        for (const gt of (groupTeams || [])) {
          if (gt.group_id === group.id && gt.tournament_squads) {
            squadMap.set(gt.tournament_squad_id, gt.tournament_squads);
          }
        }

        const standings = computeGroupStandings(groupMatches, squadMap);

        return (
          <div key={group.id} className="space-y-4">
            {/* Group Standings */}
            <GroupStandings
              standings={standings}
              groupLabel={group.label}
              advanceCount={stage.advance_per_group}
              advanceToLowerCount={stage.advance_to_lower_per_group}
              isHost={isHost}
              withdrawnSquadIds={withdrawnSquadIds}
              onSwapTeam={stage.status === 'ongoing' ? (squadId, squadName) => {
                setSwapTarget({ groupId: group.id, squadId, squadName });
              } : undefined}
              groupMatches={groupMatches}
              onCreateTiebreaker={isHost && stage.status === 'ongoing' ? (squadAId, squadBId) => {
                createTiebreaker.mutate({
                  tournamentId: tournament.id,
                  stageId: stage.id,
                  groupId: group.id,
                  squadAId,
                  squadBId,
                  bestOf: stage.best_of as 1 | 3 | 5,
                }, {
                  onSuccess: () => toast.success('Tiebreaker match created!'),
                  onError: (err) => toast.error(`Failed to create tiebreaker: ${err.message}`),
                });
              } : undefined}
              onCreateMiniRR={isHost && stage.status === 'ongoing' ? (squadIds) => {
                createMiniRR.mutate({
                  tournamentId: tournament.id,
                  stageId: stage.id,
                  groupId: group.id,
                  squadIds,
                  bestOf: stage.best_of as 1 | 3 | 5,
                }, {
                  onSuccess: () => toast.success('3 tiebreaker matches created! Enter results for each match.'),
                  onError: (err) => toast.error(`Failed to create tiebreaker matches: ${err.message}`),
                });
              } : undefined}
              isTiebreakerPending={createTiebreaker.isPending || createMiniRR.isPending}
              tiebreakerSkipped={skippedTiebreakers.has(group.id)}
              onSkipTiebreaker={isHost && stage.status === 'ongoing' ? () => {
                setSkippedTiebreakers(prev => new Set(prev).add(group.id));
                toast.success(`Tiebreaker skipped for Group ${group.label} — using current order`);
              } : undefined}
              onUnskipTiebreaker={isHost ? () => {
                setSkippedTiebreakers(prev => {
                  const next = new Set(prev);
                  next.delete(group.id);
                  return next;
                });
              } : undefined}
            />

            {/* Group Matches */}
            {groupMatches.length > 0 && (
              <div className="pl-1">
                <p className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Group {group.label} Matches
                </p>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {groupMatches
                    .sort((a, b) => {
                      // Show tiebreaker matches (round 99) at the end
                      if (a.round === 99 && b.round !== 99) return 1;
                      if (a.round !== 99 && b.round === 99) return -1;
                      return a.match_number - b.match_number;
                    })
                    .map((match) => (
                      <div key={match.id} className="relative">
                        {match.round === 99 && (
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/30">
                              ⚔️ Tiebreaker
                            </Badge>
                            {isHost && match.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 px-1.5 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={deleteTiebreaker.isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Remove this tiebreaker match?')) {
                                    deleteTiebreaker.mutate(
                                      { matchId: match.id, tournamentId: tournament.id },
                                      {
                                        onSuccess: () => toast.success('Tiebreaker match removed'),
                                        onError: (err) => toast.error(`Failed: ${err.message}`),
                                      }
                                    );
                                  }
                                }}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        )}
                        <MatchCard
                          match={match}
                          onClick={() => onMatchClick(match)}
                          onDispute={() => onDispute(match)}
                          onResolve={() => onResolve(match)}
                          onToss={onToss ? () => onToss(match) : undefined}
                          isHost={isHost}
                          tournamentId={tournamentId}
                          tournamentName={tournamentName}
                          tournamentStatus={tournamentStatus}
                          userSquadIds={userSquadIds}
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Swap Team Dialog */}
      {swapTarget && registrations && (
        <SwapTeamDialog
          open={!!swapTarget}
          onOpenChange={(open) => { if (!open) setSwapTarget(null); }}
          tournament={tournament}
          stageId={stage.id}
          groupId={swapTarget.groupId}
          withdrawnSquadId={swapTarget.squadId}
          withdrawnSquadName={swapTarget.squadName}
          registrations={registrations}
        />
      )}
    </div>
  );
}

// Elimination bracket for a specific stage
function EliminationStageView({
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
}: {
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
}) {
  const [wildCardMatch, setWildCardMatch] = useState<TournamentMatch | null>(null);

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

  // Determine LB Round 1 for wild card eligibility
  const lbRound1 = losersMatches.length > 0
    ? Math.min(...losersMatches.map(m => m.round))
    : 0;

  const handleWildCard = isHost ? (match: TournamentMatch) => {
    setWildCardMatch(match);
  } : undefined;

  // Build global match numbering for M6-style labels
  const globalMatchMap = buildGlobalMatchMap(winnersMatches, losersMatches, semiFinalsMatches, finalsMatches);

  const sharedProps = {
    isHost,
    tournamentId,
    tournamentName,
    tournamentStatus,
    userSquadIds,
    onToss,
  };

  // Round robin without groups (single pool)
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
              {...sharedProps}
            />
          ))}
        </div>
      </GlowCard>
    );
  }

  const isDE = stage.format === 'double_elimination' || losersMatches.length > 0;

  return (
    <div className="space-y-6">
      {/* ===== UPPER BRACKET ===== */}
      {winnersMatches.length > 0 && (
        <GlowCard className="p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-sm bg-[#FF4500]" />
            <h3 className="text-lg font-display font-semibold text-foreground tracking-wide">
              {isDE ? 'UPPER BRACKET' : 'BRACKET'}
            </h3>
          </div>
          <M6BracketView
            matches={winnersMatches}
            bracketType="winners"
            globalMatchMap={globalMatchMap}
            totalWBRounds={Math.max(...winnersMatches.map(m => m.round), 0)}
            onMatchClick={onMatchClick}
            onDispute={onDispute}
            onResolve={onResolve}
            {...sharedProps}
          />
        </GlowCard>
      )}

      {/* ===== Divider ===== */}
      {isDE && (winnersMatches.length > 0 || losersMatches.length > 0) && (
        <div className="flex items-center gap-3 px-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#FF4500]/30" />
            <span className="text-[10px] font-display font-medium text-muted-foreground uppercase tracking-widest">Upper Bracket</span>
          </div>
          <div className="flex-1 border-t border-dashed border-muted-foreground/20" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#FF6B35]/50" />
            <span className="text-[10px] font-display font-medium text-muted-foreground uppercase tracking-widest">Lower Bracket</span>
          </div>
        </div>
      )}

      {/* ===== LOWER BRACKET ===== */}
      {losersMatches.length > 0 && (
        <GlowCard glowColor="secondary" className="p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-sm bg-[#FF6B35]" />
            <h3 className="text-lg font-display font-semibold text-foreground tracking-wide">
              LOWER BRACKET
            </h3>
          </div>
          <M6BracketView
            matches={losersMatches}
            bracketType="losers"
            globalMatchMap={globalMatchMap}
            totalWBRounds={Math.max(...winnersMatches.map(m => m.round), 0)}
            onMatchClick={onMatchClick}
            onDispute={onDispute}
            onResolve={onResolve}
            {...sharedProps}
          />
        </GlowCard>
      )}

      {/* ===== SEMI-FINAL ===== */}
      {semiFinalsMatches.length > 0 && (
        <GlowCard glowColor="accent" className="p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-display font-semibold text-foreground tracking-wide">
              SEMI-FINAL
            </h3>
          </div>
          <div className="flex justify-center">
            {semiFinalsMatches.map((match) => {
              const gn = globalMatchMap.get(match.id);
              return (
                <div key={match.id} className="flex flex-col items-center gap-1">
                  {gn && (
                    <span className="text-[10px] font-display font-bold text-[#FF6B35] uppercase tracking-wider mb-1">
                      Match {gn.globalNumber}
                    </span>
                  )}
                  <MatchCard
                    match={match}
                    onClick={() => onMatchClick(match)}
                    onDispute={() => onDispute(match)}
                    onResolve={() => onResolve(match)}
                    large
                    
                    {...sharedProps}
                  />
                </div>
              );
            })}
          </div>
        </GlowCard>
      )}

      {/* ===== GRAND FINAL ===== */}
      {finalsMatches.length > 0 && (
        <GlowCard glowColor="accent" className="p-4 md:p-6 neon-border">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-display font-semibold text-foreground tracking-wide">
              GRAND FINAL
            </h3>
          </div>
          <div className="flex justify-center">
            {finalsMatches.map((match) => {
              const gn = globalMatchMap.get(match.id);
              return (
                <div key={match.id} className="flex flex-col items-center gap-1">
                  {gn && (
                    <span className="text-[10px] font-display font-bold text-yellow-500 uppercase tracking-wider mb-1">
                      Match {gn.globalNumber}
                    </span>
                  )}
                  <MatchCard
                    match={match}
                    onClick={() => onMatchClick(match)}
                    onDispute={() => onDispute(match)}
                    onResolve={() => onResolve(match)}
                    large
                    
                    {...sharedProps}
                  />
                </div>
              );
            })}
          </div>
        </GlowCard>
      )}
    </div>
  );
}

// ========== Bye Detection ==========

function isByeMatch(match: TournamentMatch): boolean {
  return (
    (!match.squad_a_id || !match.squad_b_id) &&
    (match.status === 'completed' || match.status === 'pending')
  );
}

// ========== M6-Style Global Match Numbering ==========

interface GlobalMatchInfo {
  globalNumber: number;
}

function buildGlobalMatchMap(
  winners: TournamentMatch[],
  losers: TournamentMatch[],
  semis: TournamentMatch[],
  finals: TournamentMatch[]
): Map<string, GlobalMatchInfo> {
  const map = new Map<string, GlobalMatchInfo>();
  let num = 1;

  const sortedWB = [...winners].sort((a, b) => a.round - b.round || a.match_number - b.match_number);
  for (const m of sortedWB) {
    if (isByeMatch(m)) continue;
    map.set(m.id, { globalNumber: num++ });
  }

  const sortedLB = [...losers].sort((a, b) => a.round - b.round || a.match_number - b.match_number);
  for (const m of sortedLB) {
    if (isByeMatch(m)) continue;
    map.set(m.id, { globalNumber: num++ });
  }

  for (const m of semis) { map.set(m.id, { globalNumber: num++ }); }
  for (const m of finals) { map.set(m.id, { globalNumber: num++ }); }

  return map;
}

// ========== M6-Style Bracket Visualization ==========

function getWBRoundLabel(round: number, totalRounds: number): string {
  if (totalRounds <= 1) return 'Final';
  if (round === totalRounds) return 'UB Final';
  if (round === totalRounds - 1) return 'UB Semi-Final';
  if (round === totalRounds - 2 && totalRounds > 3) return 'UB Quarter-Final';
  return `UB Round ${round}`;
}

function getLBRoundLabel(round: number, totalLBRounds: number): string {
  if (round === totalLBRounds) return 'LB Final';
  if (round === totalLBRounds - 1) return 'LB Semi-Final';
  return `LB Round ${round}`;
}

function M6BracketView({
  matches,
  bracketType,
  globalMatchMap,
  totalWBRounds,
  onMatchClick,
  onDispute,
  onResolve,
  isHost,
  tournamentId,
  tournamentName,
  tournamentStatus,
  userSquadIds,
  onToss,
}: {
  matches: TournamentMatch[];
  bracketType: 'winners' | 'losers';
  globalMatchMap: Map<string, GlobalMatchInfo>;
  totalWBRounds: number;
  onMatchClick: (match: TournamentMatch) => void;
  onDispute: (match: TournamentMatch) => void;
  onResolve: (match: TournamentMatch) => void;
  isHost: boolean;
  tournamentId: string;
  tournamentName: string;
  tournamentStatus: string;
  userSquadIds: string[];
  onToss?: (m: TournamentMatch) => void;
}) {
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

  // ===== MOBILE: Vertical round-by-round list =====
  if (isMobile) {
    return (
      <div className="space-y-4">
        {roundMatches.map((rMatches, ri) => {
          const roundNum = rounds[ri];
          const realMatches = rMatches.filter(m => !isByeMatch(m));
          const byeMatches = rMatches.filter(m => isByeMatch(m));

          return (
            <div key={roundNum} className="space-y-2">
              {/* Round header */}
              <div className="flex items-center gap-2 sticky top-0 z-10 bg-card/95 backdrop-blur-sm py-2 px-1 -mx-1 rounded">
                <div className={cn(
                  'w-1.5 h-6 rounded-full shrink-0',
                  bracketType === 'winners' ? 'bg-[#FF4500]' : 'bg-[#FF6B35]',
                )} />
                <span className="text-xs font-display font-bold text-foreground uppercase tracking-wider">
                  {getRoundLabel(roundNum)}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {realMatches.length} match{realMatches.length !== 1 ? 'es' : ''}
                  {byeMatches.length > 0 && ` · ${byeMatches.length} bye${byeMatches.length !== 1 ? 's' : ''}`}
                </span>
              </div>

              {/* Bye matches summary */}
              {byeMatches.length > 0 && (
                <div className="bg-[#111] border border-dashed border-muted-foreground/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/30 text-muted-foreground border-muted-foreground/20">
                      BYE
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {byeMatches.length === 1 ? '1 team advances automatically' : `${byeMatches.length} teams advance automatically`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {byeMatches.map(m => {
                      const advancingTeam = m.squad_a || m.squad_b;
                      return (
                        <div key={m.id} className="flex items-center gap-1.5 bg-[#0a0a0a] rounded px-2 py-1">
                          <Avatar className="h-4 w-4 shrink-0">
                            {advancingTeam?.logo_url && <AvatarImage src={advancingTeam.logo_url} />}
                            <AvatarFallback className="text-[7px] bg-[#1a1a1a] text-muted-foreground">
                              {advancingTeam?.name?.charAt(0)?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[11px] text-muted-foreground">{advancingTeam?.name || 'TBD'}</span>
                          <CheckCircle className="w-3 h-3 text-green-500/60" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Real matches */}
              <div className="space-y-2">
                {realMatches.map((match) => {
                  const gn = globalMatchMap.get(match.id);
                  return (
                    <MobileMatchCard
                      key={match.id}
                      match={match}
                      globalNumber={gn?.globalNumber}
                      onClick={() => onMatchClick(match)}
                      bracketType={bracketType}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ===== DESKTOP: Horizontal bracket with connectors =====
  const MATCH_H = 60;
  const BASE_GAP = 8;
  // Header height: text ~14px + py-1 (4+4) + mb-3 (12) = ~34px
  const HEADER_H = 34;

  return (
    <div className="overflow-x-auto -mx-2 px-2 scrollbar-hide">
      <div className="flex items-stretch min-w-max py-2">
        {roundMatches.map((rMatches, ri) => {
          const roundNum = rounds[ri];
          const gap = Math.pow(2, ri) * (MATCH_H + BASE_GAP) - MATCH_H;
          const topPad = (Math.pow(2, ri) - 1) * (MATCH_H + BASE_GAP) / 2;

          return (
            <div key={roundNum} className="flex items-stretch">
              {/* Round column */}
              <div className="flex flex-col min-w-[210px]">
                <div
                  className="text-[10px] font-display font-semibold text-muted-foreground text-center uppercase tracking-wider sticky top-0 z-10 bg-card/90 backdrop-blur-sm rounded flex items-center justify-center"
                  style={{ height: `${HEADER_H}px` }}
                >
                  {getRoundLabel(roundNum)}
                </div>
                <div
                  className="flex flex-col"
                  style={{ gap: `${gap}px`, paddingTop: `${topPad}px` }}
                >
                  {rMatches.map((match) => {
                    const bye = isByeMatch(match);
                    if (bye) {
                      const advancingTeam = match.squad_a || match.squad_b;
                      return (
                        <div
                          key={match.id}
                          style={{ height: `${MATCH_H}px` }}
                          className="rounded border border-dashed border-muted-foreground/15 bg-[#0a0a0a] flex items-center justify-between px-3 opacity-60"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-4 w-4 shrink-0">
                              {advancingTeam?.logo_url && <AvatarImage src={advancingTeam.logo_url} />}
                              <AvatarFallback className="text-[7px] bg-[#1a1a1a] text-muted-foreground">
                                {advancingTeam?.name?.charAt(0)?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[11px] text-muted-foreground truncate">{advancingTeam?.name || 'TBD'}</span>
                          </div>
                          <Badge variant="outline" className="text-[8px] px-1 py-0 border-muted-foreground/20 text-muted-foreground shrink-0">
                            BYE
                          </Badge>
                        </div>
                      );
                    }
                    const gn = globalMatchMap.get(match.id);
                    return (
                      <CompactMatchCard
                        key={match.id}
                        match={match}
                        globalNumber={gn?.globalNumber}
                        onClick={() => onMatchClick(match)}
                        isHost={isHost}
                        tournamentId={tournamentId}
                        tournamentStatus={tournamentStatus}
                        matchHeight={MATCH_H}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Connector lines to next round */}
              {ri < roundMatches.length - 1 && (
                <DesktopBracketConnectors
                  matchCount={rMatches.length}
                  roundIndex={ri}
                  bracketType={bracketType}
                  matchHeight={MATCH_H}
                  baseGap={BASE_GAP}
                  headerHeight={HEADER_H}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== Mobile Match Card =====
function MobileMatchCard({
  match,
  globalNumber,
  onClick,
  bracketType,
}: {
  match: TournamentMatch;
  globalNumber?: number;
  onClick: () => void;
  bracketType: string;
}) {
  const isCompleted = match.status === 'completed';
  const isOngoing = match.status === 'ongoing';
  const isDisputed = match.status === 'disputed';

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border bg-[#111] cursor-pointer transition-all active:scale-[0.98] overflow-hidden',
        isCompleted && 'border-green-500/20',
        isOngoing && 'border-yellow-400/40',
        isDisputed && 'border-destructive/40',
        !isCompleted && !isOngoing && !isDisputed && 'border-border/30',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0a0a] border-b border-[#222]">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-[10px] font-display font-bold uppercase tracking-wider',
            bracketType === 'winners' ? 'text-[#FF4500]' : 'text-[#FF6B35]',
          )}>
            {globalNumber ? `M${globalNumber}` : `#${match.match_number}`}
          </span>
          <span className="text-[10px] text-muted-foreground">Bo{match.best_of}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {match.scheduled_time && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {format(new Date(match.scheduled_time), 'MMM d, h:mm a')}
            </span>
          )}
          {isCompleted && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
          {isOngoing && <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />}
          {isDisputed && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
          {match.is_forfeit && <Flag className="w-3.5 h-3.5 text-destructive" />}
        </div>
      </div>

      {/* Teams */}
      <div className="divide-y divide-[#1a1a1a]">
        <MobileTeamRow
          squad={match.squad_a}
          score={match.squad_a_score}
          isWinner={match.winner_id === match.squad_a_id}
        />
        <MobileTeamRow
          squad={match.squad_b}
          score={match.squad_b_score}
          isWinner={match.winner_id === match.squad_b_id}
        />
      </div>
    </div>
  );
}

function MobileTeamRow({
  squad,
  score,
  isWinner,
}: {
  squad: TournamentSquad | null | undefined;
  score: number;
  isWinner: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between px-3 py-2.5 min-h-[44px]',
      isWinner && 'bg-green-500/10',
      !squad && 'opacity-40',
    )}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <Avatar className="h-6 w-6 shrink-0">
          {squad?.logo_url && <AvatarImage src={squad.logo_url} alt={squad.name} />}
          <AvatarFallback className="text-[9px] bg-[#1a1a1a] text-muted-foreground">
            {squad?.name?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <span className={cn(
          'text-sm truncate',
          isWinner ? 'font-semibold text-foreground' : 'text-muted-foreground',
        )}>
          {squad?.name || 'TBD'}
        </span>
        {isWinner && <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />}
      </div>
      <span className={cn(
        'text-sm font-display font-bold ml-2 shrink-0 min-w-[20px] text-right',
        isWinner && 'text-green-400',
      )}>
        {score}
      </span>
    </div>
  );
}

// ===== Desktop Bracket Connectors =====
function DesktopBracketConnectors({
  matchCount,
  roundIndex,
  bracketType,
  matchHeight,
  baseGap,
  headerHeight = 34,
}: {
  matchCount: number;
  roundIndex: number;
  bracketType: string;
  matchHeight: number;
  baseGap: number;
  headerHeight?: number;
}) {
  const lineColor = bracketType === 'winners' ? 'border-[#FF4500]/30' : 'border-[#FF6B35]/30';
  const gap = Math.pow(2, roundIndex) * (matchHeight + baseGap) - matchHeight;
  const topPad = (Math.pow(2, roundIndex) - 1) * (matchHeight + baseGap) / 2;
  const pairs = Math.floor(matchCount / 2);
  const hasOddMatch = matchCount % 2 === 1;
  const pairHeight = matchHeight * 2 + gap;

  return (
    <div className="flex flex-col w-8 shrink-0">
      {/* Spacer matching the round header height */}
      <div style={{ height: `${headerHeight}px` }} className="shrink-0" />
      <div
        className="flex flex-col"
        style={{ paddingTop: `${topPad}px`, gap: `${gap}px` }}
      >
        {Array.from({ length: pairs }).map((_, pi) => (
          <div
            key={pi}
            className="flex flex-col"
            style={{ height: `${pairHeight}px` }}
          >
            {/* Top match → right + down */}
            <div className={cn('flex-1 rounded-tr-sm border-t-2 border-r-2', lineColor)} />
            {/* Bottom match → right + up */}
            <div className={cn('flex-1 rounded-br-sm border-b-2 border-r-2', lineColor)} />
          </div>
        ))}
        {hasOddMatch && (
          <div
            style={{ height: `${matchHeight}px` }}
            className="flex items-center"
          >
            <div className={cn('w-full border-t-2', lineColor)} />
          </div>
        )}
      </div>
    </div>
  );
}

// Compact M6-style match card (team A on top, team B on bottom)
function CompactMatchCard({
  match,
  globalNumber,
  onClick,
  isHost,
  tournamentId,
  tournamentStatus,
  matchHeight = 60,
}: {
  match: TournamentMatch;
  globalNumber?: number;
  onClick: () => void;
  isHost: boolean;
  tournamentId: string;
  tournamentStatus: string;
  matchHeight?: number;
}) {
  const isCompleted = match.status === 'completed';
  const isDisputed = match.status === 'disputed';
  const isOngoing = match.status === 'ongoing';

  return (
    <div
      onClick={onClick}
      style={{ height: `${matchHeight}px` }}
      className={cn(
        'rounded border bg-[#111] cursor-pointer transition-all flex flex-col overflow-hidden',
        'hover:border-[#FF4500]/50 hover:shadow-[0_0_8px_rgba(255,69,0,0.15)]',
        'active:scale-[0.98]',
        isCompleted && 'border-green-500/20',
        isOngoing && 'border-yellow-400/40',
        isDisputed && 'border-destructive/40',
        !isCompleted && !isOngoing && !isDisputed && 'border-[#FF4500]/15',
      )}
    >
      {/* Header with match number and status */}
      <div className="flex items-center justify-between px-2 py-0.5 bg-[#0a0a0a] border-b border-[#222]">
        <span className="text-[9px] font-display font-bold text-[#FF6B35] uppercase tracking-wider">
          {globalNumber ? `M${globalNumber}` : `#${match.match_number}`}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-muted-foreground">Bo{match.best_of}</span>
          {isCompleted && <CheckCircle className="w-2.5 h-2.5 text-green-400" />}
          {isOngoing && <AlertCircle className="w-2.5 h-2.5 text-yellow-400" />}
          {isDisputed && <AlertTriangle className="w-2.5 h-2.5 text-destructive" />}
          {match.is_forfeit && <Flag className="w-2.5 h-2.5 text-destructive" />}
        </div>
      </div>

      {/* Team A */}
      <CompactTeamRow
        squad={match.squad_a}
        score={match.squad_a_score}
        isWinner={match.winner_id === match.squad_a_id}
        hasBorder
      />

      {/* Team B */}
      <CompactTeamRow
        squad={match.squad_b}
        score={match.squad_b_score}
        isWinner={match.winner_id === match.squad_b_id}
        hasBorder={false}
      />
    </div>
  );
}

function CompactTeamRow({
  squad,
  score,
  isWinner,
  hasBorder,
}: {
  squad: TournamentSquad | null | undefined;
  score: number;
  isWinner: boolean;
  hasBorder: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-2 flex-1 min-h-0',
        hasBorder && 'border-b border-[#222]',
        isWinner && 'bg-green-500/10',
        !squad && 'opacity-40',
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <Avatar className="h-3.5 w-3.5 shrink-0">
          {squad?.logo_url ? (
            <AvatarImage src={squad.logo_url} alt={squad.name} />
          ) : null}
          <AvatarFallback className="text-[7px] bg-[#1a1a1a] text-muted-foreground">
            {squad?.name?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <span className={cn('text-[11px] truncate', isWinner ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
          {squad?.name || 'TBD'}
        </span>
      </div>
      <span className={cn('text-[11px] font-display font-bold ml-1 shrink-0', isWinner && 'text-green-400')}>
        {score}
      </span>
    </div>
  );
}

// Individual match card
function MatchCard({
  match,
  onClick,
  onDispute,
  onResolve,
  onToss,
  isHost,
  tournamentId,
  tournamentName,
  tournamentStatus,
  userSquadIds,
  large = false,
}: {
  match: TournamentMatch;
  onClick: () => void;
  onDispute: () => void;
  onResolve: () => void;
  onToss?: (match: TournamentMatch) => void;
  isHost: boolean;
  tournamentId: string;
  tournamentName: string;
  tournamentStatus: string;
  userSquadIds: string[];
  large?: boolean;
}) {
  const updateCheckIn = useUpdateMatchCheckIn();
  const forfeitMatch = useForfeitMatch();
  const resetCoinToss = useResetCoinToss();
  const resetMatchResult = useResetMatchResult();

  const isOngoing = tournamentStatus === 'ongoing' || tournamentStatus === 'bracket_generated';
  const userInMatch = userSquadIds.some(id => id === match.squad_a_id || id === match.squad_b_id);
  const canDispute = userInMatch && match.status === 'completed' && !match.is_forfeit;

  const statusIcons: Record<MatchStatus, React.ReactNode> = {
    pending: <Clock className="w-3 h-3" />,
    ongoing: <AlertCircle className="w-3 h-3" />,
    completed: <CheckCircle className="w-3 h-3" />,
    disputed: <AlertTriangle className="w-3 h-3" />,
  };

  const statusColors: Record<MatchStatus, string> = {
    pending: 'text-muted-foreground',
    ongoing: 'text-yellow-400',
    completed: 'text-green-400',
    disputed: 'text-destructive',
  };

  const handleCheckIn = (field: 'squad_a_checked_in' | 'squad_b_checked_in', value: boolean) => {
    updateCheckIn.mutate({ matchId: match.id, field, value, tournamentId });
  };

  const handleForfeit = (e: React.MouseEvent, winnerId: string) => {
    e.stopPropagation();
    forfeitMatch.mutate({
      matchId: match.id,
      winnerId,
      bestOf: match.best_of,
      tournamentId,
    }, {
      onSuccess: () => toast.success('Match forfeited'),
      onError: (err: Error) => toast.error('Failed to forfeit', { description: err.message }),
    });
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'w-full p-2.5 md:p-3 rounded-lg border bg-[#111111] transition-all text-left cursor-pointer',
        'border-[#FF4500]/20 hover:border-[#FF4500]/50 hover:shadow-[0_0_10px_rgba(255,69,0,0.15)]',
        'active:scale-[0.98]',
        match.status === 'ongoing' && 'border-yellow-400/40',
        match.status === 'completed' && 'border-green-500/20',
        match.status === 'disputed' && 'border-destructive/40',
        large && 'p-3 md:p-4 neon-border'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Bo{match.best_of}</span>
          <DraftSummaryBadge matchId={match.id} />
        </div>
        <span className={cn('flex items-center gap-1 text-xs',
          match.status === 'disputed' ? 'text-destructive' :
          match.status === 'completed' ? (match.is_forfeit ? 'text-destructive' : 'text-green-400') :
          statusColors[match.status]
        )}>
          {match.is_forfeit ? <Flag className="w-3 h-3" /> : statusIcons[match.status]}
          {match.is_forfeit ? 'Forfeit' : MATCH_STATUS_LABELS[match.status]}
        </span>
      </div>

      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {match.scheduled_time
          ? format(new Date(match.scheduled_time), 'MMM d, h:mm a')
          : 'TBA'}
      </p>

      <div className="space-y-2">
        <MatchTeamRow
          squad={match.squad_a}
          score={match.squad_a_score}
          isWinner={match.winner_id === match.squad_a_id}
          checkedIn={match.squad_a_checked_in}
          showCheckIn={isHost && isOngoing && match.status === 'pending' && !!match.squad_a_id}
          onCheckIn={(val) => handleCheckIn('squad_a_checked_in', val)}
          large={large}
          sideBadge={match.toss_completed_at ? (match.blue_side_team === match.squad_a_id ? 'blue' : match.red_side_team === match.squad_a_id ? 'red' : undefined) : undefined}
        />
        <div className="flex items-center gap-2 text-xs">
          <div className="flex-1 h-px bg-[#FF4500]/20" />
          <span className="text-[#FF4500] font-display font-bold tracking-wider">VS</span>
          <div className="flex-1 h-px bg-[#FF4500]/20" />
        </div>
        <MatchTeamRow
          squad={match.squad_b}
          score={match.squad_b_score}
          isWinner={match.winner_id === match.squad_b_id}
          checkedIn={match.squad_b_checked_in}
          showCheckIn={isHost && isOngoing && match.status === 'pending' && !!match.squad_b_id}
          onCheckIn={(val) => handleCheckIn('squad_b_checked_in', val)}
          large={large}
          sideBadge={match.toss_completed_at ? (match.blue_side_team === match.squad_b_id ? 'blue' : match.red_side_team === match.squad_b_id ? 'red' : undefined) : undefined}
        />
      </div>

      {/* Actions row: dropdown + share */}
      <div className="mt-2 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1">
          {/* Dropdown for secondary actions */}
          {(() => {
            const showForfeitA = isHost && isOngoing && match.status === 'pending' && match.squad_a_id && match.squad_b_id && !match.squad_a_checked_in && match.squad_b_checked_in;
            const showForfeitB = isHost && isOngoing && match.status === 'pending' && match.squad_a_id && match.squad_b_id && match.squad_a_checked_in && !match.squad_b_checked_in;
            const showDispute = canDispute;
            const showResolve = isHost && match.status === 'disputed';
            const showDoToss = onToss && isHost && isOngoing && match.status === 'pending' && match.squad_a_id && match.squad_b_id && !match.toss_completed_at;
            const showRedoToss = onToss && isHost && isOngoing && (match.status === 'pending' || match.status === 'ongoing') && match.toss_completed_at;
            const showResetResult = isHost && isOngoing && match.status === 'completed';
            const hasActions = showForfeitA || showForfeitB || showDispute || showResolve || showDoToss || showRedoToss || showResetResult;

            if (!hasActions) return null;

            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[160px]">
                  {showDoToss && (
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onToss!(match); }}
                    >
                      <Coins className="w-3.5 h-3.5 mr-2" />
                      Do Toss
                    </DropdownMenuItem>
                  )}
                  {showRedoToss && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        resetCoinToss.mutate(
                          { matchId: match.id, tournamentId, stageId: match.stage_id },
                          { onSuccess: () => { toast.success('Toss reset'); onToss!(match); } }
                        );
                      }}
                      disabled={resetCoinToss.isPending}
                    >
                      <Coins className="w-3.5 h-3.5 mr-2" />
                      Redo Toss
                    </DropdownMenuItem>
                  )}
                  {showForfeitA && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => handleForfeit(e, match.squad_b_id!)}
                      disabled={forfeitMatch.isPending}
                    >
                      <Flag className="w-3.5 h-3.5 mr-2" />
                      Forfeit {match.squad_a?.name || 'Squad A'}
                    </DropdownMenuItem>
                  )}
                  {showForfeitB && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => handleForfeit(e, match.squad_a_id!)}
                      disabled={forfeitMatch.isPending}
                    >
                      <Flag className="w-3.5 h-3.5 mr-2" />
                      Forfeit {match.squad_b?.name || 'Squad B'}
                    </DropdownMenuItem>
                  )}
                  {showDispute && (
                    <DropdownMenuItem
                      className="text-yellow-500 focus:text-yellow-500"
                      onClick={(e) => { e.stopPropagation(); onDispute(); }}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-2" />
                      Dispute Result
                    </DropdownMenuItem>
                  )}
                  {showResolve && (
                    <DropdownMenuItem
                      className="text-primary focus:text-primary"
                      onClick={(e) => { e.stopPropagation(); onResolve(); }}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-2" />
                      Resolve Dispute
                    </DropdownMenuItem>
                  )}
                  {showResetResult && (
                    <DropdownMenuItem
                      className="text-orange-400 focus:text-orange-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetMatchResult.mutate(
                          { matchId: match.id, tournamentId },
                          {
                            onSuccess: () => toast.success('Match result reset to pending'),
                            onError: (err: Error) => toast.error('Failed to reset', { description: err.message }),
                          }
                        );
                      }}
                      disabled={resetMatchResult.isPending}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-2" />
                      Reset Result
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })()}
        </div>
        {match.status === 'completed' && (
          <ShareCardGenerator match={match} tournamentName={tournamentName} />
        )}
      </div>
    </div>
  );
}

function MatchTeamRow({
  squad,
  score,
  isWinner,
  checkedIn,
  showCheckIn,
  onCheckIn,
  large,
  sideBadge,
}: {
  squad: TournamentSquad | null | undefined;
  score: number;
  isWinner: boolean;
  checkedIn?: boolean;
  showCheckIn?: boolean;
  onCheckIn?: (value: boolean) => void;
  large: boolean;
  sideBadge?: 'blue' | 'red';
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-2 rounded',
        isWinner && 'bg-green-500/10 border border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.15)]',
        !squad && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {showCheckIn && onCheckIn && (
          <button
            onClick={(e) => { e.stopPropagation(); onCheckIn(!checkedIn); }}
            className={cn(
              'w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors',
              checkedIn
                ? 'bg-green-500/20 border-green-500/50 text-green-500'
                : 'border-muted-foreground/30 text-muted-foreground hover:border-green-500/30'
            )}
          >
            {checkedIn ? <Check className="w-3 h-3" /> : null}
          </button>
        )}
        {!showCheckIn && checkedIn !== undefined && checkedIn && squad && (
          <Check className="w-3 h-3 text-green-500 shrink-0" />
        )}
        <Avatar className={cn('shrink-0', large ? 'h-7 w-7' : 'h-5 w-5')}>
          {squad?.logo_url ? (
            <AvatarImage src={squad.logo_url} alt={squad.name} />
          ) : null}
          <AvatarFallback className="text-[10px] bg-[#1a1a1a] text-muted-foreground">
            {squad?.name?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <span className={cn('font-medium truncate', large ? 'text-base' : 'text-sm')}>
          {squad?.name || 'TBD'}
        </span>
        {sideBadge && (
          <span className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0',
            sideBadge === 'blue'
              ? 'bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30'
              : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30',
          )}>
            {sideBadge === 'blue' ? 'Blue' : 'Red'}
          </span>
        )}
      </div>
      <span className={cn('font-display font-bold', large ? 'text-lg' : 'text-sm')}>
        {score}
      </span>
    </div>
  );
}

// Dispute submission dialog
function DisputeDialog({
  match,
  tournamentId,
  open,
  onOpenChange,
}: {
  match: TournamentMatch | null;
  tournamentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState('');
  const raiseDispute = useRaiseDispute();

  const handleSubmit = async () => {
    if (!match || !reason.trim()) return;
    try {
      await raiseDispute.mutateAsync({
        matchId: match.id,
        reason: reason.trim(),
        tournamentId,
      });
      toast.success('Dispute raised', { description: 'The host will review your dispute.' });
      setReason('');
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error('Failed to raise dispute', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Dispute Match Result
          </DialogTitle>
          <DialogDescription>
            {match?.squad_a?.name || 'Squad A'} vs {match?.squad_b?.name || 'Squad B'} — Score: {match?.squad_a_score}-{match?.squad_b_score}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why you're disputing this match result..."
            className="min-h-[100px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim() || raiseDispute.isPending}
            className="bg-yellow-500 text-black hover:bg-yellow-600"
          >
            {raiseDispute.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Submit Dispute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Resolve dispute dialog (host only)
function ResolveDisputeDialog({
  match,
  tournamentId,
  open,
  onOpenChange,
}: {
  match: TournamentMatch | null;
  tournamentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [notes, setNotes] = useState('');
  const [newScoreA, setNewScoreA] = useState('');
  const [newScoreB, setNewScoreB] = useState('');
  const resolveDispute = useResolveDispute();

  const handleResolve = async () => {
    if (!match || !notes.trim()) return;

    const hasNewScores = newScoreA !== '' && newScoreB !== '';
    const scoreA = hasNewScores ? parseInt(newScoreA) : undefined;
    const scoreB = hasNewScores ? parseInt(newScoreB) : undefined;

    let newWinnerId: string | undefined;
    if (scoreA !== undefined && scoreB !== undefined && scoreA !== scoreB) {
      const winningSide = scoreA > scoreB ? match.squad_a_id : match.squad_b_id;
      if (!winningSide) {
        toast.error('Cannot determine winner — squad data missing');
        return;
      }
      newWinnerId = winningSide;
    }

    try {
      await resolveDispute.mutateAsync({
        matchId: match.id,
        resolutionNotes: notes.trim(),
        newWinnerId,
        newSquadAScore: scoreA,
        newSquadBScore: scoreB,
        tournamentId,
      });
      toast.success('Dispute resolved');
      setNotes('');
      setNewScoreA('');
      setNewScoreB('');
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error('Failed to resolve dispute', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            Resolve Dispute
          </DialogTitle>
          <DialogDescription>
            {match?.squad_a?.name || 'Squad A'} vs {match?.squad_b?.name || 'Squad B'}
          </DialogDescription>
        </DialogHeader>

        {match?.dispute_reason && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs font-medium text-yellow-500 mb-1">Dispute Reason:</p>
            <p className="text-sm text-muted-foreground">{match.dispute_reason}</p>
          </div>
        )}

        <div className="space-y-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter your resolution notes..."
            className="min-h-[80px]"
          />
          <div>
            <p className="text-sm font-medium mb-2">Update scores (optional):</p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">{match?.squad_a?.name || 'Squad A'}</p>
                <Input
                  type="number"
                  min={0}
                  value={newScoreA}
                  onChange={(e) => setNewScoreA(e.target.value)}
                  placeholder={String(match?.squad_a_score ?? 0)}
                />
              </div>
              <span className="text-muted-foreground font-bold mt-4">-</span>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">{match?.squad_b?.name || 'Squad B'}</p>
                <Input
                  type="number"
                  min={0}
                  value={newScoreB}
                  onChange={(e) => setNewScoreB(e.target.value)}
                  placeholder={String(match?.squad_b_score ?? 0)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleResolve}
            disabled={!notes.trim() || resolveDispute.isPending}
          >
            {resolveDispute.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Resolve Dispute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
