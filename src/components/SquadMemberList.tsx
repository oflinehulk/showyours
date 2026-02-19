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
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { RankBadge } from '@/components/RankBadge';
import { RoleIcon } from '@/components/RoleIcon';
import { 
  useSquadMembers, 
  useRemoveSquadMember, 
  useUpdateSquadMemberRole,
  useTransferLeadership,
  type SquadMember,
  type SquadMemberRole 
} from '@/hooks/useSquadMembers';
import { useAuth } from '@/contexts/AuthContext';
import { getContactValue } from '@/lib/contacts';
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
  MessageCircle,
  ArrowRightLeft
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
  const transferLeadership = useTransferLeadership();


  const canManage = isLeader || isCoLeader;

  const handleRemoveMember = async (member: SquadMember) => {
    if (member.role === 'leader') {
      toast.error("Can't remove the squad leader");
      return;
    }

    try {
      await removeMember.mutateAsync({ memberId: member.id, squadId });
      
      if (member.profile_id) {
        const { supabase } = await import('@/integrations/supabase/client');
        await supabase
          .from('profiles')
          .update({ looking_for_squad: true })
          .eq('id', member.profile_id);
      }
      
      toast.success(`${member.profile?.ign || member.ign || 'Member'} removed from squad`);
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

  const memberHasWhatsApp = (member: SquadMember): boolean => {
    if (member.whatsapp) return true;
    if (member.profile?.contacts) {
      const wa = getContactValue(member.profile.contacts, 'whatsapp');
      return !!wa && wa.trim().length > 0;
    }
    return false;
  };

  const handleTransferLeadership = async (targetMember: SquadMember, newRole: 'co_leader' | 'member') => {
    const currentLeader = members?.find(m => m.role === 'leader');
    if (!currentLeader) return;

    try {
      await transferLeadership.mutateAsync({
        squadId,
        newLeaderMemberId: targetMember.id,
        oldLeaderMemberId: currentLeader.id,
        oldLeaderNewRole: newRole,
      });
      toast.success(`Leadership transferred to ${targetMember.profile?.ign || targetMember.ign || 'member'}`);
    } catch (error: any) {
      toast.error('Failed to transfer leadership', { description: error.message });
    }
  };

  const getWhatsAppNumber = (contacts: unknown) => {
    return getContactValue(contacts, 'whatsapp');
  };

  const getDiscordId = (contacts: unknown) => {
    return getContactValue(contacts, 'discord');
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

  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { leader: 0, co_leader: 1, member: 2 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  return (
    <>
      <div className="space-y-2">
        {sortedMembers.map((member) => {
          const profile = member.profile;
          const isManual = !member.profile_id;
          const displayName = profile?.ign || member.ign || 'Unknown';
          const roleInfo = ROLE_LABELS[member.role];
          const isMe = user?.id === member.user_id;
          const whatsapp = isManual ? member.whatsapp : (profile && getWhatsAppNumber(profile.contacts));
          const discord = isManual ? undefined : (profile && getDiscordId(profile.contacts));
          const canTransferTo = isLeader && !isMe && member.role !== 'leader' && memberHasWhatsApp(member);

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
              {isManual ? (
                <div className="shrink-0">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              ) : (
                <Link to={`/player/${profile?.id}`} className="shrink-0">
                  <Avatar className="h-12 w-12 border-2 border-background">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                </Link>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {isManual ? (
                    <span className="font-semibold text-foreground truncate">
                      {displayName}
                    </span>
                  ) : (
                    <Link 
                      to={`/player/${profile?.id}`}
                      className="font-semibold text-foreground hover:text-primary transition-colors truncate"
                    >
                      {displayName}
                    </Link>
                  )}
                  {isMe && (
                    <Badge variant="outline" className="text-xs">You</Badge>
                  )}
                  {isManual && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">Manual</Badge>
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
                  {isManual && member.mlbb_id && (
                    <span className="text-xs text-muted-foreground">#{member.mlbb_id}</span>
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
                    {!isManual && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to={`/player/${profile?.id}`} className="flex items-center gap-2">
                            <ExternalLink className="w-4 h-4" />
                            View Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
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
                    {canTransferTo && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <ArrowRightLeft className="w-4 h-4 mr-2" />
                            Transfer Leadership
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => handleTransferLeadership(member, 'co_leader')}>
                              <Shield className="w-4 h-4 mr-2 text-blue-400" />
                              Become Co-Leader
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleTransferLeadership(member, 'member')}>
                              <User className="w-4 h-4 mr-2" />
                              Become Member
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </>
                    )}
                    {!canTransferTo && isLeader && !memberHasWhatsApp(member) && (
                      <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                        <ArrowRightLeft className="w-4 h-4 mr-2 opacity-50" />
                        No WhatsApp (can't transfer)
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

    </>
  );
}
