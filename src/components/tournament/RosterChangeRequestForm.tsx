import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { GlowCard } from '@/components/tron/GlowCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserMinus, UserPlus, ArrowRightLeft, Check, X, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  useTournamentSquadMembers,
  useRosterChanges,
  useMakeRosterChange,
} from '@/hooks/useTournaments';
import type { RosterChange, TournamentSquadMember } from '@/lib/tournament-types';

interface RosterChangeRequestFormProps {
  tournamentId: string;
  tournamentSquadId: string;
  squadName: string;
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pending: {
    color: 'border-yellow-500/40 text-yellow-500',
    icon: <Clock className="w-3 h-3" />,
    label: 'Pending',
  },
  approved: {
    color: 'border-green-500/40 text-green-500',
    icon: <Check className="w-3 h-3" />,
    label: 'Approved',
  },
  rejected: {
    color: 'border-red-500/40 text-red-500',
    icon: <X className="w-3 h-3" />,
    label: 'Rejected',
  },
};

function ChangeHistoryItem({ change }: { change: RosterChange }) {
  const config = STATUS_CONFIG[change.status] || STATUS_CONFIG.pending;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 border border-border">
      <ArrowRightLeft className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="text-red-400 font-medium">{change.player_out_ign}</span>
          <span className="text-muted-foreground">&rarr;</span>
          <span className="text-green-400 font-medium">{change.player_in_ign}</span>
          <span className="text-xs text-muted-foreground">({change.player_in_mlbb_id})</span>
        </div>
        {change.reason && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{change.reason}</p>
        )}
      </div>
      <Badge variant="outline" className={`text-xs gap-1 shrink-0 ${config.color}`}>
        {config.icon}
        {config.label}
      </Badge>
    </div>
  );
}

export function RosterChangeRequestForm({
  tournamentId,
  tournamentSquadId,
  squadName,
}: RosterChangeRequestFormProps) {
  const { data: members, isLoading: membersLoading } = useTournamentSquadMembers(tournamentSquadId);
  const { data: changes, isLoading: changesLoading } = useRosterChanges(tournamentSquadId, tournamentId);
  const makeChange = useMakeRosterChange();

  const [showForm, setShowForm] = useState(false);
  const [playerOutId, setPlayerOutId] = useState('');
  const [playerInIgn, setPlayerInIgn] = useState('');
  const [playerInMlbbId, setPlayerInMlbbId] = useState('');
  const [reason, setReason] = useState('');

  const approvedCount = changes?.filter(c => c.status === 'approved').length ?? 0;
  const pendingCount = changes?.filter(c => c.status === 'pending').length ?? 0;
  const maxReached = approvedCount >= 2;

  const selectedMember = members?.find(m => m.id === playerOutId);

  const handleSubmit = async () => {
    if (!playerOutId || !playerInIgn.trim() || !playerInMlbbId.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!selectedMember) {
      toast.error('Please select a player to replace');
      return;
    }

    try {
      await makeChange.mutateAsync({
        squadId: tournamentSquadId,
        tournamentId,
        playerOutIgn: selectedMember.ign,
        playerOutId: selectedMember.id,
        playerInIgn: playerInIgn.trim(),
        playerInMlbbId: playerInMlbbId.trim(),
        reason: reason.trim() || undefined,
      });
      toast.success('Roster change request submitted');
      setShowForm(false);
      setPlayerOutId('');
      setPlayerInIgn('');
      setPlayerInMlbbId('');
      setReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request');
    }
  };

  if (membersLoading || changesLoading) {
    return (
      <GlowCard className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading roster...</span>
        </div>
      </GlowCard>
    );
  }

  return (
    <GlowCard className="p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            Roster Changes
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {maxReached
              ? 'Maximum roster changes (2) reached'
              : `${approvedCount}/2 approved changes used`}
          </p>
        </div>
        {!maxReached && !showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
            Request Change
          </Button>
        )}
      </div>

      {/* Existing changes */}
      {changes && changes.length > 0 && (
        <div className="space-y-2 mb-3">
          {changes.map(change => (
            <ChangeHistoryItem key={change.id} change={change} />
          ))}
        </div>
      )}

      {/* Warning for pending */}
      {pendingCount > 0 && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/20 mb-3">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-500/80">
            You have a pending request. The host will review it soon.
          </p>
        </div>
      )}

      {/* New change form */}
      {showForm && (
        <div className="space-y-3 pt-3 border-t border-border/50">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            New Roster Change Request
          </h4>

          {/* Player out */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1.5">
              <UserMinus className="w-3 h-3 text-red-400" />
              Player to Remove
            </label>
            <Select value={playerOutId} onValueChange={setPlayerOutId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select player..." />
              </SelectTrigger>
              <SelectContent>
                {members?.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.ign} — {m.mlbb_id} ({m.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Player in */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1.5">
                <UserPlus className="w-3 h-3 text-green-400" />
                New Player IGN
              </label>
              <Input
                value={playerInIgn}
                onChange={e => setPlayerInIgn(e.target.value)}
                placeholder="In-game name"
                className="h-10"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                New Player MLBB ID
              </label>
              <Input
                value={playerInMlbbId}
                onChange={e => setPlayerInMlbbId(e.target.value)}
                placeholder="e.g. 123456789"
                className="h-10"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Reason (optional)
            </label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why is this change needed?"
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={makeChange.isPending || !playerOutId || !playerInIgn.trim() || !playerInMlbbId.trim()}
            >
              {makeChange.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Submit Request
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                setPlayerOutId('');
                setPlayerInIgn('');
                setPlayerInMlbbId('');
                setReason('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!changes || changes.length === 0) && !showForm && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No roster changes requested yet.
        </p>
      )}
    </GlowCard>
  );
}
