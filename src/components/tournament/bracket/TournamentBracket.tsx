import { useState } from 'react';
import { GlowCard } from '@/components/tron/GlowCard';
import { ScoreEditSheet } from '@/components/tournament/ScoreEditSheet';
import { CoinTossOverlay } from '@/components/tournament/CoinTossOverlay';
import { MultiStageBracket } from './MultiStageBracket';
import { EliminationStageView } from './EliminationStageView';
import { MatchCard } from './MatchCard';
import { DisputeDialog, ResolveDisputeDialog } from './DisputeDialogs';
import { Trophy } from 'lucide-react';
import type { Tournament, TournamentMatch, TournamentStage } from '@/lib/tournament-types';

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

  if (tournament.is_multi_stage) {
    return (
      <MultiStageBracket
        tournament={tournament}
        allMatches={matches}
        isHost={isHost}
        userSquadIds={userSquadIds}
      />
    );
  }

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

  const singleStageView = {
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

      {/* Elimination Bracket View */}
      {tournament.format !== 'round_robin' && (
        <EliminationStageView {...singleStageView} />
      )}

      <ScoreEditSheet
        match={selectedMatch}
        tournamentId={tournament.id}
        isHost={isHost}
        canEdit={isHost && (tournament.status === 'ongoing' || tournament.status === 'bracket_generated')}
        open={!!selectedMatch}
        onOpenChange={(open) => { if (!open) setSelectedMatch(null); }}
      />

      <DisputeDialog
        match={disputeMatch}
        tournamentId={tournament.id}
        open={!!disputeMatch}
        onOpenChange={(open) => { if (!open) setDisputeMatch(null); }}
      />

      <ResolveDisputeDialog
        match={resolveMatch}
        tournamentId={tournament.id}
        open={!!resolveMatch}
        onOpenChange={(open) => { if (!open) setResolveMatch(null); }}
      />

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
