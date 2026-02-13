import { useState } from 'react';
import { useMyInvitations, useRespondToInvitation } from '@/hooks/useSquadInvitations';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Check, X, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export function InvitationBadge() {
  const { data: invitations } = useMyInvitations();
  const respond = useRespondToInvitation();
  const [open, setOpen] = useState(false);
  const count = invitations?.length || 0;

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="btn-interactive w-9 h-9 relative">
          <Bell className="w-4 h-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border">
          <h3 className="font-semibold text-sm text-foreground">Squad Invitations</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {count === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No pending invitations
            </div>
          ) : (
            invitations?.map((inv) => (
              <div key={inv.id} className="p-3 border-b border-border/50 last:border-0">
                <div className="flex items-start gap-3">
                  <img
                    src={inv.squad?.logo_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${inv.squad?.name}`}
                    alt={inv.squad?.name}
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
                        onClick={() => handleRespond(inv, 'accepted')}
                        disabled={respond.isPending}
                      >
                        {respond.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs btn-interactive flex-1"
                        onClick={() => handleRespond(inv, 'rejected')}
                        disabled={respond.isPending}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
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
