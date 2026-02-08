import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ImageUpload';
import { useUpdateMatchResult } from '@/hooks/useTournaments';
import { cn } from '@/lib/utils';
import { 
  Trophy, 
  Users, 
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
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
      <div className="glass-card p-8 text-center">
        <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No bracket yet</h3>
        <p className="text-muted-foreground text-sm">
          The bracket will be generated once registration closes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Round Robin View */}
      {tournament.format === 'round_robin' && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">All Matches</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onClick={() => setSelectedMatch(match)}
                isHost={isHost}
              />
            ))}
          </div>
        </div>
      )}

      {/* Elimination Bracket View */}
      {tournament.format !== 'round_robin' && (
        <>
          {/* Winners Bracket */}
          {winnersMatches.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                {tournament.format === 'double_elimination' ? 'Winners Bracket' : 'Bracket'}
              </h3>
              <BracketView
                matches={winnersMatches}
                maxRound={maxRound}
                onMatchClick={(match) => setSelectedMatch(match)}
                isHost={isHost}
              />
            </div>
          )}

          {/* Losers Bracket (Double Elim only) */}
          {losersMatches.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-secondary" />
                Losers Bracket
              </h3>
              <BracketView
                matches={losersMatches}
                maxRound={maxRound}
                onMatchClick={(match) => setSelectedMatch(match)}
                isHost={isHost}
              />
            </div>
          )}

          {/* Finals */}
          {finalsMatches.length > 0 && (
            <div className="glass-card p-6 border-secondary/30">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
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
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Match Result Dialog */}
      {selectedMatch && (
        <MatchResultDialog
          match={selectedMatch}
          tournamentId={tournament.id}
          isHost={isHost}
          canEdit={isHost && (tournament.status === 'ongoing' || tournament.status === 'bracket_generated')}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}

// Bracket visualization (simplified horizontal bracket)
function BracketView({
  matches,
  maxRound,
  onMatchClick,
  isHost,
}: {
  matches: TournamentMatch[];
  maxRound: number;
  onMatchClick: (match: TournamentMatch) => void;
  isHost: boolean;
}) {
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-8 min-w-max py-4">
        {rounds.map((round) => (
          <div key={round} className="flex flex-col gap-4 min-w-[200px]">
            <h4 className="text-sm font-medium text-muted-foreground text-center">
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
                />
              ))}
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
}: {
  match: TournamentMatch;
  onClick: () => void;
  isHost: boolean;
  large?: boolean;
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
        'w-full p-3 rounded-lg border border-border bg-card/50 hover:border-primary/50 hover:bg-card transition-all text-left',
        large && 'p-4'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className="text-xs">
          Bo{match.best_of}
        </Badge>
        <span className={cn('flex items-center gap-1 text-xs', statusColors[match.status])}>
          {statusIcons[match.status]}
          {MATCH_STATUS_LABELS[match.status]}
        </span>
      </div>

      <div className="space-y-2">
        <MatchTeamRow
          squad={match.squad_a}
          score={match.squad_a_score}
          isWinner={match.winner_id === match.squad_a_id}
          large={large}
        />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" />
          <span>VS</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <MatchTeamRow
          squad={match.squad_b}
          score={match.squad_b_score}
          isWinner={match.winner_id === match.squad_b_id}
          large={large}
        />
      </div>
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
        isWinner && 'bg-green-500/10 border border-green-500/30',
        !squad && 'opacity-50'
      )}
    >
      <span className={cn('font-medium truncate', large ? 'text-base' : 'text-sm')}>
        {squad?.name || 'TBD'}
      </span>
      <span className={cn('font-bold', large ? 'text-lg' : 'text-sm')}>
        {score}
      </span>
    </div>
  );
}

// Match result dialog
function MatchResultDialog({
  match,
  tournamentId,
  isHost,
  canEdit,
  onClose,
}: {
  match: TournamentMatch;
  tournamentId: string;
  isHost: boolean;
  canEdit: boolean;
  onClose: () => void;
}) {
  const updateResult = useUpdateMatchResult();
  
  const [squadAScore, setSquadAScore] = useState(match.squad_a_score.toString());
  const [squadBScore, setSquadBScore] = useState(match.squad_b_score.toString());
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(match.result_screenshot);

  const handleSubmit = async () => {
    const aScore = parseInt(squadAScore) || 0;
    const bScore = parseInt(squadBScore) || 0;

    if (aScore === bScore) {
      toast.error('Match cannot end in a tie');
      return;
    }

    const winnerId = aScore > bScore ? match.squad_a_id : match.squad_b_id;
    if (!winnerId) {
      toast.error('Cannot determine winner');
      return;
    }

    try {
      await updateResult.mutateAsync({
        matchId: match.id,
        winnerId,
        squadAScore: aScore,
        squadBScore: bScore,
        screenshotUrl: screenshotUrl || undefined,
        tournamentId,
      });
      toast.success('Match result updated');
      onClose();
    } catch (error: any) {
      toast.error('Failed to update result', { description: error.message });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Match Details</DialogTitle>
          <DialogDescription>
            {match.squad_a?.name || 'TBD'} vs {match.squad_b?.name || 'TBD'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant="outline">{MATCH_STATUS_LABELS[match.status]}</Badge>
          </div>

          {/* Format */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Format</span>
            <span className="text-sm font-medium">Best of {match.best_of}</span>
          </div>

          {/* Scores (editable if host) */}
          {canEdit && match.squad_a && match.squad_b ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 items-center">
                <div>
                  <Label className="text-xs text-muted-foreground">{match.squad_a?.name}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={squadAScore}
                    onChange={(e) => setSquadAScore(e.target.value)}
                    className="text-center text-lg font-bold"
                  />
                </div>
                <div className="text-center text-muted-foreground">-</div>
                <div>
                  <Label className="text-xs text-muted-foreground">{match.squad_b?.name}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={squadBScore}
                    onChange={(e) => setSquadBScore(e.target.value)}
                    className="text-center text-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <Label>Result Screenshot (Optional)</Label>
                <div className="mt-2">
                  <ImageUpload
                    bucket="tournament-assets"
                    currentUrl={screenshotUrl}
                    onUpload={setScreenshotUrl}
                    onRemove={() => setScreenshotUrl(null)}
                    shape="wide"
                    size="md"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 items-center text-center">
              <div>
                <p className="text-sm text-muted-foreground">{match.squad_a?.name || 'TBD'}</p>
                <p className="text-2xl font-bold">{match.squad_a_score}</p>
              </div>
              <div className="text-muted-foreground">-</div>
              <div>
                <p className="text-sm text-muted-foreground">{match.squad_b?.name || 'TBD'}</p>
                <p className="text-2xl font-bold">{match.squad_b_score}</p>
              </div>
            </div>
          )}

          {/* Screenshot preview */}
          {match.result_screenshot && !canEdit && (
            <div>
              <Label className="text-xs text-muted-foreground">Result Screenshot</Label>
              <img
                src={match.result_screenshot}
                alt="Match result"
                className="mt-2 rounded-lg border border-border"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          {canEdit && match.squad_a && match.squad_b && (
            <Button
              onClick={handleSubmit}
              disabled={updateResult.isPending}
              className="btn-gaming"
            >
              {updateResult.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Save Result
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
