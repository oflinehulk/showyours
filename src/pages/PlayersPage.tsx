import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { PlayerCard } from '@/components/PlayerCard';
import { RankBadge } from '@/components/RankBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProfiles } from '@/hooks/useProfiles';
import { RANKS, ROLES, HERO_CLASSES, SERVERS } from '@/lib/constants';
import { Search, Filter, Trophy, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'rankings';
type SortOption = 'recent' | 'winrate' | 'rank';

export default function PlayersPage() {
  const { data: profiles, isLoading } = useProfiles();
  const [searchQuery, setSearchQuery] = useState('');
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [serverFilter, setServerFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const filteredPlayers = useMemo(() => {
    let players = [...(profiles || [])];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      players = players.filter(
        (p) =>
          p.ign.toLowerCase().includes(query) ||
          (p.favorite_heroes || []).some((h) => h.toLowerCase().includes(query))
      );
    }

    // Rank filter
    if (rankFilter !== 'all') {
      players = players.filter((p) => p.rank === rankFilter);
    }

    // Role filter
    if (roleFilter !== 'all') {
      players = players.filter((p) => p.main_role === roleFilter);
    }

    // Class filter
    if (classFilter !== 'all') {
      players = players.filter((p) => p.hero_class === classFilter);
    }

    // Server filter
    if (serverFilter !== 'all') {
      players = players.filter((p) => p.server === serverFilter);
    }

    // Sort
    switch (sortBy) {
      case 'winrate':
        players.sort((a, b) => (b.win_rate || 0) - (a.win_rate || 0));
        break;
      case 'rank':
        players.sort((a, b) => {
          const rankA = RANKS.find((r) => r.id === a.rank)?.tier || 0;
          const rankB = RANKS.find((r) => r.id === b.rank)?.tier || 0;
          return rankB - rankA;
        });
        break;
      case 'recent':
      default:
        players.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return players;
  }, [profiles, searchQuery, rankFilter, roleFilter, classFilter, serverFilter, sortBy]);

  const hasActiveFilters =
    rankFilter !== 'all' || roleFilter !== 'all' || classFilter !== 'all' || serverFilter !== 'all';

  const clearFilters = () => {
    setRankFilter('all');
    setRoleFilter('all');
    setClassFilter('all');
    setServerFilter('all');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Find Players</h1>
          <p className="text-muted-foreground">
            Discover talented MLBB players looking for squads
          </p>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name or hero..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* View Toggle & Filter Button */}
          <div className="flex gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'px-4 py-2 flex items-center gap-2 text-sm transition-all duration-200 active:scale-95',
                  viewMode === 'grid'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:text-foreground'
                )}
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                onClick={() => setViewMode('rankings')}
                className={cn(
                  'px-4 py-2 flex items-center gap-2 text-sm transition-all duration-200 active:scale-95',
                  viewMode === 'rankings'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:text-foreground'
                )}
              >
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">Rankings</span>
              </button>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn('btn-interactive', hasActiveFilters && 'border-primary text-primary')}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  !
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="glass-card p-4 mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Filters</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="btn-interactive">
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Select value={rankFilter} onValueChange={setRankFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Rank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ranks</SelectItem>
                  {RANKS.map((rank) => (
                    <SelectItem key={rank.id} value={rank.id}>
                      {rank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {ROLES.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.icon} {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Hero Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {HERO_CLASSES.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.icon} {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={serverFilter} onValueChange={setServerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Server" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Servers</SelectItem>
                  {SERVERS.map((server) => (
                    <SelectItem key={server.id} value={server.id}>
                      {server.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recently Added</SelectItem>
                  <SelectItem value="winrate">Win Rate</SelectItem>
                  <SelectItem value="rank">Rank</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        )}

        {/* Grid View */}
        {!isLoading && viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlayers.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        )}

        {/* Rankings View */}
        {!isLoading && viewMode === 'rankings' && filteredPlayers.length > 0 && (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">#</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Player</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Rank</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Win Rate</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Role</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player, index) => {
                    const role = ROLES.find((r) => r.id === player.main_role);
                    return (
                      <tr
                        key={player.id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-4 text-muted-foreground font-mono">{index + 1}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={player.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${player.ign}`}
                              alt={player.ign}
                              className="w-10 h-10 rounded-lg bg-muted"
                            />
                            <span className="font-semibold text-foreground">{player.ign}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <RankBadge rank={player.rank} size="sm" />
                        </td>
                        <td className="p-4">
                          <span className="text-green-400 font-semibold">{player.win_rate || '—'}%</span>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {role?.icon} {role?.name}
                        </td>
                        <td className="p-4">
                          {player.looking_for_squad ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                              Looking
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">In Squad</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredPlayers.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No players found</h3>
            <p className="text-muted-foreground mb-4">
              {profiles?.length === 0 
                ? "Be the first to create a profile!" 
                : "Try adjusting your filters or search query"}
            </p>
            <Button variant="outline" onClick={clearFilters} className="btn-interactive">
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
