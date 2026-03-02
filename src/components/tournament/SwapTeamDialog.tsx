import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSwapTeam, useHostAddSquad, useTournamentGroupTeams } from '@/hooks/useTournaments';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowRightLeft, Loader2, Shield, Users, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Tournament, TournamentRegistration, TournamentSquad } from '@/lib/tournament-types';

interface SwapTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: Tournament;
  stageId: string;
  groupId: string;
  withdrawnSquadId: string;
  withdrawnSquadName: string;
  registrations: (TournamentRegistration & { tournament_squads: TournamentSquad })[];
}

export function SwapTeamDialog({
  open,
  onOpenChange,
  tournament,
  stageId,
  groupId,
  withdrawnSquadId,
  withdrawnSquadName,
  registrations,
}: SwapTeamDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [swapping, setSwapping] = useState(false);
  const swapTeam = useSwapTeam();
  const hostAddSquad = useHostAddSquad();
  const { data: groupTeams } = useTournamentGroupTeams(stageId);

  // IDs of squads already assigned to any group in this stage
  const assignedSquadIds = useMemo(() => {
    return new Set((groupTeams || []).map(gt => gt.tournament_squad_id));
  }, [groupTeams]);

  // Existing registrations eligible for swap (rejected, pending, or withdrawn but not in a group)
  const eligibleRegistrations = useMemo(() => {
    return (registrations || []).filter(r => {
      if (!['rejected', 'pending', 'withdrawn'].includes(r.status)) return false;
      // Exclude the team being replaced
      if (r.tournament_squad_id === withdrawnSquadId) return false;
      // Exclude teams already in a group
      if (assignedSquadIds.has(r.tournament_squad_id)) return false;
      return true;
    });
  }, [registrations, withdrawnSquadId, assignedSquadIds]);

  // For "Add New Team" tab - fetch all squads
  const { data: allSquads } = useQuery({
    queryKey: ['all-squads-for-host-add'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('squads')
        .select('id, name, logo_url, owner_id, member_count, min_rank, server')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Already registered squad IDs (via existing_squad_id)
  const registeredSquadIds = useMemo(() => {
    return new Set(
      registrations
        ?.filter(r => r.status !== 'withdrawn')
        .map(r => r.tournament_squads?.existing_squad_id)
        .filter(Boolean) as string[] || []
    );
  }, [registrations]);

  const filteredSquads = useMemo(() => {
    if (!allSquads) return [];
    let filtered = allSquads.filter(s =>
      !registeredSquadIds.has(s.id) &&
      s.member_count >= 5
    );
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(term));
    }
    return filtered.slice(0, 20);
  }, [allSquads, searchTerm, registeredSquadIds]);

  const handleSwapExisting = async (reg: TournamentRegistration & { tournament_squads: TournamentSquad }) => {
    setSwapping(true);
    try {
      await swapTeam.mutateAsync({
        tournamentId: tournament.id,
        stageId,
        groupId,
        withdrawnSquadId,
        newSquadId: reg.tournament_squad_id,
        newRegistrationId: reg.id,
      });
      toast.success(`Swapped with ${reg.tournament_squads.name}`, {
        description: 'Team replaced in group. Forfeited matches reset to pending.',
      });
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error('Swap failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSwapping(false);
    }
  };

  const handleSwapNewTeam = async (squadId: string, squadName: string) => {
    setSwapping(true);
    try {
      // First add the squad to the tournament (auto-approves)
      const result = await hostAddSquad.mutateAsync({
        tournamentId: tournament.id,
        squadId,
      });

      // Find the newly created registration
      const { data: newRegs } = await supabase
        .from('tournament_registrations')
        .select('id, tournament_squad_id')
        .eq('tournament_id', tournament.id)
        .eq('tournament_squad_id', result.squadId)
        .single();

      if (!newRegs) throw new Error('Could not find new registration');

      // Now perform the swap
      await swapTeam.mutateAsync({
        tournamentId: tournament.id,
        stageId,
        groupId,
        withdrawnSquadId,
        newSquadId: newRegs.tournament_squad_id,
        newRegistrationId: newRegs.id,
      });

      toast.success(`Swapped with ${squadName}`, {
        description: 'New team added and placed in group. Forfeited matches reset to pending.',
      });
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error('Swap failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSwapping(false);
    }
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    withdrawn: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ArrowRightLeft className="w-4 h-4 text-[#FF4500]" />
            Swap Team
          </DialogTitle>
          <DialogDescription>
            Replace <span className="font-medium text-foreground">{withdrawnSquadName}</span> with a new team in this group.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="existing" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="existing" className="flex-1 text-xs">Existing Registrations</TabsTrigger>
            <TabsTrigger value="new" className="flex-1 text-xs">Add New Team</TabsTrigger>
          </TabsList>

          {/* Tab: Existing Registrations */}
          <TabsContent value="existing">
            <div className="max-h-64 overflow-y-auto space-y-2">
              {eligibleRegistrations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No eligible teams available from existing registrations.
                </p>
              ) : (
                eligibleRegistrations.map(reg => (
                  <div key={reg.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={reg.tournament_squads.logo_url || undefined} />
                      <AvatarFallback className="text-[9px] bg-[#1a1a1a]">
                        {reg.tournament_squads.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{reg.tournament_squads.name}</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColor[reg.status] || ''}`}>
                        {reg.status}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleSwapExisting(reg)}
                      disabled={swapping}
                    >
                      {swapping ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        'Select'
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Tab: Add New Team */}
          <TabsContent value="new">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search squads by name..."
                  className="pl-9"
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredSquads.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {searchTerm ? 'No squads found' : 'No eligible squads (need 5+ members, not already registered)'}
                  </p>
                ) : (
                  filteredSquads.map(squad => (
                    <div key={squad.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={squad.logo_url || undefined} />
                        <AvatarFallback><Shield className="w-4 h-4" /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">{squad.name}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" /> {squad.member_count} members
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleSwapNewTeam(squad.id, squad.name)}
                        disabled={swapping}
                      >
                        {swapping ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-3 h-3 mr-1" />
                            Swap
                          </>
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
