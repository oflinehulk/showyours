import { useState } from 'react';
import { useMyInvitations, useRespondToInvitation } from '@/hooks/useSquadInvitations';
import { 
  useMyTournamentInvitations, 
  useRespondToTournamentInvitation,
  type TournamentInvitation 
} from '@/hooks/useTournamentInvitations';
import { 
  useCreateTournamentSquad,
  useRegisterForTournament,
} from '@/hooks/useTournaments';
import { useSquadMembers } from '@/hooks/useSquadMembers';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Check, X, Loader2, Users, Trophy, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export function InvitationBadge() {
  const { data: squadInvitations } = useMyInvitations();
  const { data: tournamentInvitations } = useMyTournamentInvitations();
  const respondSquad = useRespondToInvitation();
  const respondTournament = useRespondToTournamentInvitation();
  const createTournamentSquad = useCreateTournamentSquad();
  const registerForTournament = useRegisterForTournament();
  const [open, setOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const squadCount = squadInvitations?.length || 0;
  const tournamentCount = tournamentInvitations?.length || 0;
  const totalCount = squadCount + tournamentCount;

  const handleRespondSquad = async (inv: any, response: 'accepted' | 'rejected') => {
    try {
      await respondSquad.mutateAsync({
        invitationId: inv.id,
        response,
        squadId: inv.squad_id,
        profileId: inv.invited_profile_id,
        userId: inv.invited_user_id,
      });
      toast.success(response === 'accepted' ? `Joined ${inv.squad?.name}!` : 'Invitation declined');
    } catch (error: any) {
      toast.error(error.message || 'Failed to respond');
    }
  };

  const handleRespondTournament = async (inv: TournamentInvitation, response: 'accepted' | 'rejected') => {
    setProcessingId(inv.id);
    try {
      if (response === 'accepted') {
        // Auto-register: create tournament squad from existing squad and register
        // First get squad members
        const { data: members, error: membersError } = await supabase
          .from('squad_members')
          .select('*, profile:profiles(*)')
          .eq('squad_id', inv.squad_id)
          .order('position');

        if (membersError) throw membersError;
        if (!members || members.length < 5) {
          throw new Error('Squad must have at least 5 members to register');
        }

        // Get squad details
        const { data: squad, error: squadError } = await supabase
          .from('squads')
          .select('*')
          .eq('id', inv.squad_id)
          .single();

        if (squadError) throw squadError;

        // Create tournament squad
        const tournamentSquad = await createTournamentSquad.mutateAsync({
          squad: {
            name: squad.name,
            existing_squad_id: squad.id,
            logo_url: squad.logo_url,
          },
          members: members.map((m: any, index: number) => ({
            ign: m.profile?.ign || m.ign || 'Unknown',
            mlbb_id: m.profile?.mlbb_id || m.mlbb_id || '',
            role: index < 5 ? 'main' as const : 'substitute' as const,
            position: index + 1,
            user_id: m.user_id,
          })),
        });

        // Register for tournament
        await registerForTournament.mutateAsync({
          tournamentId: inv.tournament_id,
          squadId: tournamentSquad.id,
        });
      }

      // Update invitation status
      await respondTournament.mutateAsync({
        invitationId: inv.id,
        response,
      });

      toast.success(
        response === 'accepted' 
          ? `${inv.squads?.name} registered for ${inv.tournaments?.name}!` 
          : 'Tournament invitation declined'
      );
    } catch (error: any) {
      toast.error(error.message || 'Failed to respond');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="btn-interactive w-9 h-9 relative">
          <Bell className="w-4 h-4" />
          {totalCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
              {totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border">
          <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {totalCount === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No pending notifications
            </div>
          ) : (
            <>
              {/* Tournament Invitations */}
              {tournamentInvitations?.map((inv) => (
                <div key={inv.id} className="p-3 border-b border-border/50 last:border-0">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Trophy className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {inv.tournaments?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        invited <span className="font-medium text-foreground">{inv.squads?.name}</span> • {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs btn-gaming flex-1"
                          onClick={() => handleRespondTournament(inv, 'accepted')}
                          disabled={processingId === inv.id}
                        >
                          {processingId === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                          Accept & Register
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs btn-interactive flex-1"
                          onClick={() => handleRespondTournament(inv, 'rejected')}
                          disabled={processingId === inv.id}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Squad Invitations */}
              {squadInvitations?.map((inv) => (
                <div key={inv.id} className="p-3 border-b border-border/50 last:border-0">
                  <div className="flex items-start gap-3">
                    <img
                      src={inv.squad?.logo_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${inv.squad?.name}`}
                      alt={inv.squad?.name}
                      loading="lazy"
                      className="w-10 h-10 rounded-lg bg-muted object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {inv.squad?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        invited you • {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                      </p>
                      {inv.message && (
                        <p className="text-xs text-muted-foreground mt-1 italic">"{inv.message}"</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs btn-gaming flex-1"
                          onClick={() => handleRespondSquad(inv, 'accepted')}
                          disabled={respondSquad.isPending}
                        >
                          {respondSquad.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs btn-interactive flex-1"
                          onClick={() => handleRespondSquad(inv, 'rejected')}
                          disabled={respondSquad.isPending}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Section for profile page
export function InvitationSection() {
  const { data: invitations } = useMyInvitations();
  const respond = useRespondToInvitation();
  const count = invitations?.length || 0;

  if (count === 0) return null;

  const handleRespond = async (inv: any, response: 'accepted' | 'rejected') => {
    try {
      await respond.mutateAsync({
        invitationId: inv.id,
        response,
        squadId: inv.squad_id,
        profileId: inv.invited_profile_id,
        userId: inv.invited_user_id,
      });
      toast.success(response === 'accepted' ? `Joined ${inv.squad?.name}!` : 'Invitation declined');
    } catch (error: any) {
      toast.error(error.message || 'Failed to respond');
    }
  };

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" />
        Pending Invitations
        <span className="ml-auto text-sm font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          {count}
        </span>
      </h2>
      <div className="space-y-3">
        {invitations?.map((inv) => (
          <div key={inv.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <img
              src={inv.squad?.logo_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${inv.squad?.name}`}
              alt={inv.squad?.name}
              loading="lazy"
              className="w-10 h-10 rounded-lg bg-background object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{inv.squad?.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
              </p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button
                size="sm"
                className="h-8 text-xs btn-gaming"
                onClick={() => handleRespond(inv, 'accepted')}
                disabled={respond.isPending}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => handleRespond(inv, 'rejected')}
                disabled={respond.isPending}
              >
                Decline
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
