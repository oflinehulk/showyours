import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { PlayerCard } from '@/components/PlayerCard';
import { RankBadge } from '@/components/RankBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GlowCard } from '@/components/tron/GlowCard';
import { CircuitLoader } from '@/components/tron/CircuitLoader';
import { useProfiles } from '@/hooks/useProfiles';
import { RANKS, ROLES, HERO_CLASSES, INDIAN_STATES } from '@/lib/constants';
import { getContactValue } from '@/lib/contacts';
import { Search, Filter, Trophy, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSEO } from '@/hooks/useSEO';

type ViewMode = 'grid' | 'rankings';
type SortOption = 'recent' | 'winrate' | 'rank';

export default function PlayersPage() {
  useSEO({ title: 'Find Players', description: 'Browse MLBB players open for recruitment. Filter by rank, role, and state.', path: '/players' });
  const { data: profiles, isLoading } = useProfiles();
  const [searchQuery, setSearchQuery] = useState('');
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);

  const filteredPlayers = useMemo(() => {
    let players = [...(profiles || [])];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      players = players.filter(
        (p) =>
          p.ign.toLowerCase().includes(query) ||
          (p.favorite_heroes || []).some((h) => h.toLowerCase().includes(query)) ||
          (getContactValue(p.contacts, 'whatsapp') || '').includes(searchQuery)
      );
    }

    // Rank filter
    if (rankFilter !== 'all') {
      players = players.filter((p) => p.rank === rankFilter);
    }

    // Role filter — check main_roles array first, fall back to main_role
    if (roleFilter !== 'all') {
      players = players.filter((p) => {
        const roles = p.main_roles;
        if (roles && roles.length > 0) {
          return roles.includes(roleFilter);
        }
        return p.main_role === roleFilter;
      });
    }

    // Class filter
    if (classFilter !== 'all') {
      players = players.filter((p) => p.hero_class === classFilter);
    }

    // State filter
    if (stateFilter !== 'all') {
      players = players.filter((p) => p.state === stateFilter);
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
  }, [profiles, searchQuery, rankFilter, roleFilter, classFilter, stateFilter, sortBy]);

  const hasActiveFilters =
    rankFilter !== 'all' || roleFilter !== 'all' || classFilter !== 'all' || stateFilter !== 'all';

  const clearFilters = () => {
    setRankFilter('all');
    setRoleFilter('all');
    setClassFilter('all');
    setStateFilter('all');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-[#FF4500]/10 border border-[#FF4500]/20 flex items-center justify-center">
            <Users className="h-5 w-5 text-[#FF4500]" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-wide">Find Players</h1>
            <p className="text-muted-foreground text-sm">
              Browse registered players open for recruitment
            </p>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, hero, or WhatsApp number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
            />
          </div>

          {/* View Toggle & Filter Button */}
          <div className="flex gap-2">
            <div className="flex rounded-lg border border-[#FF4500]/20 overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'px-4 py-2 flex items-center gap-2 text-sm font-display uppercase tracking-wider transition-all duration-200 active:scale-95',
                  viewMode === 'grid'
                    ? 'bg-[#FF4500] text-white'
                    : 'bg-[#0a0a0a] text-muted-foreground hover:text-foreground'
                )}
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                onClick={() => setViewMode('rankings')}
                className={cn(
                  'px-4 py-2 flex items-center gap-2 text-sm font-display uppercase tracking-wider transition-all duration-200 active:scale-95',
                  viewMode === 'rankings'
                    ? 'bg-[#FF4500] text-white'
                    : 'bg-[#0a0a0a] text-muted-foreground hover:text-foreground'
                )}
              >
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">Rankings</span>
              </button>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn('border-[#FF4500]/20 hover:border-[#FF4500]/40', hasActiveFilters && 'border-[#FF4500] text-[#FF4500]')}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 w-5 h-5 rounded-full bg-[#FF4500] text-white text-xs flex items-center justify-center">
                  !
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <GlowCard className="p-4 mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-foreground tracking-wide">Filters</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Select value={rankFilter} onValueChange={setRankFilter}>
                <SelectTrigger className="bg-[#0a0a0a] border-[#FF4500]/20">
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
                <SelectTrigger className="bg-[#0a0a0a] border-[#FF4500]/20">
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
                <SelectTrigger className="bg-[#0a0a0a] border-[#FF4500]/20">
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

              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="bg-[#0a0a0a] border-[#FF4500]/20">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {INDIAN_STATES.map((state) => (
                    <SelectItem key={state.id} value={state.id}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="bg-[#0a0a0a] border-[#FF4500]/20">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recently Added</SelectItem>
                  <SelectItem value="winrate">Win Rate</SelectItem>
                  <SelectItem value="rank">Rank</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </GlowCard>
        )}

        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing <span className="font-display font-bold text-foreground">{filteredPlayers.length}</span> player{filteredPlayers.length !== 1 ? 's' : ''}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center min-h-[40vh]">
            <CircuitLoader size="lg" />
          </div>
        )}

        {/* Grid View */}
        {!isLoading && viewMode === 'grid' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlayers.slice(0, visibleCount).map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </div>
            {visibleCount < filteredPlayers.length && (
              <div className="flex justify-center mt-8">
                <Button variant="outline" onClick={() => setVisibleCount((c) => c + 30)} className="border-[#FF4500]/20 hover:border-[#FF4500]/40">
                  Load More ({filteredPlayers.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </>
        )}

        {/* Rankings View */}
        {!isLoading && viewMode === 'rankings' && filteredPlayers.length > 0 && (
          <GlowCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#FF4500]/10">
                    <th className="text-left p-4 text-[#FF4500]/70 font-display text-xs uppercase tracking-wider">#</th>
                    <th className="text-left p-4 text-[#FF4500]/70 font-display text-xs uppercase tracking-wider">Player</th>
                    <th className="text-left p-4 text-[#FF4500]/70 font-display text-xs uppercase tracking-wider">Rank</th>
                    <th className="text-left p-4 text-[#FF4500]/70 font-display text-xs uppercase tracking-wider">Win Rate</th>
                    <th className="text-left p-4 text-[#FF4500]/70 font-display text-xs uppercase tracking-wider">Role</th>
                    <th className="text-left p-4 text-[#FF4500]/70 font-display text-xs uppercase tracking-wider">State</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player, index) => {
                    const mainRoles = player.main_roles && player.main_roles.length > 0
                      ? player.main_roles
                      : [player.main_role];
                    const roleDisplay = mainRoles.map((roleId: string) => {
                      const role = ROLES.find((r) => r.id === roleId);
                      return role ? `${role.icon} ${role.name}` : roleId;
                    }).join(', ');
                    const state = INDIAN_STATES.find((s) => s.id === player.state);
                    return (
                      <tr
                        key={player.id}
                        className="border-b border-[#FF4500]/5 hover:bg-[#FF4500]/5 transition-colors"
                      >
                        <td className="p-4 text-muted-foreground font-display">{index + 1}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={player.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${player.ign}`}
                              alt={player.ign}
                              loading="lazy"
                              className="w-10 h-10 rounded-lg bg-muted object-cover border border-[#FF4500]/10"
                            />
                            <span className="font-semibold text-foreground">{player.ign}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <RankBadge rank={player.rank} size="sm" />
                        </td>
                        <td className="p-4">
                          <span className="text-[#FF4500] font-display font-semibold">{player.win_rate != null ? `${player.win_rate}%` : '—'}</span>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {roleDisplay}
                        </td>
                        <td className="p-4 text-muted-foreground text-sm">
                          {state?.name || 'India'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlowCard>
        )}

        {/* Empty state */}
        {!isLoading && filteredPlayers.length === 0 && (
          <GlowCard className="p-12 max-w-md mx-auto text-center">
            <Users className="w-16 h-16 text-[#FF4500] mx-auto mb-4" />
            <h3 className="text-lg font-display font-semibold text-foreground mb-2">No players found</h3>
            <p className="text-muted-foreground text-sm mb-6">
              {profiles?.length === 0
                ? "Be the first to create a profile!"
                : "Try adjusting your filters or search query"}
            </p>
            <Button variant="outline" onClick={clearFilters} className="border-[#FF4500]/20 hover:border-[#FF4500]/40">
              Clear Filters
            </Button>
          </GlowCard>
        )}
      </div>
    </Layout>
  );
}
