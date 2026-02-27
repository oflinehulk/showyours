import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { CircuitBackground } from '@/components/tron/CircuitBackground';
import { GlowCard } from '@/components/tron/GlowCard';
import { Button } from '@/components/ui/button';
import { Loader2, Check, ChevronLeft, ChevronRight, Swords } from 'lucide-react';
import { useSchedulingContext, useSubmitAvailability } from '@/hooks/useScheduling';
import { toast } from 'sonner';

const TIME_SLOTS = ['21:00', '21:30', '22:00', '22:30', '23:00', '23:30'];
const SLOT_LABELS = ['9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'];

function getNextDays(count: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function formatDate(dateStr: string): { day: string; date: string; month: string } {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
    date: d.getDate().toString(),
    month: d.toLocaleDateString('en-IN', { month: 'short' }),
  };
}

function slotKey(date: string, time: string): string {
  return `${date}|${time}`;
}

export default function ScheduleAvailabilityPage() {
  const { token } = useParams<{ token: string }>();
  const { data: context, isLoading, error } = useSchedulingContext(token);
  const submitMutation = useSubmitAvailability();

  const days = useMemo(() => getNextDays(14), []);
  const [visibleStart, setVisibleStart] = useState(0);
  const visibleDays = days.slice(visibleStart, visibleStart + 5);

  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill from existing data
  if (context && !initialized) {
    if (context.existing_slots.length > 0) {
      const existing = new Set(context.existing_slots.map((s) => slotKey(s.date, s.time)));
      setSelectedSlots(existing);
    }
    setInitialized(true);
  }

  const toggleSlot = (date: string, time: string) => {
    const key = slotKey(date, time);
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleDay = (date: string) => {
    const dayKeys = TIME_SLOTS.map((t) => slotKey(date, t));
    const allSelected = dayKeys.every((k) => selectedSlots.has(k));
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      dayKeys.forEach((k) => {
        if (allSelected) next.delete(k);
        else next.add(k);
      });
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!token) return;
    const slots = [...selectedSlots].map((key) => {
      const [date, time] = key.split('|');
      return { date, time };
    });

    if (slots.length === 0) {
      toast.error('Please select at least one available time slot');
      return;
    }

    try {
      await submitMutation.mutateAsync({ token, slots });
      setSubmitted(true);
      toast.success('Availability submitted!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <CircuitBackground intensity="light" />
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error || !context) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <CircuitBackground intensity="light" />
        <GlowCard className="max-w-md w-full p-8 text-center">
          <h1 className="text-xl font-display font-bold text-destructive mb-2">Invalid Link</h1>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'This scheduling link is invalid or has expired.'}
          </p>
        </GlowCard>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <CircuitBackground intensity="light" />
        <GlowCard className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-display font-bold mb-2">Availability Submitted!</h1>
          <p className="text-muted-foreground mb-1">
            Thank you, <span className="text-foreground font-medium">{context.squad_name}</span>.
          </p>
          <p className="text-muted-foreground text-sm">
            Your schedule will be confirmed soon. You can close this page.
          </p>
          <Button
            className="mt-6"
            variant="outline"
            onClick={() => setSubmitted(false)}
          >
            Update Availability
          </Button>
        </GlowCard>
      </div>
    );
  }

  // Main form
  const pendingMatches = context.matches.filter((m) => m.status === 'pending');

  return (
    <div className="min-h-screen bg-background">
      <CircuitBackground intensity="light" />

      <div className="relative z-10 max-w-lg mx-auto px-4 py-6 pb-28">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
            {context.tournament_name}
          </p>
          <h1 className="text-2xl font-display font-bold">{context.squad_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select all time slots your team can play
          </p>
          {context.submitted_at && (
            <p className="text-xs text-primary mt-2">
              Previously submitted &mdash; update and resubmit if needed
            </p>
          )}
        </div>

        {/* Upcoming matches */}
        {pendingMatches.length > 0 && (
          <GlowCard className="p-4 mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Your Matches ({pendingMatches.length})
            </h2>
            <div className="space-y-2">
              {pendingMatches.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 text-sm p-2 rounded bg-muted/20"
                >
                  <Swords className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-foreground font-medium">
                    vs {m.opponent_name || 'TBD'}
                  </span>
                  {m.scheduled_time && (
                    <span className="text-xs text-green-500 ml-auto">Scheduled</span>
                  )}
                </div>
              ))}
            </div>
          </GlowCard>
        )}

        {/* Day navigation */}
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={visibleStart === 0}
            onClick={() => setVisibleStart((v) => Math.max(0, v - 3))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex gap-2 flex-1 overflow-hidden">
            {visibleDays.map((day) => {
              const f = formatDate(day);
              const daySlots = TIME_SLOTS.map((t) => slotKey(day, t));
              const selectedCount = daySlots.filter((k) => selectedSlots.has(k)).length;
              return (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`flex-1 min-w-0 rounded-lg p-2 text-center transition-all border ${
                    selectedCount === TIME_SLOTS.length
                      ? 'border-primary/60 bg-primary/10'
                      : selectedCount > 0
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border bg-muted/20'
                  }`}
                >
                  <div className="text-xs text-muted-foreground">{f.day}</div>
                  <div className="text-lg font-bold">{f.date}</div>
                  <div className="text-xs text-muted-foreground">{f.month}</div>
                </button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={visibleStart + 5 >= days.length}
            onClick={() => setVisibleStart((v) => Math.min(days.length - 5, v + 3))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Time slot grid */}
        <div className="space-y-2">
          {TIME_SLOTS.map((time, i) => (
            <div key={time} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-16 shrink-0 text-right">
                {SLOT_LABELS[i]}
              </span>
              <div className="flex gap-2 flex-1">
                {visibleDays.map((day) => {
                  const key = slotKey(day, time);
                  const isSelected = selectedSlots.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleSlot(day, time)}
                      className={`flex-1 h-11 rounded-lg transition-all border font-medium text-sm ${
                        isSelected
                          ? 'border-primary bg-primary/20 text-primary shadow-[0_0_8px_rgba(255,69,0,0.3)]'
                          : 'border-border bg-muted/10 text-muted-foreground hover:border-muted-foreground/40'
                      }`}
                    >
                      {isSelected ? <Check className="w-4 h-4 mx-auto" /> : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Selected count */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          {selectedSlots.size} slot{selectedSlots.size !== 1 ? 's' : ''} selected
        </p>
      </div>

      {/* Sticky submit bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/80 backdrop-blur-md border-t border-border p-4">
        <div className="max-w-lg mx-auto">
          <Button
            className="w-full h-12 text-base font-semibold"
            disabled={selectedSlots.size === 0 || submitMutation.isPending}
            onClick={handleSubmit}
          >
            {submitMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : null}
            {context.submitted_at ? 'Update Availability' : 'Submit Availability'}
          </Button>
        </div>
      </div>
    </div>
  );
}
