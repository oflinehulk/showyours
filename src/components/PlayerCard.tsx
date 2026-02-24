import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { RankBadge } from './RankBadge';
import { RoleIcon } from './RoleIcon';
import { HeroClassBadge } from './HeroClassBadge';
import { SquadInviteButton } from './SquadInviteButton';
import { GlowCard } from '@/components/tron/GlowCard';
import type { Profile } from '@/lib/types';
import { TrendingUp, MapPin } from 'lucide-react';
import { INDIAN_STATES } from '@/lib/constants';

interface PlayerCardProps {
  player: Profile;
  className?: string;
}

export function PlayerCard({ player, className }: PlayerCardProps) {
  const state = INDIAN_STATES.find(s => s.id === player.state);

  return (
    <Link
      to={`/player/${player.id}`}
      className={cn('block group', className)}
    >
      <GlowCard hoverable className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative">
            <img
              src={player.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${player.ign}`}
              alt={player.ign}
              loading="lazy"
              className="w-16 h-16 rounded-lg bg-muted object-cover border border-[#FF4500]/10"
            />
            {player.looking_for_squad && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#111111] animate-pulse" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-foreground tracking-wide truncate group-hover:text-[#FF4500] transition-colors">
              {player.ign}
            </h3>

            <div className="mt-1">
              <RankBadge rank={player.rank} size="sm" />
            </div>

            <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
              {/* Show multiple roles if available */}
              {(player.main_roles && player.main_roles.length > 0
                ? player.main_roles.slice(0, 2)
                : [player.main_role]
              ).map((role: string, idx: number) => (
                <RoleIcon key={role} role={role} size="sm" showName={idx === 0} />
              ))}
              <span className="text-muted-foreground">•</span>
              <HeroClassBadge heroClass={player.hero_class} size="sm" showName={false} />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#FF4500]/10">
          <div className="flex items-center gap-1 text-sm">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-foreground font-display font-medium">{player.win_rate || '—'}%</span>
            <span className="text-muted-foreground">WR</span>
          </div>

          <div className="flex items-center gap-2">
            <SquadInviteButton player={player} />
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{state?.name || 'India'}</span>
            </div>
          </div>
        </div>

        {/* Favorite heroes preview */}
        {player.favorite_heroes && player.favorite_heroes.length > 0 && (
          <div className="flex gap-1 mt-3 flex-wrap">
            {player.favorite_heroes.slice(0, 3).map((hero) => (
              <span
                key={hero}
                className="text-xs px-2 py-0.5 bg-[#FF4500]/10 text-[#FF4500] rounded border border-[#FF4500]/20"
              >
                {hero}
              </span>
            ))}
          </div>
        )}
      </GlowCard>
    </Link>
  );
}
