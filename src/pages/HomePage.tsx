import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PlayerCard } from '@/components/PlayerCard';
import { SquadCard } from '@/components/SquadCard';
import { Button } from '@/components/ui/button';
import { mockPlayers, mockSquads, mockStats } from '@/lib/mockData';
import { Users, Shield, Zap, UserPlus, ChevronRight, Trophy, TrendingUp, Target } from 'lucide-react';
export default function HomePage() {
  const featuredPlayers = mockPlayers.filter(p => p.lookingForSquad).slice(0, 3);
  const featuredSquads = mockSquads.slice(0, 2);
  return <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden section-glow">
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
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in" style={{
            animationDelay: '0.1s'
          }}>Showcase your skills, connect with players, and join squads that match your playstyle. Built by a MLBB player, for MLBB players.</p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{
            animationDelay: '0.2s'
          }}>
              <Button size="lg" className="btn-gaming text-lg px-8" asChild>
                <Link to="/create-profile">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Create Your Profile
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8" asChild>
                <Link to="/players">
                  Browse Players
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Background decorations */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-[120px] -z-10" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] -z-10" />
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
                {mockStats.totalPlayers.toLocaleString()}+
              </div>
              <div className="text-muted-foreground">Players Registered</div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-secondary/10 text-secondary mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                {mockStats.activeSquads}+
              </div>
              <div className="text-muted-foreground">Active Squads</div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 text-accent mb-4">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                {mockStats.matchesMade}+
              </div>
              <div className="text-muted-foreground">Connections Made</div>
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
            <Button variant="ghost" asChild className="hidden sm:flex">
              <Link to="/players">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredPlayers.map(player => <PlayerCard key={player.id} player={player} />)}
          </div>

          <div className="mt-6 text-center sm:hidden">
            <Button variant="outline" asChild>
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
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center mx-auto mb-4 glow-primary">
                <UserPlus className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-foreground mb-2">1. Create Profile</h3>
              <p className="text-sm text-muted-foreground">
                Add your rank, role, favorite heroes, and contact info
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center mx-auto mb-4 glow-secondary">
                <Target className="w-8 h-8 text-secondary-foreground" />
              </div>
              <h3 className="font-bold text-foreground mb-2">2. Get Discovered</h3>
              <p className="text-sm text-muted-foreground">
                Squads browse profiles and find players that match their needs
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center mx-auto mb-4 glow-accent">
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
            <Button variant="ghost" asChild className="hidden sm:flex">
              <Link to="/squads">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredSquads.map(squad => <SquadCard key={squad.id} squad={squad} />)}
          </div>

          <div className="mt-6 text-center sm:hidden">
            <Button variant="outline" asChild>
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
              Join thousands of MLBB players who've already found their perfect teammates. 
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
    </Layout>;
}