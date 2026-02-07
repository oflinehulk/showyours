import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { RankBadge } from '@/components/RankBadge';
import { RoleIcon } from '@/components/RoleIcon';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSquad, useMySquads, useUpdateSquad } from '@/hooks/useSquads';
import { useAuth } from '@/contexts/AuthContext';
import { CONTACT_TYPES } from '@/lib/constants';
import { 
  ArrowLeft, 
  MapPin, 
  Users,
  MessageCircle,
  Copy,
  Check,
  Edit,
  Phone,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function SquadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: squad, isLoading } = useSquad(id || '');
  const { data: mySquads } = useMySquads();
  const updateSquad = useUpdateSquad();
  const [copiedContact, setCopiedContact] = useState<string | null>(null);

  const isOwner = user && mySquads && mySquads.some(s => s.id === id);

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

  const contacts = typeof squad.contacts === 'string' 
    ? JSON.parse(squad.contacts) 
    : squad.contacts || [];
  const neededRoles = squad.needed_roles || [];
  const maxMembers = squad.max_members || 5;

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
                      <span>{squad.member_count}/{maxMembers} members</span>
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
                    <Button variant="outline" size="sm" className="btn-interactive" asChild>
                      <Link to="/create-squad">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Squad
                      </Link>
                    </Button>
                  </div>
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
                  <span className="text-foreground font-medium">{squad.member_count}/{maxMembers}</span>
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
