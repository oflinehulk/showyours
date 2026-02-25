import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTournamentRegistrations, useHostAddSquad } from '@/hooks/useTournaments';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Loader2,
  Shield,
  Users,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Tournament } from '@/lib/tournament-types';

interface HostAddSquadProps {
  tournament: Tournament;
}

export function HostAddSquad({ tournament }: HostAddSquadProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: registrations } = useTournamentRegistrations(tournament.id);
  const hostAddSquad = useHostAddSquad();
  const [addedSquadIds, setAddedSquadIds] = useState<Set<string>>(new Set());

  // Fetch all squads for browsing/searching
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
  });

  // Already registered squad IDs (via existing_squad_id)
  const registeredSquadIds = useMemo(() => {
    return new Set(
      registrations
        ?.map(r => r.tournament_squads?.existing_squad_id)
        .filter(Boolean) as string[] || []
    );
  }, [registrations]);

  // Filter squads
  const filteredSquads = useMemo(() => {
    if (!allSquads) return [];
    let filtered = allSquads.filter(s =>
      !registeredSquadIds.has(s.id) &&
      !addedSquadIds.has(s.id) &&
      s.member_count >= 5
    );
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(term));
    }
    return filtered.slice(0, 20);
  }, [allSquads, searchTerm, registeredSquadIds, addedSquadIds]);

  const handleAdd = async (squadId: string, squadName: string) => {
    try {
      await hostAddSquad.mutateAsync({
        tournamentId: tournament.id,
        squadId,
      });
      setAddedSquadIds(prev => new Set(prev).add(squadId));
      toast.success(`${squadName} added to tournament`, {
        description: 'Squad has been registered and auto-approved.',
      });
    } catch (error: unknown) {
      toast.error('Failed to add squad', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="w-4 h-4 text-primary" />
          Add Squad
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Directly add a squad to this tournament (auto-approved).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search squads by name..."
            className="pl-9"
          />
        </div>

        {/* Squad List */}
        <div className="max-h-64 overflow-y-auto space-y-2">
          {filteredSquads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {searchTerm ? 'No squads found' : 'No eligible squads (need 5+ members, not already registered)'}
            </p>
          ) : (
            filteredSquads.map(squad => (
              <div key={squad.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={squad.logo_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${squad.name}`} />
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
                  onClick={() => handleAdd(squad.id, squad.name)}
                  disabled={hostAddSquad.isPending}
                >
                  {hostAddSquad.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
