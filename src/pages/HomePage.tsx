import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PlayerCard } from '@/components/PlayerCard';
import { SquadCard } from '@/components/SquadCard';
import { CircuitBackground } from '@/components/tron/CircuitBackground';
import { GlowCard } from '@/components/tron/GlowCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfiles } from '@/hooks/useProfiles';
import { useSquads } from '@/hooks/useSquads';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Shield, Zap, UserPlus, ChevronRight, Trophy, TrendingUp, Target } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';

export default function HomePage() {
  useSEO({ title: 'ShowYours', description: 'MLBB recruitment platform — find players, build squads, host tournaments effortlessly.', path: '/' });
  const { data: profiles, isLoading: profilesLoading } = useProfiles();
  const { data: squads, isLoading: squadsLoading } = useSquads();

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

  const recruitingSquads = squads?.filter(s => s.is_recruiting).length || 0;
  const featuredPlayers = profiles?.filter(p => p.looking_for_squad).slice(0, 3) || [];
  const featuredSquads = squads?.slice(0, 2) || [];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[80vh] flex items-center">
        <CircuitBackground intensity="medium" />
        {/* Radial glow accents */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#FF4500]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#FF2D00]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/20 text-[#FF4500] text-sm font-semibold mb-6 animate-fade-in tracking-wide">
              <Zap className="w-4 h-4" />
              <span>MLBB Esports Platform</span>
            </div>

            {/* Tagline */}
            <div className="mb-6 animate-slide-up">
              <p className="font-display text-[#FF4500] text-sm md:text-base tracking-[0.3em] uppercase mb-4 text-neon-subtle">
                DOMINATE &middot; ORGANIZE &middot; CONQUER
              </p>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-6 animate-slide-up tracking-wide">
              Find Your{' '}
              <span className="text-gradient">Perfect Teammate</span>
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
              <Button size="lg" className="btn-gaming text-lg px-8 font-display" asChild>
                <Link to="/create-profile">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Create Your Profile
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 btn-interactive border-[#FF4500]/30 hover:border-[#FF4500]/50 hover:bg-[#FF4500]/5" asChild>
                <Link to="/players">
                  Browse Players
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-[#FF4500]/10 bg-[#0a0a0a] relative">
        <div className="absolute inset-0 circuit-bg opacity-50" />
        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Users, value: totalPlayers ?? 0, label: 'Total Players', color: 'primary' as const },
              { icon: Shield, value: squads?.length || 0, label: 'Total Squads', color: 'secondary' as const },
              { icon: UserPlus, value: recruitingSquads, label: 'Squads Available', color: 'accent' as const },
            ].map((stat) => (
              <GlowCard key={stat.label} glowColor={stat.color} hoverable className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#FF4500]/10 border border-[#FF4500]/20 text-[#FF4500] mb-4">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-3xl md:text-4xl font-display font-bold text-foreground mb-1">
                  {stat.value}
                </div>
                <div className="text-muted-foreground text-sm">{stat.label}</div>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Players */}
      <section className="py-16 md:py-24 relative">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2 tracking-wide">
                Featured Players
              </h2>
              <p className="text-muted-foreground">
                Top players looking for their next squad
              </p>
            </div>
            <Button variant="ghost" asChild className="hidden sm:flex btn-interactive text-[#FF4500] hover:text-[#FF6B35] hover:bg-[#FF4500]/5">
              <Link to="/players">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>

          {profilesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 rounded-lg bg-[#111111]" />
              ))}
            </div>
          ) : featuredPlayers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredPlayers.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </div>
          ) : (
            <GlowCard className="text-center py-12 px-6">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No players yet. Be the first!</p>
              <Button asChild className="btn-gaming">
                <Link to="/create-profile">Create Your Profile</Link>
              </Button>
            </GlowCard>
          )}

          <div className="mt-6 text-center sm:hidden">
            <Button variant="outline" asChild className="btn-interactive border-[#FF4500]/30 hover:border-[#FF4500]/50">
              <Link to="/players">View All Players</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 relative">
        <div className="absolute inset-0 bg-[#111111]/50" />
        <CircuitBackground intensity="light" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2 tracking-wide">
              How It Works
            </h2>
            <p className="text-muted-foreground">
              Get started in 3 simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-8 left-[20%] right-[20%] h-px bg-gradient-to-r from-[#FF4500]/30 via-[#FF4500]/50 to-[#FF4500]/30" />

            {[
              { icon: UserPlus, title: '1. Create Profile', desc: 'Add your rank, role, favorite heroes, and contact info' },
              { icon: Target, title: '2. Get Discovered', desc: 'Squads browse profiles and find players that match their needs' },
              { icon: TrendingUp, title: '3. Connect & Rank Up', desc: 'Join your new squad and climb the ranks together' },
            ].map((step) => (
              <div key={step.title} className="text-center group relative z-10">
                <div className="w-16 h-16 rounded-lg bg-[#111111] border border-[#FF4500]/30 flex items-center justify-center mx-auto mb-4 group-hover:border-[#FF4500]/60 group-hover:shadow-[0_0_15px_rgba(255,69,0,0.3)] transition-all duration-300">
                  <step.icon className="w-8 h-8 text-[#FF4500]" />
                </div>
                <h3 className="font-display font-bold text-foreground mb-2 tracking-wide">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Squads */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2 tracking-wide">
                Squads Recruiting
              </h2>
              <p className="text-muted-foreground">
                Teams actively looking for new members
              </p>
            </div>
            <Button variant="ghost" asChild className="hidden sm:flex btn-interactive text-[#FF4500] hover:text-[#FF6B35] hover:bg-[#FF4500]/5">
              <Link to="/squads">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>

          {squadsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-48 rounded-lg bg-[#111111]" />
              ))}
            </div>
          ) : featuredSquads.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredSquads.map((squad) => (
                <SquadCard key={squad.id} squad={squad} />
              ))}
            </div>
          ) : (
            <GlowCard className="text-center py-12 px-6">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No squads yet. Create the first!</p>
              <Button asChild className="btn-gaming">
                <Link to="/create-squad">Post Your Squad</Link>
              </Button>
            </GlowCard>
          )}

          <div className="mt-6 text-center sm:hidden">
            <Button variant="outline" asChild className="btn-interactive border-[#FF4500]/30 hover:border-[#FF4500]/50">
              <Link to="/squads">View All Squads</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 relative">
        <CircuitBackground intensity="light" />
        <div className="container mx-auto px-4 relative z-10">
          <GlowCard className="p-8 md:p-12 text-center max-w-3xl mx-auto animate-neon-pulse">
            <Trophy className="w-10 h-10 text-[#FF4500] mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4 tracking-wide">
              Ready to Find Your Squad?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Join MLBB players who've already found their perfect teammates.
              Create your profile now — it's free!
            </p>
            <Button size="lg" className="btn-gaming text-lg px-8 font-display" asChild>
              <Link to="/create-profile">
                Get Started Now
                <ChevronRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </GlowCard>
        </div>
      </section>
    </Layout>
  );
}
