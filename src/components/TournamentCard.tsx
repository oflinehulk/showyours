import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GlowCard } from '@/components/tron/GlowCard';
import {
  Calendar,
  Users,
  Trophy,
  Wallet,
  Clock,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tournament } from '@/lib/tournament-types';
import { TOURNAMENT_STATUS_LABELS, TOURNAMENT_FORMAT_LABELS } from '@/lib/tournament-types';

interface TournamentCardProps {
  tournament: Tournament;
  registrationCount?: number;
}

export function TournamentCard({ tournament, registrationCount = 0 }: TournamentCardProps) {
  const statusColors: Record<string, string> = {
    registration_open: 'bg-green-500/20 text-green-400 border-green-500/30',
    registration_closed: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    bracket_generated: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    ongoing: 'bg-primary/20 text-primary border-primary/30',
    completed: 'bg-muted text-muted-foreground border-border',
    cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
  };

  const spotsLeft = tournament.max_squads - registrationCount;

  return (
    <GlowCard hoverable className="overflow-hidden group">
      {/* Banner */}
      {tournament.banner_url ? (
        <div className="relative h-32 overflow-hidden">
          <img
            src={tournament.banner_url}
            alt={tournament.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111111] to-transparent" />
        </div>
      ) : (
        <div className="h-20 bg-gradient-to-br from-[#FF4500]/20 to-[#FF6B35]/10" />
      )}

      <div className="px-5 pt-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-display font-bold text-foreground tracking-wide truncate group-hover:text-[#FF4500] transition-colors">
              {tournament.name}
            </h3>
            {tournament.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {tournament.description}
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn('shrink-0 text-xs uppercase tracking-wider font-semibold', statusColors[tournament.status])}
          >
            {TOURNAMENT_STATUS_LABELS[tournament.status]}
          </Badge>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-4">
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{format(new Date(tournament.date_time), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 text-primary" />
            <span>{format(new Date(tournament.date_time), 'h:mm a')}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4 text-secondary" />
            <span className="font-display font-medium">
              {registrationCount}/{tournament.max_squads} squads
            </span>
          </div>
          {tournament.format && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Trophy className="w-4 h-4 text-secondary" />
              <span>{TOURNAMENT_FORMAT_LABELS[tournament.format]}</span>
            </div>
          )}
        </div>

        {/* Prize Pool */}
        {tournament.prize_wallet && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <Wallet className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-yellow-500 font-medium">USDT Prize Pool</span>
          </div>
        )}

        {/* Spots indicator */}
        {tournament.status === 'registration_open' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Registration</span>
              <span className="font-display font-medium">{spotsLeft} spots left</span>
            </div>
            <div className="h-2 rounded-full bg-muted/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                style={{ width: `${(registrationCount / tournament.max_squads) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* View Button */}
        <Button
          asChild
          className={cn(
            'w-full group/btn',
            tournament.status === 'registration_open'
              ? 'btn-gaming'
              : 'border-[#FF4500]/20 hover:border-[#FF4500]/40'
          )}
          variant={tournament.status === 'registration_open' ? 'default' : 'outline'}
        >
          <Link to={`/tournament/${tournament.id}`}>
            {tournament.status === 'registration_open' ? 'Register Now' : 'View Tournament'}
            <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
          </Link>
        </Button>
      </div>
    </GlowCard>
  );
}
