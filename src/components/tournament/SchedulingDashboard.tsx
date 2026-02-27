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
  Swords,
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

// Match row combining both teams + match info
function MatchRow({
  match,
  registrations,
  tokenMap,
  submissionMap,
  tournamentName,
}: {
  match: TournamentMatch;
  registrations: (TournamentRegistration & { tournament_squads: TournamentSquad })[];
  tokenMap: Map<string, SchedulingToken>;
  submissionMap: Map<string, SchedulingSubmission>;
  tournamentName: string;
}) {
  const regA = registrations.find((r) => r.tournament_squad_id === match.squad_a_id);
  const regB = registrations.find((r) => r.tournament_squad_id === match.squad_b_id);

  const squadAName = regA?.tournament_squads.name || 'TBD';
  const squadBName = regB?.tournament_squads.name || 'TBD';

  const leaderA = useLeaderInfo(regA?.tournament_squads.existing_squad_id ?? null);
  const leaderB = useLeaderInfo(regB?.tournament_squads.existing_squad_id ?? null);

  const isScheduled = !!match.scheduled_time;
  const time = isScheduled
    ? new Date(match.scheduled_time!).toLocaleString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : null;

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
        ) : (
          <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground text-xs ml-auto">
            Unscheduled
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

      {/* Two teams */}
      <div className="space-y-1.5">
        {regA && (
          <TeamCell
            squadName={squadAName}
            existingSquadId={regA.tournament_squads.existing_squad_id}
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
            existingSquadId={regB.tournament_squads.existing_squad_id}
            token={tokenMap.get(match.squad_b_id!)}
            submission={submissionMap.get(match.squad_b_id!)}
            tournamentName={tournamentName}
          />
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

  const activeMatches = useMemo(
    () => matches
      .filter((m) => m.squad_a_id && m.squad_b_id && m.status !== 'completed')
      .sort((a, b) => {
        // Unscheduled first, then by round/match_number
        if (a.scheduled_time && !b.scheduled_time) return 1;
        if (!a.scheduled_time && b.scheduled_time) return -1;
        return a.round - b.round || a.match_number - b.match_number;
      }),
    [matches]
  );

  const pendingMatches = useMemo(
    () => matches.filter((m) => m.status === 'pending' && m.squad_a_id && m.squad_b_id),
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

      {/* Generate Links + Auto-Schedule controls */}
      <GlowCard className="p-4 space-y-4">
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

        {/* Auto-Schedule controls (show when links exist and some teams submitted) */}
        {hasTokens && submittedCount > 0 && (
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-3 mb-3">
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
              <Button
                size="sm"
                onClick={handleAutoSchedule}
                disabled={autoSchedule.isPending || pendingMatches.length === 0}
                className="ml-auto"
              >
                {autoSchedule.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Auto-Schedule
              </Button>
            </div>

            {scheduleResult && (
              <div className="space-y-1">
                {scheduleResult.scheduled.length > 0 && (
                  <p className="flex items-center gap-2 text-xs text-green-500">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {scheduleResult.scheduled.length} match(es) scheduled
                  </p>
                )}
                {scheduleResult.unschedulable.length > 0 && (
                  <p className="flex items-center gap-2 text-xs text-yellow-500">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {scheduleResult.unschedulable.length} could not be auto-scheduled
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </GlowCard>

      {/* Match list -- the main section */}
      {hasTokens && activeMatches.length > 0 && (
        <GlowCard className="p-4">
          <h3 className="font-semibold text-sm mb-1">Matches</h3>
          <p className="text-xs text-muted-foreground mb-3">
            <CheckCircle2 className="w-3 h-3 inline text-green-500" /> = availability submitted
            &nbsp;&middot;&nbsp;
            <Clock className="w-3 h-3 inline text-yellow-500" /> = link sent, waiting
            &nbsp;&middot;&nbsp;
            <Send className="w-3 h-3 inline text-green-500" /> = notify confirmed time
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
              />
            ))}
          </div>
        </GlowCard>
      )}
    </div>
  );
}
