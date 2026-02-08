import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TournamentBracket } from '@/components/tournament/TournamentBracket';
import { TournamentRegistrations } from '@/components/tournament/TournamentRegistrations';
import { TournamentRegistrationForm } from '@/components/tournament/TournamentRegistrationForm';
import { TournamentHostControls } from '@/components/tournament/TournamentHostControls';
import { 
  useTournament, 
  useTournamentRegistrations,
  useTournamentMatches 
} from '@/hooks/useTournaments';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Trophy,
  Wallet,
  FileText,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOURNAMENT_STATUS_LABELS, TOURNAMENT_FORMAT_LABELS } from '@/lib/tournament-types';

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tournament, isLoading } = useTournament(id);
  const { data: registrations } = useTournamentRegistrations(id);
  const { data: matches } = useTournamentMatches(id);
  const [activeTab, setActiveTab] = useState('overview');

  const isHost = user?.id === tournament?.host_id;
  const registrationCount = registrations?.filter(r => r.status === 'approved').length || 0;
  const spotsLeft = (tournament?.max_squads || 0) - registrationCount;
  const canRegister = tournament?.status === 'registration_open' && spotsLeft > 0;

  const statusColors: Record<string, string> = {
    registration_open: 'bg-green-500/20 text-green-400 border-green-500/30',
    registration_closed: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    bracket_generated: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    ongoing: 'bg-primary/20 text-primary border-primary/30',
    completed: 'bg-muted text-muted-foreground border-border',
    cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-48 w-full rounded-lg mb-6" />
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-96" />
        </div>
      </Layout>
    );
  }

  if (!tournament) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Tournament not found</h2>
          <Button variant="outline" asChild>
            <Link to="/tournaments">Back to Tournaments</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <Button variant="ghost" size="sm" asChild className="mb-6 btn-interactive">
          <Link to="/tournaments">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tournaments
          </Link>
        </Button>

        {/* Banner */}
        {tournament.banner_url && (
          <div className="relative h-48 md:h-64 rounded-xl overflow-hidden mb-6">
            <img
              src={tournament.banner_url}
              alt={tournament.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Badge
                variant="outline"
                className={cn('text-sm', statusColors[tournament.status])}
              >
                {TOURNAMENT_STATUS_LABELS[tournament.status]}
              </Badge>
              {tournament.format && (
                <Badge variant="secondary">
                  {TOURNAMENT_FORMAT_LABELS[tournament.format]}
                </Badge>
              )}
              {isHost && (
                <Badge variant="outline" className="border-secondary text-secondary">
                  <Shield className="w-3 h-3 mr-1" />
                  Host
                </Badge>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {tournament.name}
            </h1>

            {tournament.description && (
              <p className="text-muted-foreground mb-4">{tournament.description}</p>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-5 h-5 text-primary" />
                <span>{format(new Date(tournament.date_time), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-5 h-5 text-primary" />
                <span>{format(new Date(tournament.date_time), 'h:mm a')}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-5 h-5 text-secondary" />
                <span>{registrationCount}/{tournament.max_squads} squads</span>
              </div>
              {tournament.prize_wallet && (
                <div className="flex items-center gap-2 text-secondary">
                  <Wallet className="w-5 h-5" />
                  <span className="font-medium">Prize Pool</span>
                </div>
              )}
            </div>
          </div>

          {/* Registration CTA */}
          {canRegister && user && !isHost && (
            <Button
              className="btn-gaming lg:w-auto"
              onClick={() => setActiveTab('register')}
            >
              <Trophy className="w-4 h-4 mr-2" />
              Register Your Squad
            </Button>
          )}
        </div>

        {/* Host Controls */}
        {isHost && (
          <TournamentHostControls 
            tournament={tournament} 
            registrations={registrations || []}
          />
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="teams">
              Teams ({registrations?.filter(r => r.status === 'approved').length || 0})
            </TabsTrigger>
            {(tournament.status === 'bracket_generated' || 
              tournament.status === 'ongoing' || 
              tournament.status === 'completed') && (
              <TabsTrigger value="bracket">Bracket</TabsTrigger>
            )}
            {canRegister && user && !isHost && (
              <TabsTrigger value="register">Register</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Rules */}
            {tournament.rules && (
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Tournament Rules
                </h3>
                <div className="prose prose-sm prose-invert max-w-none">
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {tournament.rules}
                  </p>
                </div>
              </div>
            )}

            {/* Prize Pool Info */}
            {tournament.prize_wallet && (
              <div className="glass-card p-6 border-secondary/30">
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-secondary" />
                  Prize Pool
                </h3>
                <p className="text-muted-foreground text-sm mb-2">
                  Winners will receive USDT prizes to the following wallet:
                </p>
                <code className="block p-3 bg-muted rounded-lg text-sm break-all">
                  {tournament.prize_wallet}
                </code>
              </div>
            )}

            {/* Spots remaining */}
            {tournament.status === 'registration_open' && (
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Registration Status
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Registered squads</span>
                    <span className="text-foreground font-medium">
                      {registrationCount} / {tournament.max_squads}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                      style={{ width: `${(registrationCount / tournament.max_squads) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {spotsLeft > 0 ? `${spotsLeft} spots remaining` : 'Registration full'}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="teams">
            <TournamentRegistrations
              tournamentId={tournament.id}
              registrations={registrations || []}
              isHost={isHost}
            />
          </TabsContent>

          {(tournament.status === 'bracket_generated' || 
            tournament.status === 'ongoing' || 
            tournament.status === 'completed') && (
            <TabsContent value="bracket">
              <TournamentBracket
                tournament={tournament}
                matches={matches || []}
                isHost={isHost}
              />
            </TabsContent>
          )}

          {canRegister && user && !isHost && (
            <TabsContent value="register">
              <TournamentRegistrationForm
                tournament={tournament}
                onSuccess={() => setActiveTab('teams')}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
