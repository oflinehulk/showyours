import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Users, 
  Trophy, 
  MapPin, 
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

  const isUpcoming = new Date(tournament.date_time) > new Date();
  const spotsLeft = tournament.max_squads - registrationCount;

  return (
    <Card className="glass-card hover-glow overflow-hidden group">
      {/* Banner */}
      {tournament.banner_url ? (
        <div className="relative h-32 overflow-hidden">
          <img
            src={tournament.banner_url}
            alt={tournament.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
        </div>
      ) : (
        <div className="h-20 bg-gradient-to-br from-primary/20 to-secondary/20" />
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-foreground truncate group-hover:text-primary transition-colors">
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
            className={cn('shrink-0', statusColors[tournament.status])}
          >
            {TOURNAMENT_STATUS_LABELS[tournament.status]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
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
            <span>
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
          <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/10 border border-secondary/20">
            <Wallet className="w-4 h-4 text-secondary" />
            <span className="text-sm text-secondary font-medium">USDT Prize Pool</span>
          </div>
        )}

        {/* Spots indicator */}
        {tournament.status === 'registration_open' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Registration</span>
              <span>{spotsLeft} spots left</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                style={{ width: `${(registrationCount / tournament.max_squads) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* View Button */}
        <Button
          asChild
          className="w-full btn-interactive group/btn"
          variant={tournament.status === 'registration_open' ? 'default' : 'outline'}
        >
          <Link to={`/tournament/${tournament.id}`}>
            {tournament.status === 'registration_open' ? 'Register Now' : 'View Tournament'}
            <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
