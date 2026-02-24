import { useAuditLog } from '@/hooks/useAuditLog';
import { GlowCard } from '@/components/tron/GlowCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import {
  ScrollText,
  UserCheck,
  UserX,
  Swords,
  AlertTriangle,
  Play,
  CheckCircle,
  XCircle,
  Shuffle,
  Users,
} from 'lucide-react';

const ACTION_CONFIG: Record<string, { icon: typeof ScrollText; color: string; label: string }> = {
  registration_approved: { icon: UserCheck, color: 'text-green-500', label: 'Registration Approved' },
  registration_rejected: { icon: UserX, color: 'text-destructive', label: 'Registration Rejected' },
  registration_withdrawn: { icon: XCircle, color: 'text-destructive', label: 'Squad Withdrawn' },
  roster_change_approved: { icon: Users, color: 'text-green-500', label: 'Roster Change Approved' },
  roster_change_rejected: { icon: Users, color: 'text-destructive', label: 'Roster Change Rejected' },
  match_result_entered: { icon: Swords, color: 'text-primary', label: 'Match Result Entered' },
  dispute_raised: { icon: AlertTriangle, color: 'text-yellow-500', label: 'Dispute Raised' },
  status_changed: { icon: Play, color: 'text-sky-400', label: 'Status Changed' },
  bracket_generated: { icon: Shuffle, color: 'text-sky-400', label: 'Bracket Generated' },
};

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

function getActionDescription(action: string, details: Record<string, unknown>): string {
  switch (action) {
    case 'registration_approved':
    case 'registration_rejected':
      return details.squad_name
        ? `${details.squad_name} — ${details.old_status} → ${details.new_status}`
        : `${details.old_status} → ${details.new_status}`;
    case 'roster_change_approved':
    case 'roster_change_rejected':
      return `${details.player_out} → ${details.player_in}`;
    case 'match_result_entered':
      return `R${details.round} M${details.match_number}: ${details.squad_a_score}-${details.squad_b_score}`;
    case 'dispute_raised':
      return details.reason ? String(details.reason).slice(0, 80) : 'Dispute filed';
    case 'status_changed':
      return `${details.old_status} → ${details.new_status}`;
    default:
      return JSON.stringify(details).slice(0, 80);
  }
}

interface TournamentAuditLogProps {
  tournamentId: string;
}

export function TournamentAuditLog({ tournamentId }: TournamentAuditLogProps) {
  const { data: entries, isLoading } = useAuditLog(tournamentId);

  if (isLoading) {
    return (
      <GlowCard className="p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-[#111111]" />
          ))}
        </div>
      </GlowCard>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <GlowCard className="p-8 text-center">
        <ScrollText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-display font-semibold text-foreground mb-1">No activity yet</h3>
        <p className="text-muted-foreground text-sm">
          Tournament actions will appear here as they happen.
        </p>
      </GlowCard>
    );
  }

  // Group entries by date
  const grouped: Record<string, typeof entries> = {};
  for (const entry of entries) {
    const label = getDateLabel(entry.created_at);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(entry);
  }

  return (
    <GlowCard className="p-6">
      <h3 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2 tracking-wide">
        <ScrollText className="w-5 h-5 text-[#FF4500]" />
        Activity Log
      </h3>

      <div className="space-y-6">
        {Object.entries(grouped).map(([dateLabel, dateEntries]) => (
          <div key={dateLabel}>
            <p className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {dateLabel}
            </p>
            <div className="space-y-2">
              {dateEntries.map((entry) => {
                const config = ACTION_CONFIG[entry.action] || {
                  icon: ScrollText,
                  color: 'text-muted-foreground',
                  label: entry.action,
                };
                const Icon = config.icon;

                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/30"
                  >
                    <div className={cn('mt-0.5 shrink-0', config.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground/60">
                          {format(new Date(entry.created_at), 'h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {getActionDescription(entry.action, entry.details)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
