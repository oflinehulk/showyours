import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { SquadCard } from '@/components/SquadCard';
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
import { useSquads } from '@/hooks/useSquads';
import { RANKS, ROLES } from '@/lib/constants';
import { Search, Filter, Shield, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';

export default function SquadsPage() {
  useSEO({ title: 'Find Squads', description: 'Browse MLBB squads actively recruiting new members.', path: '/squads' });
  const { data: squads, isLoading } = useSquads();
  const [searchQuery, setSearchQuery] = useState('');
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { recruitingSquads, otherSquads } = useMemo(() => {
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
      squadList = squadList.filter((s) => (s.needed_roles || []).includes(roleFilter));
    }

    // Sort by most recent
    squadList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const recruiting = squadList.filter((s) => s.is_recruiting);
    const other = squadList.filter((s) => !s.is_recruiting);

    return { recruitingSquads: recruiting, otherSquads: other };
  }, [squads, searchQuery, rankFilter, roleFilter]);

  const totalFiltered = recruitingSquads.length + otherSquads.length;

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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FF4500]/10 border border-[#FF4500]/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-[#FF4500]" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-wide">Find Squads</h1>
              <p className="text-muted-foreground text-sm">
                Browse squads actively recruiting new members
              </p>
            </div>
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
              className="pl-10 bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
            />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select value={rankFilter} onValueChange={setRankFilter}>
                <SelectTrigger className="bg-[#0a0a0a] border-[#FF4500]/20">
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
                <SelectTrigger className="bg-[#0a0a0a] border-[#FF4500]/20">
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
          </GlowCard>
        )}

        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing <span className="font-display font-bold text-foreground">{totalFiltered}</span> squad{totalFiltered !== 1 ? 's' : ''}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center min-h-[40vh]">
            <CircuitLoader size="lg" />
          </div>
        )}

        {/* Looking for Members */}
        {!isLoading && recruitingSquads.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2 tracking-wide">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Looking for Members
              <span className="text-sm font-normal text-muted-foreground">({recruitingSquads.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recruitingSquads.map((squad) => (
                <SquadCard key={squad.id} squad={squad} />
              ))}
            </div>
          </div>
        )}

        {/* Not Recruiting / Full Squads */}
        {!isLoading && otherSquads.length > 0 && (
          <div>
            <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2 tracking-wide">
              <span className="w-2 h-2 rounded-full bg-muted-foreground" />
              Not Recruiting
              <span className="text-sm font-normal text-muted-foreground">({otherSquads.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {otherSquads.map((squad) => (
                <SquadCard key={squad.id} squad={squad} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && totalFiltered === 0 && (
          <GlowCard className="p-12 max-w-md mx-auto text-center">
            <Shield className="w-16 h-16 text-[#FF4500] mx-auto mb-4" />
            <h3 className="text-lg font-display font-semibold text-foreground mb-2">No squads found</h3>
            <p className="text-muted-foreground text-sm mb-6">
              {squads?.length === 0
                ? "Be the first to create a squad!"
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
