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
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRaiseDispute, useResolveDispute } from '@/hooks/useTournaments';
import type { TournamentMatch } from '@/lib/tournament-types';

export function DisputeDialog({
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

export function ResolveDisputeDialog({
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

    if (scoreA !== undefined && scoreB !== undefined && (isNaN(scoreA) || isNaN(scoreB))) {
      toast.error('Scores must be valid numbers');
      return;
    }

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
