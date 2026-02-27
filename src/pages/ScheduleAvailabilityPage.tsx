import { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { CircuitBackground } from '@/components/tron/CircuitBackground';
import { GlowCard } from '@/components/tron/GlowCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, ChevronLeft, ChevronRight, Swords, CalendarCheck, Clock, Info } from 'lucide-react';
import { useSchedulingContext, useSubmitAvailability, type MatchSchedulingInfo } from '@/hooks/useScheduling';
import { toast } from 'sonner';

const TIME_SLOTS = ['21:00', '21:30', '22:00', '22:30', '23:00', '23:30'];
const SLOT_LABELS = ['9 PM', '9:30', '10 PM', '10:30', '11 PM', '11:30'];

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

function formatScheduledTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function slotKey(date: string, time: string): string {
  return `${date}|${time}`;
}

// Per-match slot grid
function MatchSlotPicker({
  match,
  days,
  selectedSlots,
  onToggleSlot,
}: {
  match: MatchSchedulingInfo;
  days: string[];
  selectedSlots: Set<string>;
  onToggleSlot: (matchId: string, date: string, time: string) => void;
}) {
  const [visibleStart, setVisibleStart] = useState(0);
  const visibleDays = days.slice(visibleStart, visibleStart + 5);

  const opponentSlotSet = useMemo(
    () => new Set(match.opponent_slots.map((s) => slotKey(s.date, s.time))),
    [match.opponent_slots]
  );

  const hasOpponentPicked = match.opponent_slots.length > 0;

  return (
    <div>
      {/* Day navigation */}
      <div className="flex items-center gap-1 mb-3">
        <Button
          variant="ghost" size="icon" className="h-7 w-7 shrink-0"
          disabled={visibleStart === 0}
          onClick={() => setVisibleStart((v) => Math.max(0, v - 3))}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        <div className="flex gap-1.5 flex-1 overflow-hidden">
          {visibleDays.map((day) => {
            const f = formatDate(day);
            return (
              <div key={day} className="flex-1 min-w-0 text-center">
                <div className="text-[10px] text-muted-foreground">{f.day}</div>
                <div className="text-sm font-bold">{f.date}</div>
                <div className="text-[10px] text-muted-foreground">{f.month}</div>
              </div>
            );
          })}
        </div>

        <Button
          variant="ghost" size="icon" className="h-7 w-7 shrink-0"
          disabled={visibleStart + 5 >= days.length}
          onClick={() => setVisibleStart((v) => Math.min(days.length - 5, v + 3))}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Legend */}
      {hasOpponentPicked && (
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2 px-1">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-primary/30 border border-primary/50" />
            Your pick
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-blue-500/30 border border-blue-500/50" />
            Opponent
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-green-500/30 border border-green-500/50" />
            Both
          </span>
        </div>
      )}

      {/* Slot grid */}
      <div className="space-y-1.5">
        {TIME_SLOTS.map((time, i) => (
          <div key={time} className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground w-10 shrink-0 text-right">
              {SLOT_LABELS[i]}
            </span>
            <div className="flex gap-1.5 flex-1">
              {visibleDays.map((day) => {
                const key = slotKey(day, time);
                const isMine = selectedSlots.has(key);
                const isOpponent = opponentSlotSet.has(key);
                const isBoth = isMine && isOpponent;

                let cellClass = 'border-border bg-muted/10 text-muted-foreground hover:border-muted-foreground/40';
                if (isBoth) {
                  cellClass = 'border-green-500 bg-green-500/20 text-green-500 shadow-[0_0_6px_rgba(34,197,94,0.3)]';
                } else if (isMine) {
                  cellClass = 'border-primary bg-primary/20 text-primary shadow-[0_0_6px_rgba(255,69,0,0.3)]';
                } else if (isOpponent) {
                  cellClass = 'border-blue-500/50 bg-blue-500/10 text-blue-400';
                }

                return (
                  <button
                    key={key}
                    onClick={() => onToggleSlot(match.id, day, time)}
                    className={`flex-1 h-9 rounded transition-all border text-xs font-medium ${cellClass}`}
                  >
                    {isMine ? <Check className="w-3.5 h-3.5 mx-auto" /> : ''}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const LANGS = ['EN', 'TA', 'HI', 'TE'] as const;
type Lang = (typeof LANGS)[number];

const NOTICE_CONTENT: Record<Lang, { title: string; items: string[]; expiry: string }> = {
  EN: {
    title: 'How this works',
    items: [
      'Select multiple times and dates for each match \u2014 the more you pick, the easier it is to find a slot that works for both teams.',
      'If your opponent has already picked their times, their slots show in blue. Picking overlapping slots (green) speeds up scheduling.',
      'You can come back and update your availability anytime using this same link.',
      'Check back regularly to see if your opponent has updated their slots \u2014 refresh this page to see the latest.',
      'Once both teams have overlapping slots, the host will confirm the match time and notify you.',
    ],
    expiry: 'This link expires in 30 days. Contact your tournament host if you need a new one.',
  },
  TA: {
    title: '\u0b87\u0ba4\u0bc1 \u0b8e\u0baa\u0bcd\u0baa\u0b9f\u0bbf \u0b9a\u0bc6\u0baf\u0bb2\u0bcd\u0baa\u0b9f\u0bc1\u0b95\u0bbf\u0bb1\u0ba4\u0bc1',
    items: [
      '\u0b92\u0bb5\u0bcd\u0bb5\u0bca\u0bb0\u0bc1 \u0baa\u0bcb\u0b9f\u0bcd\u0b9f\u0bbf\u0b95\u0bcd\u0b95\u0bc1\u0bae\u0bcd \u0baa\u0bb2 \u0ba8\u0bc7\u0bb0\u0b99\u0bcd\u0b95\u0bb3\u0bc8\u0baf\u0bc1\u0bae\u0bcd \u0ba4\u0bc7\u0ba4\u0bbf\u0b95\u0bb3\u0bc8\u0baf\u0bc1\u0bae\u0bcd \u0ba4\u0bc7\u0bb0\u0bcd\u0ba8\u0bcd\u0ba4\u0bc6\u0b9f\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u2014 \u0ba8\u0bc0\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0b85\u0ba4\u0bbf\u0b95\u0bae\u0bbe\u0b95 \u0ba4\u0bc7\u0bb0\u0bcd\u0ba8\u0bcd\u0ba4\u0bc6\u0b9f\u0bc1\u0b95\u0bcd\u0b95\u0bc1\u0bae\u0bcd\u0baa\u0bcb\u0ba4\u0bc1, \u0b87\u0bb0\u0bc1 \u0b85\u0ba3\u0bbf\u0b95\u0bb3\u0bc1\u0b95\u0bcd\u0b95\u0bc1\u0bae\u0bcd \u0baa\u0bca\u0bb0\u0bc1\u0ba4\u0bcd\u0ba4\u0bae\u0bbe\u0ba9 \u0ba8\u0bc7\u0bb0\u0ba4\u0bcd\u0ba4\u0bc8 \u0b95\u0ba3\u0bcd\u0b9f\u0bc1\u0baa\u0bbf\u0b9f\u0bbf\u0baa\u0bcd\u0baa\u0ba4\u0bc1 \u0b8e\u0bb3\u0bbf\u0ba4\u0bbe\u0b95\u0bc1\u0bae\u0bcd.',
      '\u0b89\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0b8e\u0ba4\u0bbf\u0bb0\u0ba3\u0bbf \u0b87\u0baa\u0bcd\u0baa\u0bcb\u0ba4\u0bc7 \u0ba4\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0ba8\u0bc7\u0bb0\u0b99\u0bcd\u0b95\u0bb3\u0bc8\u0ba4\u0bcd \u0ba4\u0bc7\u0bb0\u0bcd\u0ba8\u0bcd\u0ba4\u0bc6\u0b9f\u0bc1\u0ba4\u0bcd\u0ba4\u0bbf\u0bb0\u0bc1\u0ba8\u0bcd\u0ba4\u0bbe\u0bb2\u0bcd, \u0b85\u0bb5\u0bc8 \u0ba8\u0bc0\u0bb2 \u0ba8\u0bbf\u0bb1\u0ba4\u0bcd\u0ba4\u0bbf\u0bb2\u0bcd \u0b95\u0bbe\u0b9f\u0bcd\u0b9f\u0baa\u0bcd\u0baa\u0b9f\u0bc1\u0bae\u0bcd. \u0b92\u0bb0\u0bc7 \u0ba8\u0bc7\u0bb0\u0ba4\u0bcd\u0ba4\u0bc8 (\u0baa\u0b9a\u0bcd\u0b9a\u0bc8) \u0ba4\u0bc7\u0bb0\u0bcd\u0ba8\u0bcd\u0ba4\u0bc6\u0b9f\u0bc1\u0baa\u0bcd\u0baa\u0ba4\u0bc1 schedule-\u0b90 \u0bb5\u0bbf\u0bb0\u0bc8\u0bb5\u0bc1\u0baa\u0b9f\u0bc1\u0ba4\u0bcd\u0ba4\u0bc1\u0bae\u0bcd.',
      '\u0b87\u0ba4\u0bc7 link-\u0b90 \u0baa\u0baf\u0ba9\u0bcd\u0baa\u0b9f\u0bc1\u0ba4\u0bcd\u0ba4\u0bbf \u0b8e\u0baa\u0bcd\u0baa\u0bcb\u0ba4\u0bc1 \u0bb5\u0bc7\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bbe\u0ba9\u0bbe\u0bb2\u0bc1\u0bae\u0bcd \u0ba4\u0bbf\u0bb0\u0bc1\u0bae\u0bcd\u0baa \u0bb5\u0ba8\u0bcd\u0ba4\u0bc1 \u0b89\u0b99\u0bcd\u0b95\u0bb3\u0bcd availability-\u0b90 \u0bae\u0bbe\u0bb1\u0bcd\u0bb1\u0bb2\u0bbe\u0bae\u0bcd.',
      '\u0b89\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0b8e\u0ba4\u0bbf\u0bb0\u0ba3\u0bbf \u0ba4\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0ba8\u0bc7\u0bb0\u0b99\u0bcd\u0b95\u0bb3\u0bc8 \u0bae\u0bbe\u0bb1\u0bcd\u0bb1\u0bbf\u0baf\u0bbf\u0bb0\u0bc1\u0b95\u0bcd\u0b95\u0bbf\u0bb1\u0bbe\u0bb0\u0bcd\u0b95\u0bb3\u0bbe \u0b8e\u0ba9\u0bcd\u0bb1\u0bc1 \u0b85\u0b9f\u0bbf\u0b95\u0bcd\u0b95\u0b9f\u0bbf \u0b9a\u0bb0\u0bbf\u0baa\u0bbe\u0bb0\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u2014 \u0baa\u0bc1\u0ba4\u0bbf\u0baf \u0ba4\u0b95\u0bb5\u0bb2\u0bc1\u0b95\u0bcd\u0b95\u0bc1 page-\u0b90 refresh \u0b9a\u0bc6\u0baf\u0bcd\u0baf\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd.',
      '\u0b87\u0bb0\u0bc1 \u0b85\u0ba3\u0bbf\u0b95\u0bb3\u0bc1\u0b95\u0bcd\u0b95\u0bc1\u0bae\u0bcd \u0b92\u0bb0\u0bc7 \u0ba8\u0bc7\u0bb0\u0bae\u0bcd \u0b87\u0bb0\u0bc1\u0ba8\u0bcd\u0ba4\u0bbe\u0bb2\u0bcd, host \u0baa\u0bcb\u0b9f\u0bcd\u0b9f\u0bbf \u0ba8\u0bc7\u0bb0\u0ba4\u0bcd\u0ba4\u0bc8 \u0b89\u0bb1\u0bc1\u0ba4\u0bbf\u0b9a\u0bc6\u0baf\u0bcd\u0ba4\u0bc1 \u0b89\u0b99\u0bcd\u0b95\u0bb3\u0bc1\u0b95\u0bcd\u0b95\u0bc1 \u0ba4\u0bc6\u0bb0\u0bbf\u0bb5\u0bbf\u0baa\u0bcd\u0baa\u0bbe\u0bb0\u0bcd.',
    ],
    expiry: '\u0b87\u0ba8\u0bcd\u0ba4 link 30 \u0ba8\u0bbe\u0b9f\u0bcd\u0b95\u0bb3\u0bbf\u0bb2\u0bcd \u0b95\u0bbe\u0bb2\u0bbe\u0bb5\u0ba4\u0bbf\u0baf\u0bbe\u0b95\u0bc1\u0bae\u0bcd. \u0baa\u0bc1\u0ba4\u0bbf\u0baf link \u0ba4\u0bc7\u0bb5\u0bc8\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f\u0bbe\u0bb2\u0bcd tournament host-\u0b90 \u0ba4\u0bca\u0b9f\u0bb0\u0bcd\u0baa\u0bc1 \u0b95\u0bca\u0bb3\u0bcd\u0bb3\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd.',
  },
  HI: {
    title: '\u092f\u0939 \u0915\u0948\u0938\u0947 \u0915\u093e\u092e \u0915\u0930\u0924\u093e \u0939\u0948',
    items: [
      '\u0939\u0930 \u092e\u0948\u091a \u0915\u0947 \u0932\u093f\u090f \u0915\u0908 \u0938\u092e\u092f \u0914\u0930 \u0924\u093e\u0930\u0940\u0916\u0947\u0902 \u091a\u0941\u0928\u0947\u0902 \u2014 \u091c\u093f\u0924\u0928\u093e \u091c\u093c\u094d\u092f\u093e\u0926\u093e \u091a\u0941\u0928\u0947\u0902\u0917\u0947, \u0926\u094b\u0928\u094b\u0902 \u091f\u0940\u092e\u094b\u0902 \u0915\u0947 \u0932\u093f\u090f \u0938\u0939\u0940 \u0938\u092e\u092f \u092e\u093f\u0932\u0928\u093e \u0909\u0924\u0928\u093e \u0906\u0938\u093e\u0928 \u0939\u094b\u0917\u093e\u0964',
      '\u0905\u0917\u0930 \u0906\u092a\u0915\u0947 opponent \u0928\u0947 \u092a\u0939\u0932\u0947 \u0938\u0947 \u0905\u092a\u0928\u093e \u0938\u092e\u092f \u091a\u0941\u0928\u093e \u0939\u0948, \u0924\u094b \u0909\u0928\u0915\u0947 slots \u0928\u0940\u0932\u0947 \u0930\u0902\u0917 \u092e\u0947\u0902 \u0926\u093f\u0916\u0947\u0902\u0917\u0947\u0964 \u090f\u0915 \u091c\u0948\u0938\u0947 slots (\u0939\u0930\u093e) \u091a\u0941\u0928\u0928\u0947 \u0938\u0947 scheduling \u0924\u0947\u091c\u093c \u0939\u094b\u0924\u0940 \u0939\u0948\u0964',
      '\u0906\u092a \u0907\u0938\u0940 link \u0938\u0947 \u0915\u092d\u0940 \u092d\u0940 \u0935\u093e\u092a\u0938 \u0906\u0915\u0930 \u0905\u092a\u0928\u0940 availability \u092c\u0926\u0932 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964',
      '\u0928\u093f\u092f\u092e\u093f\u0924 \u0930\u0942\u092a \u0938\u0947 check \u0915\u0930\u0947\u0902 \u0915\u093f \u0906\u092a\u0915\u0947 opponent \u0928\u0947 \u0905\u092a\u0928\u0947 slots \u0905\u092a\u0921\u0947\u091f \u0915\u093f\u090f \u0939\u0948\u0902 \u092f\u093e \u0928\u0939\u0940\u0902 \u2014 latest \u0926\u0947\u0916\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f page refresh \u0915\u0930\u0947\u0902\u0964',
      '\u091c\u092c \u0926\u094b\u0928\u094b\u0902 \u091f\u0940\u092e\u094b\u0902 \u0915\u0947 slots match \u0915\u0930\u0947\u0902, \u0924\u094b host \u092e\u0948\u091a \u0915\u093e \u0938\u092e\u092f confirm \u0915\u0930\u0915\u0947 \u0906\u092a\u0915\u094b \u092c\u0924\u093e\u090f\u0917\u093e\u0964',
    ],
    expiry: '\u092f\u0939 link 30 \u0926\u093f\u0928\u094b\u0902 \u092e\u0947\u0902 expire \u0939\u094b \u091c\u093e\u090f\u0917\u093e\u0964 \u0928\u092f\u093e link \u091a\u093e\u0939\u093f\u090f \u0924\u094b tournament host \u0938\u0947 \u0938\u0902\u092a\u0930\u094d\u0915 \u0915\u0930\u0947\u0902\u0964',
  },
  TE: {
    title: '\u0c07\u0c26\u0c3f \u0c0e\u0c32\u0c3e \u0c2a\u0c28\u0c3f \u0c1a\u0c47\u0c38\u0c4d\u0c24\u0c41\u0c02\u0c26\u0c3f',
    items: [
      '\u0c2a\u0c4d\u0c30\u0c24\u0c3f \u0c2e\u0c4d\u0c2f\u0c3e\u0c1a\u0c4d\u200c\u0c15\u0c41 \u0c05\u0c28\u0c47\u0c15 \u0c38\u0c2e\u0c2f\u0c3e\u0c32\u0c41 \u0c2e\u0c30\u0c3f\u0c2f\u0c41 \u0c24\u0c47\u0c26\u0c40\u0c32\u0c28\u0c41 \u0c0e\u0c02\u0c1a\u0c41\u0c15\u0c4b\u0c02\u0c21\u0c3f \u2014 \u0c2e\u0c40\u0c30\u0c41 \u0c0e\u0c15\u0c4d\u0c15\u0c41\u0c35\u0c17\u0c3e \u0c0e\u0c02\u0c1a\u0c41\u0c15\u0c41\u0c02\u0c1f\u0c47, \u0c30\u0c46\u0c02\u0c21\u0c41 \u0c1c\u0c1f\u0c4d\u0c32\u0c15\u0c41 \u0c38\u0c30\u0c3f\u0c2a\u0c21\u0c47 \u0c38\u0c2e\u0c2f\u0c3e\u0c28\u0c4d\u0c28\u0c3f \u0c15\u0c28\u0c41\u0c17\u0c4a\u0c28\u0c21\u0c02 \u0c24\u0c47\u0c32\u0c3f\u0c15\u0c35\u0c41\u0c24\u0c41\u0c02\u0c26\u0c3f.',
      '\u0c2e\u0c40 \u0c2a\u0c4d\u0c30\u0c24\u0c4d\u0c2f\u0c30\u0c4d\u0c25\u0c3f \u0c07\u0c2a\u0c4d\u0c2a\u0c1f\u0c3f\u0c15\u0c47 \u0c24\u0c2e \u0c38\u0c2e\u0c2f\u0c3e\u0c32\u0c28\u0c41 \u0c0e\u0c02\u0c1a\u0c41\u0c15\u0c41\u0c02\u0c1f\u0c47, \u0c35\u0c3e\u0c30\u0c3f slots \u0c28\u0c40\u0c32\u0c02 \u0c30\u0c02\u0c17\u0c41\u0c32\u0c4b \u0c1a\u0c42\u0c2a\u0c2c\u0c21\u0c24\u0c3e\u0c2f\u0c3f. \u0c12\u0c15\u0c47 slots (\u0c06\u0c15\u0c41\u0c2a\u0c1a\u0c4d\u0c1a) \u0c0e\u0c02\u0c1a\u0c41\u0c15\u0c4b\u0c35\u0c21\u0c02 scheduling \u0c35\u0c47\u0c17\u0c35\u0c02\u0c24\u0c02 \u0c1a\u0c47\u0c38\u0c4d\u0c24\u0c41\u0c02\u0c26\u0c3f.',
      '\u0c07\u0c26\u0c47 link \u0c09\u0c2a\u0c2f\u0c4b\u0c17\u0c3f\u0c02\u0c1a\u0c3f \u0c2e\u0c40\u0c30\u0c41 \u0c0e\u0c2a\u0c4d\u0c2a\u0c41\u0c21\u0c48\u0c28\u0c3e \u0c24\u0c3f\u0c30\u0c3f\u0c17\u0c3f \u0c35\u0c1a\u0c4d\u0c1a\u0c3f \u0c2e\u0c40 availability \u0c2e\u0c3e\u0c30\u0c4d\u0c1a\u0c41\u0c15\u0c4b\u0c35\u0c1a\u0c4d\u0c1a\u0c41.',
      '\u0c2e\u0c40 \u0c2a\u0c4d\u0c30\u0c24\u0c4d\u0c2f\u0c30\u0c4d\u0c25\u0c3f \u0c24\u0c2e slots update \u0c1a\u0c47\u0c36\u0c3e\u0c30\u0c3e \u0c05\u0c28\u0c3f \u0c15\u0c4d\u0c30\u0c2e\u0c02 \u0c24\u0c2a\u0c4d\u0c2a\u0c15\u0c41\u0c02\u0c21\u0c3e \u0c1a\u0c46\u0c15\u0c4d \u0c1a\u0c47\u0c2f\u0c02\u0c21\u0c3f \u2014 \u0c24\u0c3e\u0c1c\u0c3e \u0c38\u0c2e\u0c3e\u0c1a\u0c3e\u0c30\u0c02 \u0c15\u0c4b\u0c38\u0c02 page refresh \u0c1a\u0c47\u0c2f\u0c02\u0c21\u0c3f.',
      '\u0c30\u0c46\u0c02\u0c21\u0c41 \u0c1c\u0c1f\u0c4d\u0c32 slots match \u0c05\u0c2f\u0c3f\u0c28\u0c2a\u0c4d\u0c2a\u0c41\u0c21\u0c41, host \u0c2e\u0c4d\u0c2f\u0c3e\u0c1a\u0c4d \u0c38\u0c2e\u0c2f\u0c3e\u0c28\u0c4d\u0c28\u0c3f confirm \u0c1a\u0c47\u0c38\u0c3f \u0c2e\u0c40\u0c15\u0c41 \u0c24\u0c46\u0c32\u0c3f\u0c2f\u0c1c\u0c47\u0c38\u0c4d\u0c24\u0c3e\u0c30\u0c41.',
    ],
    expiry: '\u0c08 link 30 \u0c30\u0c4b\u0c1c\u0c41\u0c32\u0c4d\u0c32\u0c4b expire \u0c05\u0c35\u0c41\u0c24\u0c41\u0c02\u0c26\u0c3f. \u0c15\u0c4a\u0c24\u0c4d\u0c24 link \u0c15\u0c3e\u0c35\u0c3e\u0c32\u0c02\u0c1f\u0c47 tournament host \u0c28\u0c41 \u0c38\u0c02\u0c2a\u0c4d\u0c30\u0c26\u0c3f\u0c02\u0c1a\u0c02\u0c21\u0c3f.',
  },
};

function HowItWorksNotice() {
  const [lang, setLang] = useState<Lang>('EN');
  const t = NOTICE_CONTENT[lang];

  return (
    <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3.5 mb-6">
      <div className="flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-2 text-xs text-muted-foreground flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-blue-400 text-sm">{t.title}</p>
            <div className="flex gap-1 shrink-0">
              {LANGS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    lang === l
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      : 'text-muted-foreground hover:text-foreground border border-transparent'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <ul className="space-y-1 list-disc list-inside marker:text-blue-500/40">
            {t.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
            <li className="text-muted-foreground/60">{t.expiry}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function ScheduleAvailabilityPage() {
  const { token } = useParams<{ token: string }>();
  const { data: context, isLoading, error } = useSchedulingContext(token);
  const submitMutation = useSubmitAvailability();

  const days = useMemo(() => getNextDays(14), []);

  // State: Map<matchId, Set<slotKey>>
  const [matchSelections, setMatchSelections] = useState<Map<string, Set<string>>>(new Map());
  const [initialized, setInitialized] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill from existing data
  if (context && !initialized) {
    const initial = new Map<string, Set<string>>();
    for (const match of context.matches) {
      if (match.my_slots.length > 0) {
        initial.set(match.id, new Set(match.my_slots.map((s) => slotKey(s.date, s.time))));
      }
    }
    setMatchSelections(initial);
    setInitialized(true);
  }

  const toggleSlot = useCallback((matchId: string, date: string, time: string) => {
    const key = slotKey(date, time);
    setMatchSelections((prev) => {
      const next = new Map(prev);
      const matchSet = new Set(next.get(matchId) || []);
      if (matchSet.has(key)) matchSet.delete(key);
      else matchSet.add(key);
      next.set(matchId, matchSet);
      return next;
    });
  }, []);

  const totalSelected = useMemo(() => {
    let count = 0;
    for (const slots of matchSelections.values()) count += slots.size;
    return count;
  }, [matchSelections]);

  const handleSubmit = async () => {
    if (!token) return;

    const matchSlots = [...matchSelections.entries()]
      .filter(([, slots]) => slots.size > 0)
      .map(([matchId, slots]) => ({
        match_id: matchId,
        slots: [...slots].map((key) => {
          const [date, time] = key.split('|');
          return { date, time };
        }),
      }));

    if (matchSlots.length === 0) {
      toast.error('Please select at least one time slot for a match');
      return;
    }

    try {
      await submitMutation.mutateAsync({ token, matchSlots });
      setSubmitted(true);
      toast.success('Availability submitted!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit');
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <CircuitBackground intensity="light" />
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error
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

  // Success
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
          <Button className="mt-6" variant="outline" onClick={() => setSubmitted(false)}>
            Update Availability
          </Button>
        </GlowCard>
      </div>
    );
  }

  // Separate scheduled and unscheduled matches
  const scheduledMatches = context.matches.filter((m) => m.scheduled_time);
  const unscheduledMatches = context.matches.filter((m) => !m.scheduled_time && m.status !== 'completed');

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
          {context.submitted_at && (
            <p className="text-xs text-primary mt-1">
              Previously submitted &mdash; update if needed
            </p>
          )}
        </div>

        {/* Summary */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 rounded-lg bg-muted/20 border border-border p-3 text-center">
            <p className="text-2xl font-bold">{unscheduledMatches.length}</p>
            <p className="text-xs text-muted-foreground">Need scheduling</p>
          </div>
          <div className="flex-1 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-center">
            <p className="text-2xl font-bold text-green-500">{scheduledMatches.length}</p>
            <p className="text-xs text-muted-foreground">Confirmed</p>
          </div>
        </div>

        {/* How it works notice */}
        <HowItWorksNotice />

        {/* Scheduled matches */}
        {scheduledMatches.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Confirmed Matches
            </h2>
            <div className="space-y-2">
              {scheduledMatches.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                  <CalendarCheck className="w-4 h-4 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">vs {m.opponent_name || 'TBD'}</p>
                    <p className="text-xs text-green-500">{formatScheduledTime(m.scheduled_time!)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unscheduled matches - per-match slot picker */}
        {unscheduledMatches.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Pick your available slots
            </h2>

            {unscheduledMatches.map((match) => {
              const myCount = matchSelections.get(match.id)?.size || 0;
              const opponentPicked = match.opponent_slots.length > 0;

              return (
                <GlowCard key={match.id} className="p-4">
                  {/* Match header */}
                  <div className="flex items-center gap-2 mb-3">
                    <Swords className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-medium flex-1">
                      vs {match.opponent_name || 'TBD'}
                    </span>
                    {opponentPicked && (
                      <Badge variant="outline" className="border-blue-500/40 text-blue-500 text-xs gap-1">
                        <Clock className="w-3 h-3" />
                        Opponent picked
                      </Badge>
                    )}
                    {myCount > 0 && (
                      <Badge variant="outline" className="border-primary/40 text-primary text-xs">
                        {myCount} selected
                      </Badge>
                    )}
                  </div>

                  {opponentPicked && (
                    <p className="text-xs text-blue-400 mb-3">
                      Blue slots = opponent&apos;s preferred times. Pick overlapping ones for faster scheduling.
                    </p>
                  )}

                  <MatchSlotPicker
                    match={match}
                    days={days}
                    selectedSlots={matchSelections.get(match.id) || new Set()}
                    onToggleSlot={toggleSlot}
                  />
                </GlowCard>
              );
            })}
          </div>
        )}

        {/* Nothing to schedule */}
        {unscheduledMatches.length === 0 && scheduledMatches.length > 0 && (
          <GlowCard className="p-6 text-center">
            <CalendarCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All your matches are scheduled!</p>
          </GlowCard>
        )}
      </div>

      {/* Sticky submit bar */}
      {unscheduledMatches.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/80 backdrop-blur-md border-t border-border p-4">
          <div className="max-w-lg mx-auto">
            <Button
              className="w-full h-12 text-base font-semibold"
              disabled={totalSelected === 0 || submitMutation.isPending}
              onClick={handleSubmit}
            >
              {submitMutation.isPending && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
              {context.submitted_at ? 'Update Availability' : 'Submit Availability'}
              {totalSelected > 0 && ` (${totalSelected} slots)`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
