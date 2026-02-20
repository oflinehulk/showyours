import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  useTournamentInvitations, 
  useSendTournamentInvitation, 
  useCancelTournamentInvitation 
} from '@/hooks/useTournamentInvitations';
import { useTournamentRegistrations } from '@/hooks/useTournaments';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Send,
  X,
  Loader2,
  Shield,
  Users,
  Check,
  Clock,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Tournament } from '@/lib/tournament-types';

interface TournamentInviteSquadsProps {
  tournament: Tournament;
}

export function TournamentInviteSquads({ tournament }: TournamentInviteSquadsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: invitations } = useTournamentInvitations(tournament.id);
  const { data: registrations } = useTournamentRegistrations(tournament.id);
  const sendInvitation = useSendTournamentInvitation();
  const cancelInvitation = useCancelTournamentInvitation();

  // Fetch all squads for browsing/searching
  const { data: allSquads } = useQuery({
    queryKey: ['all-squads-for-invite'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('squads')
        .select('id, name, logo_url, owner_id, member_count, min_rank, server')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Already invited squad IDs
  const invitedSquadIds = useMemo(() => {
    return new Set(invitations?.map(i => i.squad_id) || []);
  }, [invitations]);

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
      s.member_count >= 5
    );
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(term));
    }
    return filtered.slice(0, 20);
  }, [allSquads, searchTerm, registeredSquadIds]);

  const handleInvite = async (squadId: string, squadName: string) => {
    try {
      await sendInvitation.mutateAsync({
        tournamentId: tournament.id,
        squadId,
      });
      toast.success(`Invitation sent to ${squadName}`);
    } catch (error: any) {
      toast.error('Failed to invite', { description: error.message });
    }
  };

  const handleCancel = async (invitationId: string) => {
    try {
      await cancelInvitation.mutateAsync({
        invitationId,
        tournamentId: tournament.id,
      });
      toast.success('Invitation cancelled');
    } catch (error: any) {
      toast.error('Failed to cancel', { description: error.message });
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-3 h-3 text-muted-foreground" />;
      case 'accepted': return <Check className="w-3 h-3 text-primary" />;
      case 'rejected': return <XCircle className="w-3 h-3 text-destructive" />;
      default: return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="w-4 h-4 text-primary" />
          Invite Squads
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sent Invitations */}
        {invitations && invitations.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sent Invitations</p>
            {invitations.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={inv.squads?.logo_url || undefined} />
                  <AvatarFallback><Shield className="w-4 h-4" /></AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium flex-1 truncate">{inv.squads?.name}</span>
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  {statusIcon(inv.status)}
                  {inv.status}
                </Badge>
                {inv.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => handleCancel(inv.id)}
                    disabled={cancelInvitation.isPending}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

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
              {searchTerm ? 'No squads found' : 'No eligible squads (need 5+ members)'}
            </p>
          ) : (
            filteredSquads.map(squad => {
              const isInvited = invitedSquadIds.has(squad.id);
              return (
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
                  {isInvited ? (
                    <Badge variant="secondary" className="text-xs">Invited</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleInvite(squad.id, squad.name)}
                      disabled={sendInvitation.isPending}
                    >
                      {sendInvitation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3 h-3 mr-1" />
                          Invite
                        </>
                      )}
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
