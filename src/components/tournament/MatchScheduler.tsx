import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, addMinutes, setHours, setMinutes, isBefore, isEqual } from 'date-fns';
import {
  CalendarIcon,
  Clock,
  Zap,
  AlertTriangle,
  Check,
  Loader2,
  Edit3,
  CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateMatchSchedule, useBulkUpdateMatchSchedule } from '@/hooks/useMatchScheduler';
import type { TournamentMatch, TournamentSquad } from '@/lib/tournament-types';
import { MATCH_STATUS_LABELS } from '@/lib/tournament-types';

interface MatchSchedulerProps {
  tournamentId: string;
  matches: TournamentMatch[];
}

interface ScheduleConflict {
  matchA: TournamentMatch;
  matchB: TournamentMatch;
  squadName: string;
}

export function MatchScheduler({ tournamentId, matches }: MatchSchedulerProps) {
  const [showAutoScheduler, setShowAutoScheduler] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  
  // Detect conflicts: same squad in overlapping timings
  const conflicts = useMemo(() => detectConflicts(matches), [matches]);

  // Only show non-completed matches
  const schedulableMatches = matches.filter(m => m.status !== 'completed');

  return (
    <div className="space-y-6">
      {/* Header with auto-scheduler button */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Match Schedule
          </h3>
          <Button onClick={() => setShowAutoScheduler(true)} className="btn-gaming" size="sm">
            <Zap className="w-4 h-4 mr-2" />
            Auto-Schedule
          </Button>
        </div>

        {/* Conflict warnings */}
        {conflicts.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2 text-destructive text-sm font-medium mb-2">
              <AlertTriangle className="w-4 h-4" />
              {conflicts.length} scheduling conflict{conflicts.length > 1 ? 's' : ''} detected
            </div>
            <div className="space-y-1">
              {conflicts.map((c, i) => (
                <p key={i} className="text-xs text-destructive/80">
                  <span className="font-medium">{c.squadName}</span> has overlapping matches: 
                  Match #{c.matchA.match_number} (R{c.matchA.round}) &amp; Match #{c.matchB.match_number} (R{c.matchB.round})
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Match list */}
        <div className="space-y-2">
          {schedulableMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No matches to schedule.</p>
          ) : (
            schedulableMatches.map((match) => (
              <MatchTimingRow
                key={match.id}
                match={match}
                tournamentId={tournamentId}
                isEditing={editingMatchId === match.id}
                onEdit={() => setEditingMatchId(match.id)}
                onClose={() => setEditingMatchId(null)}
                hasConflict={conflicts.some(c => c.matchA.id === match.id || c.matchB.id === match.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Auto-Scheduler Dialog */}
      <AutoSchedulerDialog
        open={showAutoScheduler}
        onClose={() => setShowAutoScheduler(false)}
        tournamentId={tournamentId}
        matches={schedulableMatches}
      />
    </div>
  );
}

// Individual match timing row
function MatchTimingRow({
  match,
  tournamentId,
  isEditing,
  onEdit,
  onClose,
  hasConflict,
}: {
  match: TournamentMatch;
  tournamentId: string;
  isEditing: boolean;
  onEdit: () => void;
  onClose: () => void;
  hasConflict: boolean;
}) {
  const updateSchedule = useUpdateMatchSchedule();
  const [date, setDate] = useState<Date | undefined>(
    match.scheduled_time ? new Date(match.scheduled_time) : undefined
  );
  const [time, setTime] = useState(
    match.scheduled_time ? format(new Date(match.scheduled_time), 'HH:mm') : '18:00'
  );

  const handleSave = async () => {
    if (!date) {
      toast.error('Please select a date');
      return;
    }
    const [hours, mins] = time.split(':').map(Number);
    const scheduledTime = setMinutes(setHours(date, hours), mins);

    try {
      await updateSchedule.mutateAsync({
        matchId: match.id,
        scheduledTime: scheduledTime.toISOString(),
        tournamentId,
      });
      toast.success('Match timing updated');
      onClose();
    } catch (error: any) {
      toast.error('Failed to update timing', { description: error.message });
    }
  };

  const handleClear = async () => {
    try {
      await updateSchedule.mutateAsync({
        matchId: match.id,
        scheduledTime: null,
        tournamentId,
      });
      setDate(undefined);
      toast.success('Timing cleared');
      onClose();
    } catch (error: any) {
      toast.error('Failed to clear timing', { description: error.message });
    }
  };

  return (
    <div className={cn(
      'flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border transition-colors',
      hasConflict ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-card/50',
    )}>
      {/* Match info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs shrink-0">
            R{match.round} #{match.match_number}
          </Badge>
          {match.bracket_type !== 'winners' && (
            <Badge variant="secondary" className="text-xs shrink-0 capitalize">
              {match.bracket_type}
            </Badge>
          )}
          {hasConflict && (
            <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
          )}
        </div>
        <p className="text-sm font-medium text-foreground mt-1 truncate">
          {(match.squad_a as TournamentSquad | null)?.name || 'TBD'} vs {(match.squad_b as TournamentSquad | null)?.name || 'TBD'}
        </p>
      </div>

      {/* Timing display / edit */}
      {isEditing ? (
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn('w-[140px] justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                <CalendarIcon className="w-3 h-3 mr-2" />
                {date ? format(date, 'MMM d') : 'Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-[100px] h-9 text-sm"
          />
          <Button size="sm" onClick={handleSave} disabled={updateSchedule.isPending}>
            {updateSchedule.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleClear} className="text-xs text-muted-foreground">
            Clear
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {match.scheduled_time ? (
            <span className="text-sm text-foreground flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-primary" />
              {format(new Date(match.scheduled_time), 'MMM d, h:mm a')}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground italic">Not scheduled</span>
          )}
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Edit3 className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Auto-Scheduler Dialog
function AutoSchedulerDialog({
  open,
  onClose,
  tournamentId,
  matches,
}: {
  open: boolean;
  onClose: () => void;
  tournamentId: string;
  matches: TournamentMatch[];
}) {
  const bulkUpdate = useBulkUpdateMatchSchedule();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('18:00');
  const [matchesPerDay, setMatchesPerDay] = useState('4');
  const [gapMinutes, setGapMinutes] = useState('60');

  const previewSchedule = useMemo(() => {
    if (!startDate) return [];
    
    const [hours, mins] = startTime.split(':').map(Number);
    let currentTime = setMinutes(setHours(startDate, hours), mins);
    let dayCount = 0;
    const gap = parseInt(gapMinutes) || 60;
    const perDay = parseInt(matchesPerDay) || 4;

    // Sort matches by round then match_number
    const sorted = [...matches].sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return a.match_number - b.match_number;
    });

    return sorted.map((match, i) => {
      if (i > 0 && i % perDay === 0) {
        // Move to next day, same start time
        dayCount++;
        const nextDay = new Date(startDate);
        nextDay.setDate(nextDay.getDate() + dayCount);
        currentTime = setMinutes(setHours(nextDay, hours), mins);
      } else if (i > 0) {
        currentTime = addMinutes(currentTime, gap);
      }
      return { matchId: match.id, scheduledTime: currentTime.toISOString(), match };
    });
  }, [startDate, startTime, matchesPerDay, gapMinutes, matches]);

  const handleApply = async () => {
    if (previewSchedule.length === 0) {
      toast.error('No schedule to apply');
      return;
    }
    try {
      await bulkUpdate.mutateAsync({
        updates: previewSchedule.map(s => ({
          matchId: s.matchId,
          scheduledTime: s.scheduledTime,
        })),
        tournamentId,
      });
      toast.success(`Scheduled ${previewSchedule.length} matches`);
      onClose();
    } catch (error: any) {
      toast.error('Failed to apply schedule', { description: error.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Auto-Schedule Matches
          </DialogTitle>
          <DialogDescription>
            Automatically assign timings to all unscheduled matches.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Start date */}
          <div>
            <Label className="text-sm">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal mt-1', !startDate && 'text-muted-foreground')}>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Start time */}
          <div>
            <Label className="text-sm">Start Time</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Matches per day */}
          <div>
            <Label className="text-sm">Matches Per Day</Label>
            <Input
              type="number"
              min="1"
              max="20"
              value={matchesPerDay}
              onChange={(e) => setMatchesPerDay(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Gap between matches */}
          <div>
            <Label className="text-sm">Gap Between Matches (minutes)</Label>
            <Input
              type="number"
              min="15"
              max="480"
              value={gapMinutes}
              onChange={(e) => setGapMinutes(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Preview */}
          {previewSchedule.length > 0 && (
            <div>
              <Label className="text-sm mb-2 block">Preview ({previewSchedule.length} matches)</Label>
              <div className="max-h-48 overflow-y-auto space-y-1 bg-muted/30 rounded-lg p-3">
                {previewSchedule.map((item) => (
                  <div key={item.matchId} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">
                      R{item.match.round} #{item.match.match_number}: {(item.match.squad_a as TournamentSquad | null)?.name || 'TBD'} vs {(item.match.squad_b as TournamentSquad | null)?.name || 'TBD'}
                    </span>
                    <span className="text-muted-foreground shrink-0 ml-2">
                      {format(new Date(item.scheduledTime), 'MMM d, h:mm a')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleApply}
            disabled={bulkUpdate.isPending || previewSchedule.length === 0}
            className="btn-gaming"
          >
            {bulkUpdate.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Apply Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Conflict detection: find matches where the same squad plays at overlapping times
function detectConflicts(matches: TournamentMatch[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const scheduledMatches = matches.filter(m => m.scheduled_time && m.status !== 'completed');

  // Assume each match takes ~60 min
  const MATCH_DURATION_MS = 60 * 60 * 1000;

  for (let i = 0; i < scheduledMatches.length; i++) {
    for (let j = i + 1; j < scheduledMatches.length; j++) {
      const a = scheduledMatches[i];
      const b = scheduledMatches[j];

      const aTime = new Date(a.scheduled_time!).getTime();
      const bTime = new Date(b.scheduled_time!).getTime();

      // Check overlap
      const overlap = Math.abs(aTime - bTime) < MATCH_DURATION_MS;
      if (!overlap) continue;

      // Check if any squad is shared
      const aSquads = [a.squad_a_id, a.squad_b_id].filter(Boolean);
      const bSquads = [b.squad_a_id, b.squad_b_id].filter(Boolean);

      for (const squadId of aSquads) {
        if (bSquads.includes(squadId)) {
          const squad = 
            (a.squad_a_id === squadId ? a.squad_a : a.squad_b) as TournamentSquad | null;
          conflicts.push({
            matchA: a,
            matchB: b,
            squadName: squad?.name || 'Unknown Team',
          });
        }
      }
    }
  }
  return conflicts;
}
