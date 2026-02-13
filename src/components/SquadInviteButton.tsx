import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useMySquads } from '@/hooks/useSquads';
import { useSendInvitation } from '@/hooks/useSquadInvitations';
import { Mail, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile } from '@/lib/types';

interface SquadInviteButtonProps {
  player: Profile;
  size?: 'sm' | 'default';
}

export function SquadInviteButton({ player, size = 'sm' }: SquadInviteButtonProps) {
  const { user } = useAuth();
  const { data: mySquads } = useMySquads();
  const sendInvite = useSendInvitation();
  const [sent, setSent] = useState(false);

  // Only show for squad leaders who aren't looking at themselves
  const mySquad = mySquads?.[0];
  if (!user || !mySquad || player.user_id === user.id) return null;

  const handleInvite = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent card link navigation
    e.stopPropagation();
    
    try {
      await sendInvite.mutateAsync({
        squadId: mySquad.id,
        profileId: player.id,
        userId: player.user_id,
      });
      setSent(true);
      toast.success(`Invitation sent to ${player.ign}!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    }
  };

  if (sent) {
    return (
      <Button variant="ghost" size={size} disabled className="text-primary gap-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
        <Check className="w-3.5 h-3.5" />
        <span className="text-xs">Invited</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleInvite}
      disabled={sendInvite.isPending}
      className="btn-interactive gap-1 border-primary/50 text-primary hover:bg-primary/10"
    >
      {sendInvite.isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Mail className="w-3.5 h-3.5" />
      )}
      <span className="text-xs">Invite</span>
    </Button>
  );
}
