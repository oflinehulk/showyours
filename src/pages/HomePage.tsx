import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PlayerCard } from '@/components/PlayerCard';
import { SquadCard } from '@/components/SquadCard';
import { GamingBackground } from '@/components/GamingBackground';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfiles } from '@/hooks/useProfiles';
import { useSquads } from '@/hooks/useSquads';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Shield, Zap, UserPlus, ChevronRight, Trophy, TrendingUp, Target } from 'lucide-react';

export default function HomePage() {
  const { data: profiles, isLoading: profilesLoading } = useProfiles();
  const { data: squads, isLoading: squadsLoading } = useSquads();

  // Total registered players (all profiles)
  const { data: totalPlayers } = useQuery({
    queryKey: ['total-players-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Squads actively recruiting
  const recruitingSquads = squads?.filter(s => s.is_recruiting).length || 0;

  const featuredPlayers = profiles?.filter(p => p.looking_for_squad).slice(0, 3) || [];
  const featuredSquads = squads?.slice(0, 2) || [];

  return (
    <Layout>
      {/* Hero Section with Gaming Background */}
      <section className="relative overflow-hidden section-glow">
        <GamingBackground />
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6 animate-fade-in">
              <Zap className="w-4 h-4" />
              <span>Mobile Legends Bang Bang Recruitment Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-slide-up">
              Find Your{' '}
              <span className="text-gradient">Perfect Squad</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Recruit players, host tournaments effortlessly.
            </p>
            <p className="text-base text-muted-foreground/70 max-w-2xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: '0.15s' }}>
              India's premier MLBB recruitment platform. Showcase your skills, connect with players from your state, and join squads that match your playstyle.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <Button size="lg" className="btn-gaming text-lg px-8" asChild>
                <Link to="/create-profile">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Create Your Profile
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 btn-interactive" asChild>
                <Link to="/players">
                  Browse Players
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Background decorations */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-[120px] -z-10" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/20 rounded-full blur-[120px] -z-10" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border/50 bg-card/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                {totalPlayers ?? 0}
              </div>
              <div className="text-muted-foreground">Total Players</div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-secondary/10 text-secondary mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                {squads?.length || 0}
              </div>
              <div className="text-muted-foreground">Total Squads</div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 text-accent mb-4">
                <UserPlus className="w-6 h-6" />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                {recruitingSquads}
              </div>
              <div className="text-muted-foreground">Squads Available to Join</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Players */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Featured Players
              </h2>
              <p className="text-muted-foreground">
                Top players looking for their next squad
              </p>
            </div>
            <Button variant="ghost" asChild className="hidden sm:flex btn-interactive">
              <Link to="/players">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>

          {profilesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : featuredPlayers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredPlayers.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 glass-card">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No players yet. Be the first!</p>
              <Button asChild className="btn-gaming">
                <Link to="/create-profile">Create Your Profile</Link>
              </Button>
            </div>
          )}

          <div className="mt-6 text-center sm:hidden">
            <Button variant="outline" asChild className="btn-interactive">
              <Link to="/players">View All Players</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-card/30 section-glow">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              How It Works
            </h2>
            <p className="text-muted-foreground">
              Get started in 3 simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center mx-auto mb-4 glow-primary group-hover:scale-110 transition-transform duration-300">
                <UserPlus className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-foreground mb-2">1. Create Profile</h3>
              <p className="text-sm text-muted-foreground">
                Add your rank, role, favorite heroes, and contact info
              </p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center mx-auto mb-4 glow-secondary group-hover:scale-110 transition-transform duration-300">
                <Target className="w-8 h-8 text-secondary-foreground" />
              </div>
              <h3 className="font-bold text-foreground mb-2">2. Get Discovered</h3>
              <p className="text-sm text-muted-foreground">
                Squads browse profiles and find players that match their needs
              </p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center mx-auto mb-4 glow-accent group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="font-bold text-foreground mb-2">3. Connect & Rank Up</h3>
              <p className="text-sm text-muted-foreground">
                Join your new squad and climb the ranks together
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Squads */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Squads Recruiting
              </h2>
              <p className="text-muted-foreground">
                Teams actively looking for new members
              </p>
            </div>
            <Button variant="ghost" asChild className="hidden sm:flex btn-interactive">
              <Link to="/squads">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>

          {squadsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : featuredSquads.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredSquads.map((squad) => (
                <SquadCard key={squad.id} squad={squad} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 glass-card">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No squads yet. Create the first!</p>
              <Button asChild className="btn-gaming">
                <Link to="/create-squad">Post Your Squad</Link>
              </Button>
            </div>
          )}

          <div className="mt-6 text-center sm:hidden">
            <Button variant="outline" asChild className="btn-interactive">
              <Link to="/squads">View All Squads</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-card/50 to-background">
        <div className="container mx-auto px-4">
          <div className="glass-card p-8 md:p-12 text-center max-w-3xl mx-auto glow-primary">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to Find Your Squad?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Join MLBB players who've already found their perfect teammates. 
              Create your profile now - it's free!
            </p>
            <Button size="lg" className="btn-gaming text-lg px-8" asChild>
              <Link to="/create-profile">
                Get Started Now
                <ChevronRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
