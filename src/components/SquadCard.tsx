import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { RankBadge } from './RankBadge';
import { RoleIcon } from './RoleIcon';
import type { Squad } from '@/lib/mockData';
import { Users, MapPin } from 'lucide-react';
import { SERVERS } from '@/lib/constants';

interface SquadCardProps {
  squad: Squad;
  className?: string;
}

export function SquadCard({ squad, className }: SquadCardProps) {
  const server = SERVERS.find(s => s.id === squad.server);

  return (
    <Link
      to={`/squad/${squad.id}`}
      className={cn(
        'glass-card p-4 hover-glow block group',
        className
      )}
    >
      <div className="flex items-start gap-4">
        {/* Logo */}
        <img
          src={squad.logo}
          alt={squad.name}
          className="w-16 h-16 rounded-lg bg-muted object-cover"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
            {squad.name}
          </h3>
          
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{squad.memberCount}/5 members</span>
          </div>

          <div className="mt-2">
            <RankBadge rank={squad.minRank} size="sm" />
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
        {squad.description}
      </p>

      {/* Needed roles */}
      <div className="mt-4 pt-3 border-t border-border/50">
        <p className="text-xs text-muted-foreground mb-2">Looking for:</p>
        <div className="flex flex-wrap gap-2">
          {squad.neededRoles.map((role) => (
            <span
              key={role}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-primary/10 text-primary rounded-md"
            >
              <RoleIcon role={role} size="sm" showName={false} />
              <span className="capitalize">{role}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Server */}
      <div className="flex items-center gap-1 mt-3 text-sm text-muted-foreground">
        <MapPin className="w-3 h-3" />
        <span>{server?.name}</span>
      </div>
    </Link>
  );
}
