import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RankBadge } from '@/components/RankBadge';
import { RoleIcon } from '@/components/RoleIcon';
import { 
  useSquadMembers, 
  useRemoveSquadMember, 
  useUpdateSquadMemberRole,
  type SquadMember,
  type SquadMemberRole 
} from '@/hooks/useSquadMembers';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  Crown, 
  Shield, 
  MoreVertical, 
  UserMinus, 
  ArrowUp, 
  ArrowDown,
  ExternalLink,
  Phone,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SquadMemberListProps {
  squadId: string;
  isLeader: boolean;
  isCoLeader: boolean;
}

const ROLE_LABELS: Record<SquadMemberRole, { label: string; icon: React.ReactNode; color: string }> = {
  leader: { label: 'Leader', icon: <Crown className="w-3 h-3" />, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  co_leader: { label: 'Co-Leader', icon: <Shield className="w-3 h-3" />, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  member: { label: 'Member', icon: <User className="w-3 h-3" />, color: 'bg-muted text-muted-foreground border-border' },
};

export function SquadMemberList({ squadId, isLeader, isCoLeader }: SquadMemberListProps) {
  const { user } = useAuth();
  const { data: members, isLoading } = useSquadMembers(squadId);
  const removeMember = useRemoveSquadMember();
  const updateRole = useUpdateSquadMemberRole();

  const canManage = isLeader || isCoLeader;

  const handleRemoveMember = async (member: SquadMember) => {
    if (member.role === 'leader') {
      toast.error("Can't remove the squad leader");
      return;
    }

    try {
      await removeMember.mutateAsync({ memberId: member.id, squadId });
      toast.success(`${member.profile?.ign || 'Member'} removed from squad`);
    } catch (error: any) {
      toast.error('Failed to remove member', { description: error.message });
    }
  };

  const handlePromote = async (member: SquadMember) => {
    const newRole: SquadMemberRole = member.role === 'member' ? 'co_leader' : 'leader';
    
    try {
      await updateRole.mutateAsync({ memberId: member.id, squadId, role: newRole });
      toast.success(`${member.profile?.ign || 'Member'} promoted to ${ROLE_LABELS[newRole].label}`);
    } catch (error: any) {
      toast.error('Failed to update role', { description: error.message });
    }
  };

  const handleDemote = async (member: SquadMember) => {
    const newRole: SquadMemberRole = member.role === 'leader' ? 'co_leader' : 'member';
    
    try {
      await updateRole.mutateAsync({ memberId: member.id, squadId, role: newRole });
      toast.success(`${member.profile?.ign || 'Member'} demoted to ${ROLE_LABELS[newRole].label}`);
    } catch (error: any) {
      toast.error('Failed to update role', { description: error.message });
    }
  };

  const getWhatsAppNumber = (contacts: any) => {
    const parsed = typeof contacts === 'string' ? JSON.parse(contacts) : contacts;
    const whatsapp = parsed?.find?.((c: any) => c.type === 'whatsapp');
    return whatsapp?.value;
  };

  const getDiscordId = (contacts: any) => {
    const parsed = typeof contacts === 'string' ? JSON.parse(contacts) : contacts;
    const discord = parsed?.find?.((c: any) => c.type === 'discord');
    return discord?.value;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No members yet</p>
      </div>
    );
  }

  // Sort: leader first, then co-leaders, then members
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { leader: 0, co_leader: 1, member: 2 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  return (
    <div className="space-y-2">
      {sortedMembers.map((member) => {
        const profile = member.profile;
        const roleInfo = ROLE_LABELS[member.role];
        const isMe = user?.id === member.user_id;
        const whatsapp = profile && getWhatsAppNumber(profile.contacts);
        const discord = profile && getDiscordId(profile.contacts);

        return (
          <div
            key={member.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border transition-colors',
              member.role === 'leader' && 'bg-yellow-500/5 border-yellow-500/20',
              member.role === 'co_leader' && 'bg-blue-500/5 border-blue-500/20',
              member.role === 'member' && 'bg-muted/50 border-border'
            )}
          >
            <Link to={`/player/${profile?.id}`} className="shrink-0">
              <Avatar className="h-12 w-12 border-2 border-background">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link 
                  to={`/player/${profile?.id}`}
                  className="font-semibold text-foreground hover:text-primary transition-colors truncate"
                >
                  {profile?.ign || 'Unknown'}
                </Link>
                {isMe && (
                  <Badge variant="outline" className="text-xs">You</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className={cn('text-xs', roleInfo.color)}>
                  {roleInfo.icon}
                  <span className="ml-1">{roleInfo.label}</span>
                </Badge>
                {profile && (
                  <>
                    <RankBadge rank={profile.rank} size="sm" showName={false} />
                    <RoleIcon role={profile.main_role} size="sm" showName={false} />
                  </>
                )}
              </div>
            </div>

            {/* Contact icons for leaders/co-leaders */}
            {(member.role === 'leader' || member.role === 'co_leader') && (
              <div className="flex items-center gap-1 shrink-0">
                {whatsapp && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a
                      href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="WhatsApp"
                    >
                      <Phone className="w-4 h-4 text-green-500" />
                    </a>
                  </Button>
                )}
                {discord && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={`Discord: ${discord}`}
                    onClick={() => {
                      navigator.clipboard.writeText(discord);
                      toast.success('Discord ID copied!');
                    }}
                  >
                    <MessageCircle className="w-4 h-4 text-indigo-500" />
                  </Button>
                )}
              </div>
            )}

            {/* Actions for leaders */}
            {canManage && !isMe && member.role !== 'leader' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to={`/player/${profile?.id}`} className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      View Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isLeader && member.role !== 'co_leader' && (
                    <DropdownMenuItem onClick={() => handlePromote(member)}>
                      <ArrowUp className="w-4 h-4 mr-2" />
                      Promote to Co-Leader
                    </DropdownMenuItem>
                  )}
                  {isLeader && member.role === 'co_leader' && (
                    <DropdownMenuItem onClick={() => handleDemote(member)}>
                      <ArrowDown className="w-4 h-4 mr-2" />
                      Demote to Member
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleRemoveMember(member)}
                    className="text-destructive focus:text-destructive"
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
                    Remove from Squad
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
    </div>
  );
}
