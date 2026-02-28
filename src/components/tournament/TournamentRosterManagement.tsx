import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  useTournamentRosterChanges,
  useUpdateRosterChangeStatus,
  useTournamentRegistrations,
} from '@/hooks/useTournaments';
import {
  Users,
  UserPlus,
  UserMinus,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  Lock,
  Loader2,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Tournament, RosterSnapshotEntry } from '@/lib/tournament-types';
import type { Json } from '@/integrations/supabase/types';
import { HostRosterEditor } from '@/components/tournament/HostRosterEditor';

interface TournamentRosterManagementProps {
  tournament: Tournament;
  isHost: boolean;
}

export function TournamentRosterManagement({ tournament, isHost }: TournamentRosterManagementProps) {
  const { data: registrations, isLoading: loadingRegistrations } = useTournamentRegistrations(tournament.id);
  const { data: rosterChanges, isLoading: loadingChanges } = useTournamentRosterChanges(tournament.id);
  const updateStatus = useUpdateRosterChangeStatus();

  const pendingChanges = rosterChanges?.filter(c => c.status === 'pending') || [];
  const processedChanges = rosterChanges?.filter(c => c.status !== 'pending') || [];

  const handleApprove = async (changeId: string) => {
    try {
      await updateStatus.mutateAsync({
        changeId,
        status: 'approved',
        tournamentId: tournament.id,
      });
      toast.success('Roster change approved');
    } catch (error: unknown) {
      toast.error('Failed to approve', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleReject = async (changeId: string) => {
    try {
      await updateStatus.mutateAsync({
        changeId,
        status: 'rejected',
        tournamentId: tournament.id,
      });
      toast.success('Roster change rejected');
    } catch (error: unknown) {
      toast.error('Failed to reject', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const parseRosterSnapshot = (snapshot: Json | null): RosterSnapshotEntry[] => {
    if (!snapshot || !Array.isArray(snapshot)) return [];
    return snapshot.map((item: Json) => item as unknown as RosterSnapshotEntry);
  };

  if (loadingRegistrations || loadingChanges) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const lockedRegistrations = registrations?.filter(r => r.roster_locked) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Roster Management</h3>
        {lockedRegistrations.length > 0 && (
          <Badge variant="secondary" className="ml-2">
            <Lock className="w-3 h-3 mr-1" />
            {lockedRegistrations.length} Rosters Locked
          </Badge>
        )}
      </div>

      <Tabs defaultValue="snapshots" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="snapshots">
            <Users className="w-4 h-4 mr-2" />
            Locked Rosters
          </TabsTrigger>
          <TabsTrigger value="changes" className="relative">
            <UserPlus className="w-4 h-4 mr-2" />
            Change Requests
            {pendingChanges.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {pendingChanges.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="snapshots" className="mt-4">
          {lockedRegistrations.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Rosters are locked when registration closes. Currently no locked rosters.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {lockedRegistrations.map((reg) => {
                const snapshot = parseRosterSnapshot(reg.roster_snapshot);
                const squad = reg.tournament_squads;
                
                return (
                  <Card key={reg.id} className="border-border/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={squad.logo_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {squad.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base">{squad.name}</CardTitle>
                            <CardDescription className="text-xs">
                              Locked at {new Date(reg.roster_locked_at!).toLocaleDateString()}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-primary/10 text-primary">
                            <Lock className="w-3 h-3 mr-1" />
                            Locked
                          </Badge>
                          {isHost && (
                            <HostRosterEditor
                              tournamentId={tournament.id}
                              registration={reg}
                            />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {snapshot.map((member, idx) => (
                          <div
                            key={member.id}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-md",
                              member.role === 'substitute' ? 'bg-muted/30' : 'bg-muted/50'
                            )}
                          >
                            <span className="text-xs text-muted-foreground w-4">
                              {member.position}
                            </span>
                            <span className="font-medium text-sm flex-1">{member.ign}</span>
                            <span className="text-xs text-muted-foreground">#{member.mlbb_id}</span>
                            <Badge variant={member.role === 'main' ? 'default' : 'secondary'} className="text-xs">
                              {member.role === 'main' ? 'Main' : 'Sub'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="changes" className="mt-4">
          {isHost && pendingChanges.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-secondary" />
                Pending Requests ({pendingChanges.length})
              </h4>
              <div className="grid gap-3">
                {pendingChanges.map((change) => (
                  <Card key={change.id} className="border-secondary/30 bg-secondary/5">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={change.tournament_squads?.logo_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {change.tournament_squads?.name?.charAt(0) || 'T'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-semibold truncate">{change.tournament_squads?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 pl-10">
                        <div className="flex items-center gap-1 text-destructive">
                          <UserMinus className="w-4 h-4 shrink-0" />
                          <span className="text-sm truncate">{change.player_out_ign}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex items-center gap-1 text-primary">
                          <UserPlus className="w-4 h-4 shrink-0" />
                          <span className="text-sm truncate">{change.player_in_ign}</span>
                          <span className="text-xs text-muted-foreground">#{change.player_in_mlbb_id}</span>
                        </div>
                      </div>
                      {change.reason && (
                        <p className="text-xs text-muted-foreground pl-10">
                          Reason: {change.reason}
                        </p>
                      )}
                      <div className="flex gap-2 pl-10">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(change.id)}
                          disabled={updateStatus.isPending}
                          className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10 min-h-[44px]"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(change.id)}
                          disabled={updateStatus.isPending}
                          className="flex-1 bg-primary hover:bg-primary/80 min-h-[44px]"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {processedChanges.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Change History</h4>
              <div className="grid gap-2">
                {processedChanges.map((change) => (
                  <div
                    key={change.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg",
                      change.status === 'approved' ? 'bg-primary/10' : 'bg-destructive/10'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {change.tournament_squads?.name}:
                      </span>
                      <span className="text-sm line-through text-muted-foreground">{change.player_out_ign}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm">{change.player_in_ign}</span>
                    </div>
                    <Badge variant={change.status === 'approved' ? 'default' : 'destructive'}>
                      {change.status === 'approved' ? (
                        <><CheckCircle className="w-3 h-3 mr-1" /> Approved</>
                      ) : (
                        <><XCircle className="w-3 h-3 mr-1" /> Rejected</>
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingChanges.length === 0 && processedChanges.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No roster change requests yet.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
