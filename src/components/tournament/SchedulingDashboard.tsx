import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { GlowCard } from '@/components/tron/GlowCard';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Link as LinkIcon,
  Phone,
  Copy,
  CheckCircle2,
  Clock,
  Send,
  Swords,
  CalendarCheck,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useSchedulingTokens,
  useSchedulingSubmissions,
  useGenerateSchedulingTokens,
  useSquadAvailability,
  type SchedulingToken,
  type SchedulingSubmission,
} from '@/hooks/useScheduling';
import { useUpdateMatchSchedule } from '@/hooks/useMatchScheduler';
import { useSquadMembers } from '@/hooks/useSquadMembers';
import { getContactValue } from '@/lib/contacts';
import {
  buildSchedulingWhatsAppUrl,
  buildConfirmationWhatsAppUrl,
  getSchedulingLink,
} from '@/lib/whatsapp-scheduling';
import type {
  TournamentRegistration,
  TournamentSquad,
  TournamentMatch,
} from '@/lib/tournament-types';

interface SchedulingDashboardProps {
  tournamentId: string;
  tournamentName: string;
  matches: TournamentMatch[];
  registrations: (TournamentRegistration & { tournament_squads: TournamentSquad })[];
}

// Convert ISO scheduled_time to "YYYY-MM-DD|HH:MM" in IST
function isoToSlotKey(isoTime: string): string {
  const d = new Date(isoTime);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}|${get('hour')}:${get('minute')}`;
}

function useLeaderInfo(existingSquadId: string | null) {
  const { data: members } = useSquadMembers(existingSquadId || undefined);

  return useMemo(() => {
    if (!members) return { ign: null, whatsapp: null };
    const leader = members.find((m) => m.role === 'leader') || members.find((m) => m.role === 'co_leader');
    if (!leader) return { ign: null, whatsapp: null };

    const ign = leader.profile?.ign || leader.ign || 'Unknown';
    const whatsapp = !leader.profile_id
      ? leader.whatsapp || null
      : getContactValue(leader.profile?.contacts, 'whatsapp') || null;

    return { ign, whatsapp };
  }, [members]);
}

// Single team cell within a match row
function TeamCell({
  squadName,
  existingSquadId,
  token,
  submission,
  tournamentName,
}: {
  squadName: string;
  existingSquadId: string | null;
  token: SchedulingToken | undefined;
  submission: SchedulingSubmission | undefined;
  tournamentName: string;
}) {
  const { ign, whatsapp } = useLeaderInfo(existingSquadId);
  const schedulingLink = token ? getSchedulingLink(token.token) : null;

  const handleCopyLink = () => {
    if (schedulingLink) {
      navigator.clipboard.writeText(schedulingLink);
      toast.success(`Link copied for ${squadName}`);
    }
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">{squadName}</p>
        {ign && <p className="text-xs text-muted-foreground truncate">{ign}</p>}
      </div>

      {/* Status badge */}
      <div className="shrink-0">
        {submission ? (
          <Badge variant="outline" className="border-green-500/40 text-green-500 text-xs gap-1 px-1.5">
            <CheckCircle2 className="w-3 h-3" />
          </Badge>
        ) : token ? (
          <Badge variant="outline" className="border-yellow-500/40 text-yellow-500 text-xs gap-1 px-1.5">
            <Clock className="w-3 h-3" />
          </Badge>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex items-center shrink-0">
        {schedulingLink && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyLink} title="Copy link">
            <Copy className="w-3.5 h-3.5" />
          </Button>
        )}
        {whatsapp && schedulingLink && (
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <a
              href={buildSchedulingWhatsAppUrl(whatsapp, squadName, tournamentName, schedulingLink)}
              target="_blank"
              rel="noopener noreferrer"
              title={`Message ${ign} on WhatsApp`}
            >
              <Phone className="w-3.5 h-3.5 text-green-500" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

interface OverlapSlot {
  key: string; // "YYYY-MM-DD|HH:MM"
  date: string;
  time: string;
  label: string; // formatted for display
  isBooked: boolean;
}

function computeOverlapSlots(
  matchId: string,
  squadAId: string | null,
  squadBId: string | null,
  availabilityData: { tournament_squad_id: string; match_id: string; available_date: string; slot_time: string }[],
  bookedSlotSet: Set<string>,
): { teamACount: number; teamBCount: number; overlaps: OverlapSlot[] } {
  if (!squadAId || !squadBId) return { teamACount: 0, teamBCount: 0, overlaps: [] };

  const teamAKeys = new Set<string>();
  const teamBKeys = new Set<string>();

  for (const row of availabilityData) {
    if (row.match_id !== matchId) continue;
    const key = `${row.available_date}|${row.slot_time.slice(0, 5)}`;
    if (row.tournament_squad_id === squadAId) teamAKeys.add(key);
    if (row.tournament_squad_id === squadBId) teamBKeys.add(key);
  }

  const overlaps: OverlapSlot[] = [];
  for (const k of teamAKeys) {
    if (!teamBKeys.has(k)) continue;
    const [date, time] = k.split('|');
    const d = new Date(date + 'T00:00:00');
    const [h, m] = time.split(':').map(Number);
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const timeLabel = m === 0 ? `${hour12} ${ampm}` : `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
    const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

    overlaps.push({
      key: k,
      date,
      time,
      label: `${dayLabel} ${timeLabel}`,
      isBooked: bookedSlotSet.has(k),
    });
  }

  // Filter out past slots (IST timezone)
  const nowIST = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  );
  const futureOverlaps = overlaps.filter((slot) => {
    const [year, month, day] = slot.date.split('-').map(Number);
    const [hour, minute] = slot.time.split(':').map(Number);
    const slotDate = new Date(year, month - 1, day, hour, minute);
    return slotDate >= nowIST;
  });

  // Sort by date then time
  futureOverlaps.sort((a, b) => a.key.localeCompare(b.key));

  return { teamACount: teamAKeys.size, teamBCount: teamBKeys.size, overlaps: futureOverlaps };
}

