import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { RankBadge } from './RankBadge';
import { RoleIcon } from './RoleIcon';
import { GlowCard } from '@/components/tron/GlowCard';
import type { Squad } from '@/lib/types';
import { Users, MapPin } from 'lucide-react';

interface SquadCardProps {
  squad: Squad;
  className?: string;
}

export function SquadCard({ squad, className }: SquadCardProps) {
  const neededRoles = squad.needed_roles || [];
  const maxMembers = squad.max_members || 5;

  return (
    <Link
      to={`/squad/${squad.id}`}
      className={cn('block group', className)}
    >
      <GlowCard hoverable className="p-4">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <img
            src={squad.logo_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${squad.name}`}
            alt={squad.name}
            loading="lazy"
            className="w-16 h-16 rounded-lg bg-muted object-cover border border-[#FF4500]/10"
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-foreground tracking-wide truncate group-hover:text-[#FF4500] transition-colors">
              {squad.name}
            </h3>

            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="font-display font-medium">{squad.member_count}/{maxMembers} members</span>
            </div>

            <div className="mt-2">
              <RankBadge rank={squad.min_rank} size="sm" />
            </div>
          </div>
        </div>

        {/* Description */}
        {squad.description && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
            {squad.description}
          </p>
        )}

        {/* Needed roles */}
        {neededRoles.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#FF4500]/10">
            <p className="text-xs text-muted-foreground mb-2">Looking for:</p>
            <div className="flex flex-wrap gap-2">
              {neededRoles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-[#FF4500]/10 text-[#FF4500] rounded-md border border-[#FF4500]/20"
                >
                  <RoleIcon role={role} size="sm" showName={false} />
                  <span className="capitalize">{role}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Server */}
        <div className="flex items-center gap-1 mt-3 text-sm text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>Asia Server</span>
        </div>
      </GlowCard>
    </Link>
  );
}
