import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useSearchProfiles, type SearchedProfile } from '@/hooks/useSquadMembers';
import { RankBadge } from '@/components/RankBadge';
import { RoleIcon } from '@/components/RoleIcon';
import { Search, Loader2, User, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerSearchProps {
  onSelect: (profile: SearchedProfile) => void;
  excludeSquadId?: string;
  excludeUserIds?: string[];
  placeholder?: string;
  disabled?: boolean;
  forTournament?: boolean; // true = search all registered players for tournaments
  addToSquad?: boolean; // true = search all registered players for squad building
}

export function PlayerSearch({
  onSelect,
  excludeSquadId,
  excludeUserIds = [],
  placeholder = 'Search by IGN, MLBB ID, or WhatsApp...',
  disabled = false,
  forTournament = false,
  addToSquad = false,
}: PlayerSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: results, isLoading } = useSearchProfiles(searchTerm, excludeSquadId, forTournament, addToSquad);

  // Filter out excluded users
  const filteredResults = results?.filter(
    (profile) => !excludeUserIds.includes(profile.user_id)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (profile: SearchedProfile) => {
    onSelect(profile);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10"
          disabled={disabled}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && searchTerm.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
          {filteredResults && filteredResults.length > 0 ? (
            <div className="max-h-64 overflow-y-auto">
              {filteredResults.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => handleSelect(profile)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">
                        {profile.ign}
                      </span>
                      {profile.mlbb_id && (
                        <span className="text-xs text-muted-foreground">
                          #{profile.mlbb_id}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <RankBadge rank={profile.rank} size="sm" showName={false} />
                      <RoleIcon role={profile.main_role} size="sm" showName={false} />
                    </div>
                  </div>
                  <UserPlus className="w-4 h-4 text-primary shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching...</span>
                </div>
              ) : (
                <div>
                  <p className="text-sm">No players found</p>
                  <p className="text-xs mt-1">
                    Players must be registered on the platform
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