// Match row combining both teams + match info + approve controls
function MatchRow({
  match,
  registrations,
  tokenMap,
  submissionMap,
  tournamentName,
  tournamentId,
  availabilityData,
  bookedSlotSet,
}: {
  match: TournamentMatch;
  registrations: (TournamentRegistration & { tournament_squads: TournamentSquad })[];
  tokenMap: Map<string, SchedulingToken>;
  submissionMap: Map<string, SchedulingSubmission>;
  tournamentName: string;
  tournamentId: string;
  availabilityData: { tournament_squad_id: string; match_id: string; available_date: string; slot_time: string }[];
  bookedSlotSet: Set<string>;
}) {
  const regA = registrations.find((r) => r.tournament_squad_id === match.squad_a_id);
  const regB = registrations.find((r) => r.tournament_squad_id === match.squad_b_id);

  const squadAName = regA?.tournament_squads?.name || 'TBD';
  const squadBName = regB?.tournament_squads?.name || 'TBD';

  const leaderA = useLeaderInfo(regA?.tournament_squads?.existing_squad_id ?? null);
  const leaderB = useLeaderInfo(regB?.tournament_squads?.existing_squad_id ?? null);

  const updateSchedule = useUpdateMatchSchedule();

  const { teamACount, teamBCount, overlaps } = useMemo(
    () => computeOverlapSlots(match.id, match.squad_a_id, match.squad_b_id, availabilityData, bookedSlotSet),
    [match.id, match.squad_a_id, match.squad_b_id, availabilityData, bookedSlotSet]
  );

  const isScheduled = !!match.scheduled_time;
  const time = isScheduled
    ? new Date(match.scheduled_time!).toLocaleString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : null;

  const bothSubmitted = submissionMap.has(match.squad_a_id!) && submissionMap.has(match.squad_b_id!);
  const availableOverlaps = overlaps.filter((s) => !s.isBooked);

  const handleConfirmSlot = async (slot: OverlapSlot) => {
    // Convert date + time to ISO with IST offset
    const isoTime = `${slot.date}T${slot.time}:00+05:30`;
    try {
      await updateSchedule.mutateAsync({ matchId: match.id, scheduledTime: isoTime, tournamentId });
      toast.success(`${squadAName} vs ${squadBName} confirmed for ${slot.label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm match');
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${isScheduled ? 'bg-green-500/5 border-green-500/20' : 'bg-muted/10 border-border'}`}>
      {/* Match header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground font-mono">
          R{match.round} M{match.match_number}
        </span>
        {isScheduled ? (
          <Badge variant="outline" className="border-green-500/40 text-green-500 text-xs gap-1 ml-auto">
            <CheckCircle2 className="w-3 h-3" />
            {time}
          </Badge>
        ) : bothSubmitted && availableOverlaps.length > 0 ? (
          <Badge variant="outline" className="border-primary/40 text-primary text-xs gap-1 ml-auto">
            <CalendarCheck className="w-3 h-3" />
            {availableOverlaps.length} slot{availableOverlaps.length !== 1 ? 's' : ''} available
          </Badge>
        ) : bothSubmitted ? (
          <Badge variant="outline" className="border-yellow-500/40 text-yellow-500 text-xs gap-1 ml-auto">
            <AlertTriangle className="w-3 h-3" />
            No overlap
          </Badge>
        ) : (
          <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground text-xs ml-auto">
            Waiting
          </Badge>
        )}
        {/* Notify buttons for scheduled matches */}
        {isScheduled && (
          <div className="flex items-center gap-0.5 shrink-0">
            {leaderA.whatsapp && (
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <a
                  href={buildConfirmationWhatsAppUrl(leaderA.whatsapp, squadAName, squadBName, match.scheduled_time!, tournamentName)}
                  target="_blank" rel="noopener noreferrer"
                  title={`Notify ${squadAName}`}
                >
                  <Send className="w-3.5 h-3.5 text-green-500" />
                </a>
              </Button>
            )}
            {leaderB.whatsapp && (
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <a
                  href={buildConfirmationWhatsAppUrl(leaderB.whatsapp, squadBName, squadAName, match.scheduled_time!, tournamentName)}
                  target="_blank" rel="noopener noreferrer"
                  title={`Notify ${squadBName}`}
                >
                  <Send className="w-3.5 h-3.5 text-green-500" />
                </a>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Availability stats (for unscheduled matches) */}
      {!isScheduled && (teamACount > 0 || teamBCount > 0) && (
        <div className="flex items-center gap-2 mb-2 text-[10px]">
          <span className="text-muted-foreground">{squadAName}: <span className="text-foreground font-medium">{teamACount}</span></span>
          <span className="text-muted-foreground">{squadBName}: <span className="text-foreground font-medium">{teamBCount}</span></span>
        </div>
      )}

      {/* Two teams */}
      <div className="space-y-1.5">
        {regA && (
          <TeamCell
            squadName={squadAName}
            existingSquadId={regA.tournament_squads?.existing_squad_id}
            token={tokenMap.get(match.squad_a_id!)}
            submission={submissionMap.get(match.squad_a_id!)}
            tournamentName={tournamentName}
          />
        )}
        <div className="flex items-center gap-2 px-1">
          <Swords className="w-3 h-3 text-muted-foreground" />
          <div className="flex-1 border-t border-dashed border-border/50" />
        </div>
        {regB && (
          <TeamCell
            squadName={squadBName}
            existingSquadId={regB.tournament_squads?.existing_squad_id}
            token={tokenMap.get(match.squad_b_id!)}
            submission={submissionMap.get(match.squad_b_id!)}
            tournamentName={tournamentName}
          />
        )}
      </div>

      {/* Overlapping slots with confirm buttons (for unscheduled matches with overlap) */}
      {!isScheduled && bothSubmitted && overlaps.length > 0 && (
        <div className="mt-3 pt-2 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground mb-2">Overlapping slots &mdash; pick one to confirm:</p>
          <div className="flex flex-wrap gap-1.5">
            {overlaps.map((slot) => (
              <Button
                key={slot.key}
                size="sm"
                variant={slot.isBooked ? 'ghost' : 'outline'}
                disabled={slot.isBooked || updateSchedule.isPending}
                onClick={() => handleConfirmSlot(slot)}
                className={`h-7 text-[11px] px-2 ${
                  slot.isBooked
                    ? 'border-red-500/30 text-red-500/50 line-through cursor-not-allowed'
                    : 'hover:bg-green-500/10 hover:border-green-500/40 hover:text-green-500'
                }`}
              >
                {updateSchedule.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : slot.isBooked ? (
                  <span className="text-red-500/50 mr-1">&times;</span>
                ) : (
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                )}
                {slot.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SchedulingDashboard({
  tournamentId,
  tournamentName,
  matches,
  registrations,
}: SchedulingDashboardProps) {
  const approvedRegs = useMemo(
    () => registrations.filter((r) => r.status === 'approved'),
    [registrations]
  );

  const { data: tokens } = useSchedulingTokens(tournamentId);
  const { data: submissions } = useSchedulingSubmissions(tournamentId);
  const { data: availabilityData } = useSquadAvailability(tournamentId);
  const generateTokens = useGenerateSchedulingTokens();

  const tokenMap = useMemo(() => {
    const map = new Map<string, SchedulingToken>();
    tokens?.forEach((t) => map.set(t.tournament_squad_id, t));
    return map;
  }, [tokens]);

  const submissionMap = useMemo(() => {
    const map = new Map<string, SchedulingSubmission>();
    submissions?.forEach((s) => map.set(s.tournament_squad_id, s));
    return map;
  }, [submissions]);

  // Booked slots: all scheduled match times in this tournament
  const bookedSlotSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) {
      if (m.scheduled_time) set.add(isoToSlotKey(m.scheduled_time));
    }
    return set;
  }, [matches]);

  const submittedCount = submissions?.length || 0;
  const totalSquads = approvedRegs.length;
  const hasTokens = (tokens?.length || 0) > 0;

  // Sort: unscheduled first, then by overlap readiness (both submitted first, sorted by earliest mutual submission)
  const activeMatches = useMemo(() => {
    const filtered = matches.filter((m) => m.squad_a_id && m.squad_b_id && m.status !== 'completed');

    return filtered.sort((a, b) => {
      // Scheduled matches go to the bottom
      if (a.scheduled_time && !b.scheduled_time) return 1;
      if (!a.scheduled_time && b.scheduled_time) return -1;
      // Both scheduled: by round/match
      if (a.scheduled_time && b.scheduled_time) return a.round - b.round || a.match_number - b.match_number;

      // Both unscheduled: prioritize by overlap readiness
      const aSubA = submissionMap.get(a.squad_a_id!);
      const aSubB = submissionMap.get(a.squad_b_id!);
      const bSubA = submissionMap.get(b.squad_a_id!);
      const bSubB = submissionMap.get(b.squad_b_id!);

      const aBothSubmitted = aSubA && aSubB;
      const bBothSubmitted = bSubA && bSubB;

      // Both-submitted matches first
      if (aBothSubmitted && !bBothSubmitted) return -1;
      if (!aBothSubmitted && bBothSubmitted) return 1;

      // Both have both submitted: sort by earliest overlap time (when the second team submitted)
      if (aBothSubmitted && bBothSubmitted) {
        const aOverlapTime = Math.max(
          new Date(aSubA.submitted_at).getTime(),
          new Date(aSubB.submitted_at).getTime()
        );
        const bOverlapTime = Math.max(
          new Date(bSubA.submitted_at).getTime(),
          new Date(bSubB.submitted_at).getTime()
        );
        return aOverlapTime - bOverlapTime;
      }

      // Neither has both: by round/match
      return a.round - b.round || a.match_number - b.match_number;
    });
  }, [matches, submissionMap]);

  // Progress stats
  const progressStats = useMemo(() => {
    const scheduledCount = activeMatches.filter((m) => m.scheduled_time).length;
    const unscheduledCount = activeMatches.length - scheduledCount;
    const unscheduledWithBothSubmitted = activeMatches.filter((m) => {
      if (m.scheduled_time) return false;
      return submissionMap.has(m.squad_a_id!) && submissionMap.has(m.squad_b_id!);
    }).length;
    const waitingForAvailability = unscheduledCount - unscheduledWithBothSubmitted;
    return { scheduledCount, unscheduledCount, unscheduledWithBothSubmitted, waitingForAvailability };
  }, [activeMatches, submissionMap]);

  const handleGenerateTokens = async () => {
    try {
      await generateTokens.mutateAsync({
        tournamentId,
        squadIds: approvedRegs.map((r) => r.tournament_squad_id),
      });
      toast.success(`Scheduling links generated for ${approvedRegs.length} squads`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate links');
    }
  };

  if (approvedRegs.length === 0) return null;

  return (
    <div className="space-y-6 mb-8">
      <div>
        <h2 className="text-lg font-display font-bold mb-1">WhatsApp Scheduling</h2>
        <p className="text-sm text-muted-foreground">
          Send scheduling links to team leaders via WhatsApp. They pick available slots, and you confirm each match.
        </p>
      </div>

      {/* Progress summary */}
      {hasTokens && activeMatches.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg bg-muted/20 border border-border p-3 text-center">
            <p className="text-2xl font-bold">{submittedCount}/{totalSquads}</p>
            <p className="text-[10px] text-muted-foreground">Squads submitted</p>
          </div>
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-center">
            <p className="text-2xl font-bold text-green-500">{progressStats.scheduledCount}</p>
            <p className="text-[10px] text-muted-foreground">Scheduled</p>
          </div>
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
            <p className="text-2xl font-bold text-primary">{progressStats.unscheduledWithBothSubmitted}</p>
            <p className="text-[10px] text-muted-foreground">Ready to approve</p>
          </div>
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-center">
            <p className="text-2xl font-bold text-yellow-500">{progressStats.waitingForAvailability}</p>
            <p className="text-[10px] text-muted-foreground">Waiting for teams</p>
          </div>
        </div>
      )}

      {/* Generate Links */}
      <GlowCard className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-sm">Scheduling Links</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasTokens
                ? `${submittedCount} of ${totalSquads} squads submitted availability`
                : 'Generate unique links for each squad leader'}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleGenerateTokens}
            disabled={generateTokens.isPending}
          >
            {generateTokens.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            <LinkIcon className="w-4 h-4 mr-2" />
            {hasTokens ? 'Regenerate' : 'Generate Links'}
          </Button>
        </div>
      </GlowCard>

      {/* Match list */}
      {hasTokens && activeMatches.length > 0 && (
        <GlowCard className="p-4">
          <h3 className="font-semibold text-sm mb-1">Matches</h3>
          <p className="text-xs text-muted-foreground mb-3">
            <CheckCircle2 className="w-3 h-3 inline text-green-500" /> = submitted
            &nbsp;&middot;&nbsp;
            <Clock className="w-3 h-3 inline text-yellow-500" /> = waiting
            &nbsp;&middot;&nbsp;
            <CalendarCheck className="w-3 h-3 inline text-primary" /> = ready to approve
            &nbsp;&middot;&nbsp;
            <span className="text-red-500">&times;</span> = slot booked
          </p>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {activeMatches.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                registrations={approvedRegs}
                tokenMap={tokenMap}
                submissionMap={submissionMap}
                tournamentName={tournamentName}
                tournamentId={tournamentId}
                availabilityData={availabilityData || []}
                bookedSlotSet={bookedSlotSet}
              />
            ))}
          </div>
        </GlowCard>
      )}
    </div>
  );
}
