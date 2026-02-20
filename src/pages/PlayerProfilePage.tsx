import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { ProfileCompleteness } from '@/components/ProfileCompleteness';
import { RankBadge } from '@/components/RankBadge';
import { RoleIcon } from '@/components/RoleIcon';
import { HeroClassBadge } from '@/components/HeroClassBadge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { GlowCard } from '@/components/tron/GlowCard';
import { CircuitBackground } from '@/components/tron/CircuitBackground';
import { CircuitLoader } from '@/components/tron/CircuitLoader';
import { useProfile, useMyProfile, useUpdateProfile, useDeleteProfile } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { INDIAN_STATES, CONTACT_TYPES } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { parseContacts } from '@/lib/contacts';
import { InvitationSection } from '@/components/InvitationInbox';
import {
  ArrowLeft,
  MapPin,
  TrendingUp,
  MessageCircle,
  Copy,
  Check,
  Edit,
  Phone,
  Image,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: player, isLoading } = useProfile(id || '');
  const { data: myProfile } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const deleteProfile = useDeleteProfile();
  const [copiedContact, setCopiedContact] = useState<string | null>(null);

  // Check if player is in a squad
  const { data: isInSquad } = useQuery({
    queryKey: ['player-in-squad', player?.user_id],
    queryFn: async () => {
      if (!player) return false;
      const { data } = await supabase
        .from('squad_members')
        .select('id')
        .eq('user_id', player.user_id)
        .limit(1);
      return (data && data.length > 0);
    },
    enabled: !!player,
  });
  const isOwner = user && myProfile && myProfile.id === id;

  const handleToggleLookingForSquad = async () => {
    if (!player || !isOwner) return;
    
    // Prevent enabling "looking for squad" if already in a squad
    if (!player.looking_for_squad && isInSquad) {
      toast.error('You are already in a squad. Leave your current squad first to appear in recruitment listings.');
      return;
    }
    
    try {
      await updateProfile.mutateAsync({
        id: player.id,
        looking_for_squad: !player.looking_for_squad,
      });
      toast.success(player.looking_for_squad 
        ? 'You are now marked as recruited! Your profile is hidden from listings.' 
        : 'You are now visible in the recruitment listings!'
      );
    } catch (error: any) {
      toast.error('Failed to update status', { description: error.message });
    }
  };

  const handleDeleteProfile = async () => {
    if (!player || !isOwner) return;
    
    try {
      await deleteProfile.mutateAsync(player.id);
      toast.success('Profile deleted successfully');
      navigate('/');
    } catch (error: any) {
      toast.error('Failed to delete profile', { description: error.message });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <CircuitLoader size="lg" />
        </div>
      </Layout>
    );
  }

  if (!player) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <GlowCard className="p-12 max-w-md mx-auto text-center">
            <h1 className="text-2xl font-display font-bold text-foreground mb-4">Player not found</h1>
            <Button asChild className="border-[#FF4500]/20 hover:border-[#FF4500]/40" variant="outline">
              <Link to="/players">Back to Players</Link>
            </Button>
          </GlowCard>
        </div>
      </Layout>
    );
  }

  const state = INDIAN_STATES.find((s) => s.id === player.state);
  const contacts = parseContacts(player.contacts);
  const screenshots = player.screenshots || [];

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
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-[#FF4500]/20 via-[#FF4500]/5 to-background overflow-hidden">
        <CircuitBackground intensity="light" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container mx-auto px-4">
        {/* Back button */}
        <div className="mb-4 -mt-8 relative z-10">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link to="/players">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Players
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 -mt-20 md:-mt-24 relative z-10">
          {/* Main Info */}
          <div className="lg:col-span-2">
            {/* Profile Header */}
            <GlowCard className="p-6 mb-6">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* Avatar */}
                <div className="relative">
                  <img
                    src={player.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${player.ign}`}
                    alt={player.ign}
                    className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-muted object-cover border-2 border-[#FF4500]/20"
                  />
                  {player.looking_for_squad && (
                    <span className="absolute -bottom-2 -right-2 px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
                      LFG
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground tracking-wide mb-2">
                    {player.ign}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <RankBadge rank={player.rank} size="md" />
                    <span className="text-muted-foreground">•</span>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {state?.name || 'India'}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {/* Show multiple roles if available */}
                    {((player as any).main_roles?.length > 0 
                      ? (player as any).main_roles 
                      : [player.main_role]
                    ).map((role: string) => (
                      <RoleIcon key={role} role={role} size="md" />
                    ))}
                    <HeroClassBadge heroClass={player.hero_class} size="md" />
                  </div>
                </div>

                {/* Win Rate */}
                <div className="text-center sm:text-right">
                  <div className="flex items-center gap-2 justify-center sm:justify-end mb-1">
                    <TrendingUp className="w-5 h-5 text-[#FF4500]" />
                    <span className="text-3xl font-display font-bold text-[#FF4500]">{player.win_rate || '—'}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                </div>
              </div>

              {/* Owner Controls */}
              {isOwner && (
                <div className="mt-6 pt-6 border-t border-[#FF4500]/10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="lookingForSquad"
                        checked={player.looking_for_squad}
                        onCheckedChange={handleToggleLookingForSquad}
                        disabled={updateProfile.isPending || (!player.looking_for_squad && isInSquad)}
                      />
                      <Label htmlFor="lookingForSquad" className="cursor-pointer">
                        <span className="font-medium">Looking for Squad</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isInSquad && !player.looking_for_squad
                            ? 'Leave your squad first to enable this'
                            : player.looking_for_squad 
                              ? 'Your profile is visible in recruitment listings' 
                              : 'Your profile is hidden (recruited)'}
                        </p>
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="border-[#FF4500]/20 hover:border-[#FF4500]/40" asChild>
                        <Link to="/create-profile">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#111111] border border-[#FF4500]/20">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-display">Delete your profile?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. Your profile will be permanently deleted 
                              and you will no longer appear in the recruitment listings.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-[#FF4500]/20">Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleDeleteProfile}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={deleteProfile.isPending}
                            >
                              {deleteProfile.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : null}
                              Delete Profile
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              )}
            </GlowCard>

            {/* Bio */}
            {player.bio && (
              <GlowCard className="p-6 mb-6">
                <h2 className="text-lg font-display font-semibold text-foreground tracking-wide mb-3">About</h2>
                <p className="text-muted-foreground leading-relaxed">{player.bio}</p>
              </GlowCard>
            )}

            {/* Favorite Heroes */}
            {player.favorite_heroes && player.favorite_heroes.length > 0 && (
              <GlowCard className="p-6 mb-6">
                <h2 className="text-lg font-display font-semibold text-foreground tracking-wide mb-4">Favorite Heroes</h2>
                <div className="flex flex-wrap gap-3">
                  {player.favorite_heroes.map((hero) => (
                    <div
                      key={hero}
                      className="px-4 py-2 bg-[#FF4500]/5 border border-[#FF4500]/20 rounded-lg text-foreground font-medium hover:bg-[#FF4500]/10 transition-colors"
                    >
                      {hero}
                    </div>
                  ))}
                </div>
              </GlowCard>
            )}

            {/* Screenshots */}
            {screenshots.length > 0 && (
              <GlowCard className="p-6">
                <h2 className="text-lg font-display font-semibold text-foreground tracking-wide mb-4 flex items-center gap-2">
                  <Image className="w-5 h-5 text-[#FF4500]" />
                  In-Game Screenshots
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {screenshots.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-video rounded-lg overflow-hidden border border-[#FF4500]/10 hover:border-[#FF4500]/40 transition-colors"
                    >
                      <img src={url} alt={`Screenshot ${index + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </GlowCard>
            )}
          </div>

          {/* Sidebar - Contact Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Invitations - only for owner */}
            {isOwner && <InvitationSection />}
            
            {/* Profile Completeness - only for owner */}
            {isOwner && <ProfileCompleteness profile={player} />}

            <GlowCard className="p-6 sticky top-24">
              <h2 className="text-lg font-display font-semibold text-foreground tracking-wide mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#FF4500]" />
                Contact Info
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
                        className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#FF4500]/10 rounded-lg group"
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
                              className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
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
                            className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(contact.value, contactKey)}
                          >
                            {copiedContact === contactKey ? (
                              <Check className="w-4 h-4 text-[#FF4500]" />
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

              {/* Status */}
              <div className="mt-6 pt-6 border-t border-[#FF4500]/10">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {player.looking_for_squad ? (
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-[#FF4500]">
                      <span className="w-2 h-2 rounded-full bg-[#FF4500] animate-pulse" />
                      Looking for Squad
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">In a Squad</span>
                  )}
                </div>
              </div>
            </GlowCard>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="h-16" />
    </Layout>
  );
}
