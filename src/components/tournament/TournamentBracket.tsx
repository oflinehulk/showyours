import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { DraftSummaryBadge } from '@/components/tournament/DraftPickPanel';
import { ScoreEditSheet } from '@/components/tournament/ScoreEditSheet';
import { ShareCardGenerator } from '@/components/tournament/ShareCardGenerator';
import { GlowCard } from '@/components/tron/GlowCard';
import { cn } from '@/lib/utils';
import {
  Trophy,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Tournament, TournamentMatch, TournamentSquad, MatchStatus } from '@/lib/tournament-types';
import { MATCH_STATUS_LABELS } from '@/lib/tournament-types';

interface TournamentBracketProps {
  tournament: Tournament;
  matches: TournamentMatch[];
  isHost: boolean;
}

export function TournamentBracket({ tournament, matches, isHost }: TournamentBracketProps) {
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);

  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    const key = `${match.bracket_type}-${match.round}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {} as Record<string, TournamentMatch[]>);

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
                isHost={isHost}
                tournamentName={tournament.name}
              />
            ))}
          </div>
        </GlowCard>
      )}

      {/* Elimination Bracket View */}
      {tournament.format !== 'round_robin' && (
        <>
          {/* Winners Bracket */}
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
                isHost={isHost}
                tournamentName={tournament.name}
              />
            </GlowCard>
          )}

          {/* Losers Bracket (Double Elim only) */}
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
                isHost={isHost}
                tournamentName={tournament.name}
              />
            </GlowCard>
          )}

          {/* Finals */}
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
                    isHost={isHost}
                    large
                    tournamentName={tournament.name}
                  />
                ))}
              </div>
            </GlowCard>
          )}
        </>
      )}

      {/* Score Edit Sheet (replaces old MatchResultDialog) */}
      <ScoreEditSheet
        match={selectedMatch}
        tournamentId={tournament.id}
        isHost={isHost}
        canEdit={isHost && (tournament.status === 'ongoing' || tournament.status === 'bracket_generated')}
        open={!!selectedMatch}
        onOpenChange={(open) => { if (!open) setSelectedMatch(null); }}
      />
    </div>
  );
}

// Bracket visualization (simplified horizontal bracket)
function BracketView({
  matches,
  maxRound,
  onMatchClick,
  isHost,
  tournamentName,
}: {
  matches: TournamentMatch[];
  maxRound: number;
  onMatchClick: (match: TournamentMatch) => void;
  isHost: boolean;
  tournamentName: string;
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
                    isHost={isHost}
                    tournamentName={tournamentName}
                  />
                ))}
            </div>
            {/* Neon connector between rounds */}
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
  isHost,
  large = false,
  tournamentName,
}: {
  match: TournamentMatch;
  onClick: () => void;
  isHost: boolean;
  large?: boolean;
  tournamentName: string;
}) {
  const statusIcons: Record<MatchStatus, React.ReactNode> = {
    pending: <Clock className="w-3 h-3" />,
    ongoing: <AlertCircle className="w-3 h-3" />,
    completed: <CheckCircle className="w-3 h-3" />,
    disputed: <AlertCircle className="w-3 h-3" />,
  };

  const statusColors: Record<MatchStatus, string> = {
    pending: 'text-muted-foreground',
    ongoing: 'text-yellow-400',
    completed: 'text-green-400',
    disputed: 'text-destructive',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-3 rounded-lg border bg-[#111111] transition-all text-left',
        'border-[#FF4500]/20 hover:border-[#FF4500]/50 hover:shadow-[0_0_10px_rgba(255,69,0,0.15)]',
        match.status === 'ongoing' && 'border-yellow-400/40',
        match.status === 'completed' && 'border-green-500/20',
        large && 'p-4 neon-border'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-xs border-[#FF4500]/20">
            Bo{match.best_of}
          </Badge>
          <DraftSummaryBadge matchId={match.id} />
        </div>
        <span className={cn('flex items-center gap-1 text-xs', statusColors[match.status])}>
          {statusIcons[match.status]}
          {MATCH_STATUS_LABELS[match.status]}
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
          large={large}
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
          large={large}
        />
      </div>

      {/* Share button for completed matches */}
      {match.status === 'completed' && (
        <div className="mt-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
          <ShareCardGenerator match={match} tournamentName={tournamentName} />
        </div>
      )}
    </button>
  );
}

function MatchTeamRow({
  squad,
  score,
  isWinner,
  large,
}: {
  squad: TournamentSquad | null | undefined;
  score: number;
  isWinner: boolean;
  large: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-2 rounded',
        isWinner && 'bg-green-500/10 border border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.15)]',
        !squad && 'opacity-50'
      )}
    >
      <span className={cn('font-medium truncate', large ? 'text-base' : 'text-sm')}>
        {squad?.name || 'TBD'}
      </span>
      <span className={cn('font-display font-bold', large ? 'text-lg' : 'text-sm')}>
        {score}
      </span>
    </div>
  );
}
