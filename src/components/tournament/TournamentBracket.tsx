import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { GlowCard } from '@/components/tron/GlowCard';
import { cn } from '@/lib/utils';
import {
  useUpdateMatchCheckIn,
  useForfeitMatch,
  useRaiseDispute,
  useResolveDispute,
  useResetCoinToss,
  useTournamentStages,
  useTournamentGroups,
  useTournamentGroupTeams,
  useStageMatches,
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

  // Single-stage fallback — original behavior
  const winnersMatches = matches.filter(m => m.bracket_type === 'winners');
  const losersMatches = matches.filter(m => m.bracket_type === 'losers');
  const finalsMatches = matches.filter(m => m.bracket_type === 'finals');
  const maxRound = Math.max(...matches.map(m => m.round), 0);

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
                {...sharedProps}
              />
            ))}
          </div>
        </GlowCard>
      )}

      {/* Elimination Bracket View */}
      {tournament.format !== 'round_robin' && (
        <>
          {winnersMatches.length > 0 && (
            <GlowCard className="p-6">
              <h3 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2 tracking-wide">
                <Trophy className="w-5 h-5 text-[#FF4500]" />
                {tournament.format === 'double_elimination' ? 'Winners Bracket' : 'Bracket'}
              </h3>
              <BracketView
                matches={winnersMatches}
                maxRound={maxRound}
                onMatchClick={(match) => setSelectedMatch(match)}
                onDispute={(match) => setDisputeMatch(match)}
                onResolve={(match) => setResolveMatch(match)}
                {...sharedProps}
              />
            </GlowCard>
          )}

          {losersMatches.length > 0 && (
            <GlowCard glowColor="secondary" className="p-6">
              <h3 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2 tracking-wide">
                <Users className="w-5 h-5 text-[#FF6B35]" />
                Losers Bracket
              </h3>
              <BracketView
                matches={losersMatches}
                maxRound={maxRound}
                onMatchClick={(match) => setSelectedMatch(match)}
                onDispute={(match) => setDisputeMatch(match)}
                onResolve={(match) => setResolveMatch(match)}
                {...sharedProps}
              />
            </GlowCard>
          )}

          {finalsMatches.length > 0 && (
            <GlowCard glowColor="accent" className="p-6 neon-border">
              <h3 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2 tracking-wide">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Grand Finals
              </h3>
              <div className="flex justify-center">
                {finalsMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onClick={() => setSelectedMatch(match)}
                    onDispute={() => setDisputeMatch(match)}
                    onResolve={() => setResolveMatch(match)}
                    large
                    {...sharedProps}
                  />
                ))}
              </div>
            </GlowCard>
          )}
        </>
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
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [disputeMatch, setDisputeMatch] = useState<TournamentMatch | null>(null);
  const [resolveMatch, setResolveMatch] = useState<TournamentMatch | null>(null);
  const [tossMatch, setTossMatch] = useState<TournamentMatch | null>(null);

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

  // Auto-select the latest active stage
  const defaultStageIndex = stages.findIndex(s => s.status === 'ongoing')
    ?? stages.findIndex(s => s.status !== 'completed')
    ?? 0;

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
      <div className="flex gap-2 overflow-x-auto pb-1">
        {stages.map((stage, i) => (
          <button
            key={stage.id}
            onClick={() => setActiveStageIndex(i)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-display font-semibold uppercase tracking-wider whitespace-nowrap transition-all',
              i === activeStageIndex
                ? 'bg-[#FF4500]/10 border-[#FF4500]/50 text-[#FF4500] shadow-[0_0_8px_rgba(255,69,0,0.15)]'
                : 'border-border/50 text-muted-foreground hover:border-[#FF4500]/30 hover:text-foreground',
              stage.status === 'completed' && i !== activeStageIndex && 'border-green-500/30 text-green-500/70',
            )}
          >
            <span className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border',
              stage.status === 'completed' && 'bg-green-500/20 border-green-500 text-green-500',
              stage.status === 'ongoing' && 'bg-[#FF4500]/20 border-[#FF4500] text-[#FF4500]',
              (stage.status === 'pending' || stage.status === 'configuring') && 'border-muted-foreground/30 text-muted-foreground/50',
            )}>
              {stage.status === 'completed' ? <Check className="w-3 h-3" /> : i + 1}
            </span>
            {stage.name}
            <span className="text-[10px] font-normal normal-case opacity-70">
              {TOURNAMENT_FORMAT_LABELS[stage.format]}
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
        const teamIds = (groupTeams || [])
          .filter(gt => gt.group_id === group.id)
          .map(gt => gt.tournament_squad_id);

        const groupMatches = stageMatches.filter(m => m.group_id === group.id);

        // Build squad map from match data
        const squadMap = new Map<string, TournamentSquad>();
        for (const m of groupMatches) {
          if (m.squad_a && teamIds.includes(m.squad_a_id!)) squadMap.set(m.squad_a_id!, m.squad_a);
          if (m.squad_b && teamIds.includes(m.squad_b_id!)) squadMap.set(m.squad_b_id!, m.squad_b);
        }
        // Also use groupTeams data if available
        for (const gt of (groupTeams || [])) {
          if (gt.group_id === group.id && (gt as any).tournament_squads) {
            squadMap.set(gt.tournament_squad_id, (gt as any).tournament_squads);
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
            />

            {/* Group Matches */}
            {groupMatches.length > 0 && (
              <div className="pl-1">
                <p className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Group {group.label} Matches
                </p>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {groupMatches
                    .sort((a, b) => a.match_number - b.match_number)
                    .map((match) => (
                      <MatchCard
                        key={match.id}
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
                    ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
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
  const finalsMatches = stageMatches.filter(m => m.bracket_type === 'finals');
  const maxRound = Math.max(...stageMatches.map(m => m.round), 0);

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

  return (
    <>
      {winnersMatches.length > 0 && (
        <GlowCard className="p-6">
          <h3 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2 tracking-wide">
            <Trophy className="w-5 h-5 text-[#FF4500]" />
            {stage.format === 'double_elimination' ? 'Winners Bracket' : 'Bracket'}
          </h3>
          <BracketView
            matches={winnersMatches}
            maxRound={maxRound}
            onMatchClick={onMatchClick}
            onDispute={onDispute}
            onResolve={onResolve}
            {...sharedProps}
          />
        </GlowCard>
      )}

      {losersMatches.length > 0 && (
        <GlowCard glowColor="secondary" className="p-6">
          <h3 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2 tracking-wide">
            <Users className="w-5 h-5 text-[#FF6B35]" />
            Losers Bracket
          </h3>
          <BracketView
            matches={losersMatches}
            maxRound={maxRound}
            onMatchClick={onMatchClick}
            onDispute={onDispute}
            onResolve={onResolve}
            {...sharedProps}
          />
        </GlowCard>
      )}

      {finalsMatches.length > 0 && (
        <GlowCard glowColor="accent" className="p-6 neon-border">
          <h3 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2 tracking-wide">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Grand Finals
          </h3>
          <div className="flex justify-center">
            {finalsMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onClick={() => onMatchClick(match)}
                onDispute={() => onDispute(match)}
                onResolve={() => onResolve(match)}
                large
                {...sharedProps}
              />
            ))}
          </div>
        </GlowCard>
      )}
    </>
  );
}

// Bracket visualization
function BracketView({
  matches,
  maxRound,
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
  maxRound: number;
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
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2 min-w-max py-4">
        {rounds.map((round, roundIndex) => (
          <div key={round} className="flex items-stretch">
            <div className="flex flex-col gap-4 min-w-[220px]">
              <h4 className="text-xs font-display font-medium text-muted-foreground text-center uppercase tracking-wider">
                Round {round}
              </h4>
              {matches
                .filter(m => m.round === round)
                .sort((a, b) => a.match_number - b.match_number)
                .map((match) => (
                  <MatchCard
                    key={match.id}
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
                ))}
            </div>
            {roundIndex < rounds.length - 1 && (
              <div className="flex items-center px-1">
                <div
                  className="w-6 h-px bg-[#FF4500]/40"
                  style={{ boxShadow: '0 0 4px rgba(255,69,0,0.3)' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
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
  onToss?: () => void;
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
      onError: (err: any) => toast.error('Failed to forfeit', { description: err.message }),
    });
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'w-full p-3 rounded-lg border bg-[#111111] transition-all text-left cursor-pointer',
        'border-[#FF4500]/20 hover:border-[#FF4500]/50 hover:shadow-[0_0_10px_rgba(255,69,0,0.15)]',
        match.status === 'ongoing' && 'border-yellow-400/40',
        match.status === 'completed' && 'border-green-500/20',
        match.status === 'disputed' && 'border-destructive/40',
        large && 'p-4 neon-border'
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

      {match.scheduled_time && (
        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {format(new Date(match.scheduled_time), 'MMM d, h:mm a')}
        </p>
      )}

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
            const hasActions = showForfeitA || showForfeitB || showDispute || showResolve || showDoToss || showRedoToss;

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
                      onClick={(e) => { e.stopPropagation(); onToss!(); }}
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
                          { onSuccess: () => { toast.success('Toss reset'); onToss!(); } }
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
            'text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0',
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
    } catch (error: any) {
      toast.error('Failed to raise dispute', { description: error.message });
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
      newWinnerId = scoreA > scoreB ? match.squad_a_id! : match.squad_b_id!;
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
    } catch (error: any) {
      toast.error('Failed to resolve dispute', { description: error.message });
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
