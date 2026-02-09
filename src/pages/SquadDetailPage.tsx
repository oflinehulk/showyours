import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { RankBadge } from '@/components/RankBadge';
import { RoleIcon } from '@/components/RoleIcon';
import { PlayerSearch } from '@/components/PlayerSearch';
import { SquadMemberList } from '@/components/SquadMemberList';
import { SquadApplications } from '@/components/SquadApplications';
import { ApplyToSquadButton } from '@/components/ApplyToSquadButton';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useSquad, useMySquads, useUpdateSquad, useDeleteSquad } from '@/hooks/useSquads';
import { 
  useSquadMembers, 
  useAddSquadMember, 
  useLeaveSquad,
  type SearchedProfile 
} from '@/hooks/useSquadMembers';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile } from '@/hooks/useProfiles';
import { CONTACT_TYPES } from '@/lib/constants';
import { parseContacts } from '@/lib/contacts';
import { 
  ArrowLeft, 
  MapPin, 
  Users,
  MessageCircle,
  Copy,
  Check,
  Edit,
  Phone,
  UserPlus,
  Crown,
  AlertCircle,
  Trash2,
  Loader2,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SquadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: squad, isLoading } = useSquad(id || '');
  const { data: mySquads } = useMySquads();
  const { data: members } = useSquadMembers(id);
  const { data: myProfile } = useMyProfile();
  const updateSquad = useUpdateSquad();
  const deleteSquad = useDeleteSquad();
  const addMember = useAddSquadMember();
  const leaveSquad = useLeaveSquad();
  const [copiedContact, setCopiedContact] = useState<string | null>(null);

  const isOwner = user && mySquads && mySquads.some(s => s.id === id);
  
  // Check if user is leader or co-leader
  const myMembership = members?.find(m => m.user_id === user?.id);
  const isLeader = isOwner || myMembership?.role === 'leader';
  const isCoLeader = myMembership?.role === 'co_leader';
  const canManageMembers = isLeader || isCoLeader;
  const isMember = !!myMembership;
  const canLeave = isMember && !isOwner; // Members can leave but owners can't (they delete)

  // Get list of user IDs already in the squad
  const existingUserIds = members?.map(m => m.user_id) || [];

  const handleToggleRecruiting = async () => {
    if (!squad || !isOwner) return;
    
    try {
      await updateSquad.mutateAsync({
        id: squad.id,
        is_recruiting: !squad.is_recruiting,
      });
      toast.success(squad.is_recruiting 
        ? 'Squad is now hidden from listings' 
        : 'Squad is now visible in listings!'
      );
    } catch (error: any) {
      toast.error('Failed to update status', { description: error.message });
    }
  };

  const handleDeleteSquad = async () => {
    if (!squad || !isOwner) return;
    
    try {
      await deleteSquad.mutateAsync(squad.id);
      toast.success('Squad deleted successfully');
      navigate('/squads');
    } catch (error: any) {
      toast.error('Failed to delete squad', { description: error.message });
    }
  };

  const handleAddMember = async (profile: SearchedProfile) => {
    if (!squad) return;

    try {
      await addMember.mutateAsync({
        squadId: squad.id,
        profileId: profile.id,
        userId: profile.user_id,
        role: 'member',
      });
      toast.success(`${profile.ign} added to squad!`);
    } catch (error: any) {
      toast.error('Failed to add member', { description: error.message });
    }
  };

  const handleLeaveSquad = async () => {
    if (!squad || !canLeave) return;
    
    try {
      await leaveSquad.mutateAsync(squad.id);
      toast.success('You have left the squad');
      navigate('/squads');
    } catch (error: any) {
      toast.error('Failed to leave squad', { description: error.message });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-64 w-full rounded-lg mb-6" />
          <Skeleton className="h-32 w-full rounded-lg mb-6" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </Layout>
    );
  }

  if (!squad) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Squad not found</h1>
          <Button asChild className="btn-interactive">
            <Link to="/squads">Back to Squads</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const contacts = parseContacts(squad.contacts);
  const neededRoles = squad.needed_roles || [];
  const maxMembers = squad.max_members || 10;
  const memberCount = members?.length || 0;

  const copyToClipboard = (text: string, contactId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedContact(contactId);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedContact(null), 2000);
  };

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'discord':
        return '💬';
      case 'facebook':
        return '📘';
      case 'game-id':
        return '🎮';
      case 'instagram':
        return '📷';
      case 'twitter':
        return '🐦';
      case 'whatsapp':
        return '📱';
      default:
        return '📱';
    }
  };

  return (
    <Layout>
      {/* Hero Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-secondary/20 via-primary/10 to-background overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container mx-auto px-4">
        {/* Back button */}
        <div className="mb-4 -mt-8 relative z-10">
          <Button variant="ghost" size="sm" asChild className="btn-interactive">
            <Link to="/squads">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Squads
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 -mt-20 md:-mt-24 relative z-10">
          {/* Main Info */}
          <div className="lg:col-span-2">
            {/* Squad Header */}
            <div className="glass-card p-6 mb-6">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* Logo */}
                <img
                  src={squad.logo_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${squad.name}`}
                  alt={squad.name}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-muted object-cover glow-secondary"
                />

                {/* Info */}
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    {squad.name}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{memberCount}/{maxMembers} members</span>
                    </div>
                    <span className="text-muted-foreground">•</span>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      Asia Server • India
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Min Rank:</span>
                    <RankBadge rank={squad.min_rank} size="sm" />
                  </div>
                </div>
              </div>

              {/* Owner Controls */}
              {isOwner && (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="isRecruiting"
                        checked={squad.is_recruiting}
                        onCheckedChange={handleToggleRecruiting}
                        disabled={updateSquad.isPending}
                      />
                      <Label htmlFor="isRecruiting" className="cursor-pointer">
                        <span className="font-medium">Actively Recruiting</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {squad.is_recruiting 
                            ? 'Your squad is visible in listings' 
                            : 'Your squad is hidden from listings'}
                        </p>
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="btn-interactive" asChild>
                        <Link to={`/squad/${squad.id}/edit`}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Squad
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="btn-interactive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete your squad?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. Your squad and all member associations 
                              will be permanently deleted. Any tournament registrations will also be affected.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleDeleteSquad}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={deleteSquad.isPending}
                            >
                              {deleteSquad.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : null}
                              Delete Squad
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              )}

              {/* Leave Squad Button for non-owner members */}
              {canLeave && (
                <div className="mt-6 pt-6 border-t border-border">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="text-destructive border-destructive/50 hover:bg-destructive/10">
                        <LogOut className="w-4 h-4 mr-2" />
                        Leave Squad
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Leave this squad?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You will be removed from the squad. You can request to join again later.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleLeaveSquad}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={leaveSquad.isPending}
                        >
                          {leaveSquad.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : null}
                          Leave Squad
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              {/* Apply Button for non-members */}
              {!isMember && !isOwner && squad.is_recruiting && (
                <div className="mt-6 pt-6 border-t border-border">
                  <ApplyToSquadButton squadId={squad.id} squadName={squad.name} />
                </div>
              )}
            </div>

            {/* Description */}
            {squad.description && (
              <div className="glass-card p-6 mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-3">About Us</h2>
                <p className="text-muted-foreground leading-relaxed">{squad.description}</p>
              </div>
            )}

            {/* Squad Applications - only for leaders */}
            {canManageMembers && (
              <SquadApplications
                squadId={squad.id}
                maxMembers={maxMembers}
                currentMemberCount={memberCount}
              />
            )}

            {/* Squad Members */}
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-secondary" />
                  Squad Members
                </CardTitle>
                <span className="text-sm text-muted-foreground">
                  {memberCount}/{maxMembers}
                </span>
              </CardHeader>
              <CardContent>
                {/* Add Member - only for leaders/co-leaders */}
                {canManageMembers && memberCount < maxMembers && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <UserPlus className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Add Player</span>
                    </div>
                    <PlayerSearch
                      onSelect={handleAddMember}
                      excludeSquadId={squad.id}
                      excludeUserIds={existingUserIds}
                      placeholder="Search registered players by IGN or MLBB ID..."
                      disabled={addMember.isPending}
                      addToSquad={true}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Only players with registered profiles can be added
                    </p>
                  </div>
                )}

                {/* No profile warning for leaders */}
                {canManageMembers && !myProfile && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-destructive">Profile Required</p>
                        <p className="text-muted-foreground">
                          As a leader/co-leader, you must have a profile with WhatsApp contact.{' '}
                          <Link to="/create-profile" className="text-primary hover:underline">
                            Create profile
                          </Link>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <SquadMemberList
                  squadId={squad.id}
                  isLeader={isLeader}
                  isCoLeader={isCoLeader}
                />
              </CardContent>
            </Card>

            {/* Needed Roles */}
            {neededRoles.length > 0 && (
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Open Positions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {neededRoles.map((role) => (
                    <div
                      key={role}
                      className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <RoleIcon role={role} size="md" showName={false} />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground capitalize">{role}</p>
                        <p className="text-xs text-muted-foreground">Position Available</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Contact Info */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-secondary" />
                Contact Squad
              </h2>

              {contacts.length > 0 ? (
                <div className="space-y-3">
                  {contacts.map((contact: { type: string; value: string }, index: number) => {
                    const contactType = CONTACT_TYPES.find((c) => c.id === contact.type);
                    const contactKey = `${contact.type}-${index}`;
                    const isWhatsApp = contact.type === 'whatsapp';
                    
                    return (
                      <div
                        key={contactKey}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl">{getContactIcon(contact.type)}</span>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">{contactType?.name}</p>
                            <p className="text-foreground font-medium truncate">{contact.value}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isWhatsApp && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity btn-interactive"
                              asChild
                            >
                              <a 
                                href={`https://wa.me/${contact.value.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Phone className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity btn-interactive"
                            onClick={() => copyToClipboard(contact.value, contactKey)}
                          >
                            {copiedContact === contactKey ? (
                              <Check className="w-4 h-4 text-primary" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No contact info provided</p>
              )}

              {/* Quick Stats */}
              <div className="mt-6 pt-6 border-t border-border space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Members</span>
                  <span className="text-foreground font-medium">{memberCount}/{maxMembers}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Open Spots</span>
                  <span className="text-primary font-medium">{neededRoles.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Server</span>
                  <span className="text-foreground">Asia (India)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="h-16" />
    </Layout>
  );
}
