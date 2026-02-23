import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { GlowCard } from '@/components/tron/GlowCard';
import { useAssignTeamsToGroups, useTournamentGroups, useTournamentGroupTeams } from '@/hooks/useTournaments';
import {
  Users,
  Shuffle,
  Loader2,
  ListOrdered,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { TournamentSquad, TournamentStage, TournamentRegistration, TournamentGroup, TournamentGroupTeam } from '@/lib/tournament-types';

interface GroupAssignmentProps {
  tournamentId: string;
  stage: TournamentStage;
  registrations: (TournamentRegistration & { tournament_squads: TournamentSquad })[];
  onAssigned?: () => void;
}

export function GroupAssignment({
  tournamentId,
  stage,
  registrations,
  onAssigned,
}: GroupAssignmentProps) {
  const assignTeams = useAssignTeamsToGroups();
  const { data: groups } = useTournamentGroups(stage.id);
  const { data: groupTeams } = useTournamentGroupTeams(stage.id);

  const approvedRegs = registrations.filter(r => r.status === 'approved');
  const squadMap = new Map(approvedRegs.map(r => [r.tournament_squad_id, r.tournament_squads]));

  const hasExistingGroups = groups && groups.length > 0;

  // Build display groups
  const displayGroups: { label: string; squads: TournamentSquad[] }[] = [];
  if (hasExistingGroups && groupTeams) {
    for (const group of groups) {
      const teamEntries = groupTeams.filter(gt => gt.group_id === group.id);
      const squads = teamEntries
        .map(gt => gt.tournament_squads || squadMap.get(gt.tournament_squad_id))
        .filter(Boolean) as TournamentSquad[];
      displayGroups.push({ label: group.label, squads });
    }
  }

  const handleAssign = async (mode: 'balanced' | 'random') => {
    const squadIds = approvedRegs
      .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
      .map(r => r.tournament_squad_id);

    try {
      await assignTeams.mutateAsync({
        tournamentId,
        stageId: stage.id,
        groupCount: stage.group_count,
        squadIds,
        mode,
      });
      toast.success(`Teams assigned to ${stage.group_count} groups (${mode})`);
      onAssigned?.();
    } catch (error: any) {
      toast.error('Failed to assign groups', { description: error.message });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-[#FF4500]" />
          <h4 className="text-sm font-semibold text-foreground">
            Group Assignment — {stage.name}
          </h4>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAssign('balanced')}
            disabled={assignTeams.isPending || approvedRegs.length < 2}
          >
            {assignTeams.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <ListOrdered className="w-3 h-3 mr-1" />
            )}
            Balanced
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAssign('random')}
            disabled={assignTeams.isPending || approvedRegs.length < 2}
          >
            <Shuffle className="w-3 h-3 mr-1" />
            Random
          </Button>
        </div>
      </div>

      {hasExistingGroups ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayGroups.map((group) => (
            <div
              key={group.label}
              className="p-3 bg-muted/30 rounded-lg border border-border/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded bg-[#FF4500]/10 border border-[#FF4500]/30 flex items-center justify-center text-xs font-bold text-[#FF4500]">
                  {group.label}
                </div>
                <span className="text-xs text-muted-foreground">{group.squads.length} teams</span>
              </div>
              <div className="space-y-1">
                {group.squads.map((squad) => (
                  <div key={squad.id} className="flex items-center gap-2 p-1.5 rounded bg-muted/50">
                    <Avatar className="h-5 w-5 shrink-0">
                      {squad.logo_url ? (
                        <AvatarImage src={squad.logo_url} alt={squad.name} />
                      ) : null}
                      <AvatarFallback className="text-[9px] bg-[#1a1a1a] text-muted-foreground">
                        {squad.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate">{squad.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 text-center text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border/50">
          <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
          <p>Click "Balanced" or "Random" to assign {approvedRegs.length} teams into {stage.group_count} groups.</p>
          <p className="text-xs mt-1">Balanced uses snake-draft by seed order. Random shuffles teams.</p>
        </div>
      )}
    </div>
  );
}
