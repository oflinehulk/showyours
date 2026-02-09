import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { SquadCard } from '@/components/SquadCard';
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
import { useSquads } from '@/hooks/useSquads';
import { RANKS, ROLES } from '@/lib/constants';
import { Search, Filter, Shield, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export default function SquadsPage() {
  const { data: squads, isLoading } = useSquads();
  const [searchQuery, setSearchQuery] = useState('');
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredSquads = useMemo(() => {
    let squadList = [...(squads || [])];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      squadList = squadList.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          (s.description || '').toLowerCase().includes(query)
      );
    }

    // Rank filter (shows squads with minRank at or below selected)
    if (rankFilter !== 'all') {
      const selectedRankTier = RANKS.find((r) => r.id === rankFilter)?.tier || 0;
      squadList = squadList.filter((s) => {
        const squadMinTier = RANKS.find((r) => r.id === s.min_rank)?.tier || 0;
        return squadMinTier <= selectedRankTier;
      });
    }

    // Role filter (shows squads needing that role)
    if (roleFilter !== 'all') {
      squadList = squadList.filter((s) => (s.needed_roles || []).includes(roleFilter as any));
    }

    // Sort by most recent
    squadList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return squadList;
  }, [squads, searchQuery, rankFilter, roleFilter]);

  const hasActiveFilters = rankFilter !== 'all' || roleFilter !== 'all';

  const clearFilters = () => {
    setRankFilter('all');
    setRoleFilter('all');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Find Squads</h1>
            <p className="text-muted-foreground">
              Looking for a team? Browse squads actively recruiting new members.
            </p>
          </div>
          <Button className="btn-gaming" asChild>
            <Link to="/create-squad">
              <Plus className="w-4 h-4 mr-2" />
              Create Squad
            </Link>
          </Button>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search squads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select value={rankFilter} onValueChange={setRankFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Your Rank" />
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
                  <SelectValue placeholder="Looking for Role" />
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
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredSquads.length} squad{filteredSquads.length !== 1 ? 's' : ''}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        )}

        {/* Squad Grid */}
        {!isLoading && filteredSquads.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSquads.map((squad) => (
              <SquadCard key={squad.id} squad={squad} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredSquads.length === 0 && (
          <div className="text-center py-16">
            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No squads found</h3>
            <p className="text-muted-foreground mb-4">
              {squads?.length === 0 
                ? "Be the first to create a squad!" 
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
