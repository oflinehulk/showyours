import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { TournamentCard } from '@/components/TournamentCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlowCard } from '@/components/tron/GlowCard';
import { CircuitLoader } from '@/components/tron/CircuitLoader';
import { useTournaments } from '@/hooks/useTournaments';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, Trophy, Calendar, Users } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';

export default function TournamentsPage() {
  useSEO({ title: 'Tournaments', description: 'Compete in MLBB tournaments and win prizes.', path: '/tournaments' });
  const { user } = useAuth();
  const { data: tournaments, isLoading } = useTournaments();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');

  const filteredTournaments = useMemo(() => {
    let list = [...(tournaments || [])];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          (t.description || '').toLowerCase().includes(query)
      );
    }

    // Status filter based on tab
    const now = new Date();
    if (activeTab === 'upcoming') {
      list = list.filter(
        (t) =>
          ['registration_open', 'registration_closed', 'bracket_generated'].includes(t.status) &&
          new Date(t.date_time) >= now
      );
      list.sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
    } else if (activeTab === 'ongoing') {
      list = list.filter((t) => t.status === 'ongoing');
    } else if (activeTab === 'completed') {
      list = list.filter((t) => t.status === 'completed');
      list.sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());
    }

    return list;
  }, [tournaments, searchQuery, activeTab]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FF4500]/10 border border-[#FF4500]/20 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-[#FF4500]" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-wide">
                Tournaments
              </h1>
              <p className="text-muted-foreground text-sm">
                Compete in MLBB tournaments and win prizes
              </p>
            </div>
          </div>
          {user && (
            <Button className="btn-gaming" asChild>
              <Link to="/create-tournament">
                <Plus className="w-4 h-4 mr-2" />
                Host Tournament
              </Link>
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search tournaments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <div className="bg-[#111111]/90 border border-[#FF4500]/20 p-1 inline-flex rounded-xl">
            <TabsList className="bg-transparent gap-1">
              <TabsTrigger value="upcoming" className="data-[state=active]:bg-[#FF4500]/10 data-[state=active]:text-[#FF4500] data-[state=active]:border-b-2 data-[state=active]:border-[#FF4500] rounded-lg px-5 font-display text-xs uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Upcoming
              </TabsTrigger>
              <TabsTrigger value="ongoing" className="data-[state=active]:bg-[#FF4500]/10 data-[state=active]:text-[#FF4500] data-[state=active]:border-b-2 data-[state=active]:border-[#FF4500] rounded-lg px-5 font-display text-xs uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4" />
                Ongoing
              </TabsTrigger>
              <TabsTrigger value="completed" className="data-[state=active]:bg-[#FF4500]/10 data-[state=active]:text-[#FF4500] data-[state=active]:border-b-2 data-[state=active]:border-[#FF4500] rounded-lg px-5 font-display text-xs uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Completed
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing <span className="font-display font-bold text-foreground">{filteredTournaments.length}</span> tournament{filteredTournaments.length !== 1 ? 's' : ''}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center min-h-[40vh]">
            <CircuitLoader size="lg" />
          </div>
        )}

        {/* Tournament Grid */}
        {!isLoading && filteredTournaments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                registrationCount={tournament.registrations_count || 0}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredTournaments.length === 0 && (
          <GlowCard className="p-12 max-w-md mx-auto text-center">
            <Trophy className="w-16 h-16 text-[#FF4500] mx-auto mb-4" />
            <h3 className="text-lg font-display font-semibold text-foreground mb-2">No tournaments found</h3>
            <p className="text-muted-foreground text-sm mb-6">
              {tournaments?.length === 0
                ? 'Be the first to host a tournament!'
                : 'Try adjusting your search or filter'}
            </p>
            {user && (
              <Button className="btn-gaming" asChild>
                <Link to="/create-tournament">
                  <Plus className="w-4 h-4 mr-2" />
                  Host Tournament
                </Link>
              </Button>
            )}
          </GlowCard>
        )}
      </div>
    </Layout>
  );
}
