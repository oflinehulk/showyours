import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { TournamentCard } from '@/components/TournamentCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTournaments } from '@/hooks/useTournaments';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, Trophy, Calendar, Users } from 'lucide-react';

export default function TournamentsPage() {
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
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-secondary" />
              Tournaments
            </h1>
            <p className="text-muted-foreground">
              Compete in MLBB tournaments and win prizes
            </p>
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
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="ongoing" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Ongoing
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Completed
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredTournaments.length} tournament{filteredTournaments.length !== 1 ? 's' : ''}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-72 rounded-lg" />
            ))}
          </div>
        )}

        {/* Tournament Grid */}
        {!isLoading && filteredTournaments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredTournaments.length === 0 && (
          <div className="text-center py-16">
            <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No tournaments found</h3>
            <p className="text-muted-foreground mb-4">
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
          </div>
        )}
      </div>
    </Layout>
  );
}
