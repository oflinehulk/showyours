import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { RankBadge } from '@/components/RankBadge';
import { RoleIcon } from '@/components/RoleIcon';
import { HeroClassBadge } from '@/components/HeroClassBadge';
import { Button } from '@/components/ui/button';
import { mockPlayers } from '@/lib/mockData';
import { SERVERS, CONTACT_TYPES } from '@/lib/constants';
import { 
  ArrowLeft, 
  MapPin, 
  TrendingUp, 
  MessageCircle,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { useState } from 'react';

export default function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [copiedContact, setCopiedContact] = useState<string | null>(null);
  
  const player = mockPlayers.find((p) => p.id === id);

  if (!player) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Player not found</h1>
          <Button asChild>
            <Link to="/players">Back to Players</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const server = SERVERS.find((s) => s.id === player.server);

  const copyToClipboard = (text: string, contactId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedContact(contactId);
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
      default:
        return '📱';
    }
  };

  return (
    <Layout>
      {/* Hero Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/20 via-secondary/10 to-background overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container mx-auto px-4">
        {/* Back button */}
        <div className="mb-4 -mt-8 relative z-10">
          <Button variant="ghost" size="sm" asChild>
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
            <div className="glass-card p-6 mb-6">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* Avatar */}
                <div className="relative">
                  <img
                    src={player.avatar}
                    alt={player.ign}
                    className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-muted object-cover glow-primary"
                  />
                  {player.lookingForSquad && (
                    <span className="absolute -bottom-2 -right-2 px-3 py-1 text-xs font-semibold bg-green-500 text-white rounded-full">
                      LFG
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    {player.ign}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <RankBadge rank={player.rank} size="md" />
                    <span className="text-muted-foreground">•</span>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {server?.name}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <RoleIcon role={player.mainRole} size="md" />
                    <HeroClassBadge heroClass={player.heroClass} size="md" />
                  </div>
                </div>

                {/* Win Rate */}
                <div className="text-center sm:text-right">
                  <div className="flex items-center gap-2 justify-center sm:justify-end mb-1">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <span className="text-3xl font-bold text-green-400">{player.winRate}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="glass-card p-6 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-3">About</h2>
              <p className="text-muted-foreground leading-relaxed">{player.bio}</p>
            </div>

            {/* Favorite Heroes */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Favorite Heroes</h2>
              <div className="flex flex-wrap gap-3">
                {player.favoriteHeroes.map((hero) => (
                  <div
                    key={hero}
                    className="px-4 py-2 bg-muted rounded-lg text-foreground font-medium hover:bg-muted/80 transition-colors"
                  >
                    {hero}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - Contact Info */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                Contact Info
              </h2>

              {player.contacts.length > 0 ? (
                <div className="space-y-3">
                  {player.contacts.map((contact, index) => {
                    const contactType = CONTACT_TYPES.find((c) => c.id === contact.type);
                    const contactKey = `${contact.type}-${index}`;
                    
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => copyToClipboard(contact.value, contactKey)}
                        >
                          {copiedContact === contactKey ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No contact info provided</p>
              )}

              {/* Status */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {player.lookingForSquad ? (
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-green-400">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      Looking for Squad
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">In a Squad</span>
                  )}
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
