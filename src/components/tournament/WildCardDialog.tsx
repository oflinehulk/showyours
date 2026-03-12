import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useWildCardAdd, useTournamentRegistrations } from '@/hooks/useTournaments';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Loader2, Shield, Users, Zap } from 'lucide-react';
import { toast } from 'sonner';
import type { TournamentMatch } from '@/lib/tournament-types';

interface WildCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  match: TournamentMatch | null;
}

export function WildCardDialog({
  open,
  onOpenChange,
  tournamentId,
  match,
}: WildCardDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const wildCardAdd = useWildCardAdd();
  const { data: registrations } = useTournamentRegistrations(tournamentId);

  const { data: allSquads } = useQuery({
    queryKey: ['all-squads-for-wildcard', tournamentId],
    queryFn: async () => {
      const { data: squads, error } = await supabase
        .from('squads')
        .select('id, name, logo_url, owner_id, member_count, min_rank, server')
        .order('name');
      if (error) throw error;
      if (!squads || squads.length === 0) return [];

      const squadIds = squads.map(s => s.id);
      const { data: members } = await supabase
        .from('squad_members')
        .select('squad_id')
        .in('squad_id', squadIds);

      const countMap: Record<string, number> = {};
      members?.forEach(m => {
        countMap[m.squad_id] = (countMap[m.squad_id] || 0) + 1;
      });

      return squads.map(s => ({
        ...s,
        member_count: countMap[s.id] || 0,
      }));
    },
    enabled: open,
  });

  const registeredSquadIds = useMemo(() => {
    return new Set(
      registrations
        ?.map(r => r.tournament_squads?.existing_squad_id)
        .filter(Boolean) as string[] || []
    );
  }, [registrations]);

  const filteredSquads = useMemo(() => {
    if (!allSquads) return [];
    let filtered = allSquads.filter(
      s => !registeredSquadIds.has(s.id) && s.member_count >= 5
    );
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(term));
    }
    return filtered.slice(0, 20);
  }, [allSquads, searchTerm, registeredSquadIds]);

  const existingTeam = match?.squad_a || match?.squad_b;

  const handleAdd = async (squadId: string, squadName: string) => {
    if (!match) return;
    try {
      // Sync member count
      const { count } = await supabase
        .from('squad_members')
        .select('*', { count: 'exact', head: true })
        .eq('squad_id', squadId);
      if (count != null) {
        await supabase.from('squads').update({ member_count: count }).eq('id', squadId);
      }

      await wildCardAdd.mutateAsync({
        tournamentId,
        squadId,
        matchId: match.id,
      });
      toast.success(`🃏 ${squadName} added as Wild Card!`, {
        description: `They will face ${existingTeam?.name || 'TBD'} in the Lower Bracket.`,
      });
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error('Failed to add wild card', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Add Wild Card
          </DialogTitle>
          <DialogDescription>
            Select a squad to fill this Lower Bracket BYE slot
            {existingTeam && (
              <span className="block mt-1 text-foreground font-medium">
                vs {existingTeam.name}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search squads by name..."
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredSquads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchTerm
                  ? 'No squads found'
                  : 'No eligible squads (need 5+ members, not already registered)'}
              </p>
            ) : (
              filteredSquads.map(squad => (
                <div
                  key={squad.id}
                  className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={
                        squad.logo_url ||
                        `https://api.dicebear.com/7.x/shapes/svg?seed=${squad.name}`
                      }
                    />
                    <AvatarFallback>
                      <Shield className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">
                      {squad.name}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" /> {squad.member_count} members
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10"
                    onClick={() => handleAdd(squad.id, squad.name)}
                    disabled={wildCardAdd.isPending}
                  >
                    {wildCardAdd.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-3 h-3 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
