import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { GlowCard } from '@/components/tron/GlowCard';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Link as LinkIcon,
  Phone,
  Copy,
  CheckCircle2,
  Clock,
  Zap,
  Send,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useSchedulingTokens,
  useSchedulingSubmissions,
  useGenerateSchedulingTokens,
  useSquadAvailability,
  useAutoScheduleMatches,
  type SchedulingToken,
  type SchedulingSubmission,
} from '@/hooks/useScheduling';
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
import type { ScheduleResult } from '@/lib/scheduling-algorithm';

interface SchedulingDashboardProps {
  tournamentId: string;
  tournamentName: string;
  matches: TournamentMatch[];
  registrations: (TournamentRegistration & { tournament_squads: TournamentSquad })[];
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

// Individual squad row using its own hook call
function SquadRow({
  reg,
  token,
  submission,
  tournamentName,
}: {
  reg: TournamentRegistration & { tournament_squads: TournamentSquad };
  token: SchedulingToken | undefined;
  submission: SchedulingSubmission | undefined;
  tournamentName: string;
}) {
  const { ign, whatsapp } = useLeaderInfo(reg.tournament_squads.existing_squad_id);
  const schedulingLink = token ? getSchedulingLink(token.token) : null;

  const handleCopyLink = () => {
    if (schedulingLink) {
      navigator.clipboard.writeText(schedulingLink);
      toast.success('Scheduling link copied!');
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 border border-border">
      {/* Squad info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">
          {reg.tournament_squads.name}
        </p>
        {ign && (
          <p className="text-xs text-muted-foreground truncate">
            Leader: {ign}
          </p>
        )}
      </div>

      {/* Status */}
      <div className="shrink-0">
        {submission ? (
          <Badge variant="outline" className="border-green-500/40 text-green-500 text-xs gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Submitted
          </Badge>
        ) : token ? (
          <Badge variant="outline" className="border-yellow-500/40 text-yellow-500 text-xs gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        ) : (
          <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground text-xs">
            No link
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {schedulingLink && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyLink} title="Copy scheduling link">
            <Copy className="w-4 h-4" />
          </Button>
        )}
        {whatsapp && schedulingLink && (
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a
              href={buildSchedulingWhatsAppUrl(
                whatsapp,
                reg.tournament_squads.name,
                tournamentName,
                schedulingLink
              )}
              target="_blank"
              rel="noopener noreferrer"
              title={`Message ${ign} on WhatsApp`}
            >
              <Phone className="w-4 h-4 text-green-500" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

// Notification row for a scheduled match
function MatchNotifyRow({
  match,
  registrations,
  tournamentName,
}: {
  match: TournamentMatch;
  registrations: (TournamentRegistration & { tournament_squads: TournamentSquad })[];
  tournamentName: string;
}) {
  const regA = registrations.find(
    (r) => r.tournament_squad_id === match.squad_a_id
  );
  const regB = registrations.find(
    (r) => r.tournament_squad_id === match.squad_b_id
  );

  const leaderA = useLeaderInfo(regA?.tournament_squads.existing_squad_id ?? null);
  const leaderB = useLeaderInfo(regB?.tournament_squads.existing_squad_id ?? null);

  const squadAName = (match as TournamentMatch & { squad_a?: TournamentSquad }).squad_a?.name
    || regA?.tournament_squads.name || 'Team A';
  const squadBName = (match as TournamentMatch & { squad_b?: TournamentSquad }).squad_b?.name
    || regB?.tournament_squads.name || 'Team B';

  const time = new Date(match.scheduled_time!).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 border border-border">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {squadAName} vs {squadBName}
        </p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {leaderA.whatsapp && (
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a
              href={buildConfirmationWhatsAppUrl(
                leaderA.whatsapp,
                squadAName,
                squadBName,
                match.scheduled_time!,
                tournamentName
              )}
              target="_blank"
              rel="noopener noreferrer"
              title={`Notify ${squadAName} leader`}
            >
              <Send className="w-4 h-4 text-green-500" />
            </a>
          </Button>
        )}
        {leaderB.whatsapp && (
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a
              href={buildConfirmationWhatsAppUrl(
                leaderB.whatsapp,
                squadBName,
                squadAName,
                match.scheduled_time!,
                tournamentName
              )}
              target="_blank"
              rel="noopener noreferrer"
              title={`Notify ${squadBName} leader`}
            >
              <Send className="w-4 h-4 text-green-500" />
            </a>
          </Button>
        )}
      </div>
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
  const autoSchedule = useAutoScheduleMatches();

  const [gapMinutes, setGapMinutes] = useState('60');
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null);

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

  const submittedCount = submissions?.length || 0;
  const totalSquads = approvedRegs.length;
  const hasTokens = (tokens?.length || 0) > 0;

  const pendingMatches = useMemo(
    () => matches.filter((m) => m.status === 'pending' && m.squad_a_id && m.squad_b_id),
    [matches]
  );

  const scheduledMatches = useMemo(
    () => matches.filter((m) => m.scheduled_time && m.status !== 'completed'),
    [matches]
  );

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

  const handleAutoSchedule = async () => {
    if (!availabilityData) return;
    try {
      const result = await autoSchedule.mutateAsync({
        tournamentId,
        matches: pendingMatches,
        availabilityData,
        gapMinutes: parseInt(gapMinutes, 10),
      });
      setScheduleResult(result);
      if (result.scheduled.length > 0) {
        toast.success(`${result.scheduled.length} match(es) scheduled`);
      }
      if (result.unschedulable.length > 0) {
        toast.warning(`${result.unschedulable.length} match(es) could not be scheduled`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Auto-schedule failed');
    }
  };

  if (approvedRegs.length === 0) return null;

  return (
    <div className="space-y-6 mb-8">
      <div>
        <h2 className="text-lg font-display font-bold mb-1">WhatsApp Scheduling</h2>
        <p className="text-sm text-muted-foreground">
          Send scheduling links to team leaders via WhatsApp. They pick available slots, and matches get auto-scheduled.
        </p>
      </div>

      {/* Section A: Generate Links */}
      <GlowCard className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-sm">Scheduling Links</h3>
            {hasTokens ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                Links generated for {tokens?.length} squads
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                Generate unique links for each squad leader
              </p>
            )}
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

      {/* Section B: Squad List */}
      {hasTokens && (
        <GlowCard className="p-4">
          <h3 className="font-semibold text-sm mb-1">Squad Leaders</h3>
          <p className="text-xs text-muted-foreground mb-3">
            {submittedCount} of {totalSquads} submitted &mdash; click the green phone icon to message on WhatsApp
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {approvedRegs.map((reg) => (
              <SquadRow
                key={reg.id}
                reg={reg}
                token={tokenMap.get(reg.tournament_squad_id)}
                submission={submissionMap.get(reg.tournament_squad_id)}
                tournamentName={tournamentName}
              />
            ))}
          </div>
        </GlowCard>
      )}

      {/* Section C: Auto-Schedule */}
      {hasTokens && submittedCount > 0 && (
        <GlowCard className="p-4">
          <h3 className="font-semibold text-sm mb-1">Auto-Schedule Matches</h3>
          <p className="text-xs text-muted-foreground mb-3">
            {pendingMatches.length} unscheduled match(es) &mdash; finds overlapping availability and assigns slots
          </p>

          <div className="flex items-center gap-3 mb-4">
            <label className="text-xs text-muted-foreground shrink-0">Gap between matches:</label>
            <Select value={gapMinutes} onValueChange={setGapMinutes}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="60">60 min</SelectItem>
                <SelectItem value="90">90 min</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleAutoSchedule}
            disabled={autoSchedule.isPending || pendingMatches.length === 0}
            className="w-full"
          >
            {autoSchedule.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Auto-Schedule Matches
          </Button>

          {/* Result summary */}
          {scheduleResult && (
            <div className="mt-3 space-y-2">
              {scheduleResult.scheduled.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-500">
                  <CheckCircle2 className="w-4 h-4" />
                  {scheduleResult.scheduled.length} match(es) scheduled
                </div>
              )}
              {scheduleResult.unschedulable.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-yellow-500">
                    <AlertCircle className="w-4 h-4" />
                    {scheduleResult.unschedulable.length} match(es) could not be auto-scheduled:
                  </div>
                  {scheduleResult.unschedulable.map((u) => (
                    <p key={u.matchId} className="text-xs text-muted-foreground ml-6">
                      &bull; {u.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </GlowCard>
      )}

      {/* Section D: Notify teams of scheduled matches */}
      {scheduledMatches.length > 0 && (
        <GlowCard className="p-4">
          <h3 className="font-semibold text-sm mb-1">Notify Teams</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Send confirmed match times to team leaders via WhatsApp
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {scheduledMatches.map((match) => (
              <MatchNotifyRow
                key={match.id}
                match={match}
                registrations={approvedRegs}
                tournamentName={tournamentName}
              />
            ))}
          </div>
        </GlowCard>
      )}
    </div>
  );
}
