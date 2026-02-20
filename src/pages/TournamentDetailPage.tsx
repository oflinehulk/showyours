import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { TournamentBracket } from '@/components/tournament/TournamentBracket';
import { TournamentRegistrations } from '@/components/tournament/TournamentRegistrations';
import { TournamentRegistrationForm } from '@/components/tournament/TournamentRegistrationForm';
import { TournamentHostControls } from '@/components/tournament/TournamentHostControls';
import { TournamentRosterManagement } from '@/components/tournament/TournamentRosterManagement';
import { TournamentInviteSquads } from '@/components/tournament/TournamentInviteSquads';
import { 
  useTournament, 
  useTournamentRegistrations,
  useTournamentMatches,
  useUpdateTournament,
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
  Swords,
  Edit3,
  Check,
  X,
  Loader2,
  Zap,
  Target,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOURNAMENT_STATUS_LABELS, TOURNAMENT_FORMAT_LABELS } from '@/lib/tournament-types';
import { toast } from 'sonner';

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tournament, isLoading } = useTournament(id);
  const { data: registrations } = useTournamentRegistrations(id);
  const { data: matches } = useTournamentMatches(id);
  const updateTournament = useUpdateTournament();
  const [activeTab, setActiveTab] = useState('overview');

  // Editing states
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [editRules, setEditRules] = useState('');

  const isHost = user?.id === tournament?.host_id;
  const registrationCount = registrations?.filter(r => r.status === 'approved').length || 0;
  const spotsLeft = (tournament?.max_squads || 0) - registrationCount;
  const canRegister = tournament?.status === 'registration_open' && spotsLeft > 0;

  const statusConfig: Record<string, { color: string; icon: React.ReactNode; glow: string }> = {
    registration_open: { 
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', 
      icon: <Zap className="w-3 h-3" />,
      glow: 'shadow-emerald-500/20',
    },
    registration_closed: { 
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      icon: <Target className="w-3 h-3" />,
      glow: 'shadow-amber-500/20',
    },
    bracket_generated: { 
      color: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
      icon: <Swords className="w-3 h-3" />,
      glow: 'shadow-sky-500/20',
    },
    ongoing: { 
      color: 'bg-primary/20 text-primary border-primary/40',
      icon: <Swords className="w-3 h-3" />,
      glow: 'shadow-primary/20',
    },
    completed: { 
      color: 'bg-muted text-muted-foreground border-border',
      icon: <Trophy className="w-3 h-3" />,
      glow: '',
    },
    cancelled: { 
      color: 'bg-destructive/20 text-destructive border-destructive/40',
      icon: <X className="w-3 h-3" />,
      glow: '',
    },
  };

  const handleSaveDescription = async () => {
    if (!tournament) return;
    try {
      await updateTournament.mutateAsync({ id: tournament.id, description: editDesc });
      toast.success('Description updated');
      setIsEditingDesc(false);
    } catch (error: any) {
      toast.error('Failed to update', { description: error.message });
    }
  };

  const handleSaveRules = async () => {
    if (!tournament) return;
    try {
      await updateTournament.mutateAsync({ id: tournament.id, rules: editRules });
      toast.success('Rules updated');
      setIsEditingRules(false);
    } catch (error: any) {
      toast.error('Failed to update', { description: error.message });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-72 w-full rounded-2xl mb-8" />
          <Skeleton className="h-10 w-80 mb-4" />
          <Skeleton className="h-5 w-[500px]" />
        </div>
      </Layout>
    );
  }

  if (!tournament) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="glass-card p-12 max-w-md mx-auto">
            <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Tournament not found</h2>
            <p className="text-muted-foreground text-sm mb-6">This tournament may have been deleted or doesn't exist.</p>
            <Button variant="outline" asChild>
              <Link to="/tournaments">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tournaments
              </Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const statusInfo = statusConfig[tournament.status];
  const fillPercent = tournament.max_squads > 0 ? (registrationCount / tournament.max_squads) * 100 : 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Back navigation */}
        <Button variant="ghost" size="sm" asChild className="mb-4 btn-interactive text-muted-foreground hover:text-foreground">
          <Link to="/tournaments">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tournaments
          </Link>
        </Button>

        {/* Hero Section */}
        <div className="relative rounded-2xl overflow-hidden mb-8">
          {/* Banner Image / Gradient Fallback */}
          <div className="relative h-56 md:h-72">
            {tournament.banner_url ? (
              <img
                src={tournament.banner_url}
                alt={tournament.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/30 via-card to-secondary/20" />
            )}
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
            
            {/* Decorative grid */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />
          </div>

          {/* Floating content over banner */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Status badges */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge
                    variant="outline"
                    className={cn('text-xs font-semibold uppercase tracking-wider px-3 py-1', statusInfo.color)}
                  >
                    {statusInfo.icon}
                    <span className="ml-1.5">{TOURNAMENT_STATUS_LABELS[tournament.status]}</span>
                  </Badge>
                  {tournament.format && (
                    <Badge variant="secondary" className="text-xs uppercase tracking-wider">
                      <Swords className="w-3 h-3 mr-1" />
                      {TOURNAMENT_FORMAT_LABELS[tournament.format]}
                    </Badge>
                  )}
                  {isHost && (
                    <Badge variant="outline" className="text-xs border-secondary/50 text-secondary uppercase tracking-wider">
                      <Shield className="w-3 h-3 mr-1" />
                      Host
                    </Badge>
                  )}
                </div>

                {/* Tournament name */}
                <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight leading-none mb-2">
                  {tournament.name}
                </h1>

                {/* Quick info row */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground mt-3">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-primary" />
                    {format(new Date(tournament.date_time), 'MMM d, yyyy')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary" />
                    {format(new Date(tournament.date_time), 'h:mm a')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-secondary" />
                    {registrationCount}/{tournament.max_squads} squads
                  </span>
                  {tournament.prize_wallet && (
                    <span className="flex items-center gap-1.5 text-secondary font-medium">
                      <Wallet className="w-4 h-4" />
                      USDT Prize
                    </span>
                  )}
                </div>
              </div>

              {/* CTA */}
              {canRegister && user && (
                <Button
                  className="btn-gaming text-base px-8 py-6 shadow-lg shadow-primary/25"
                  onClick={() => setActiveTab('register')}
                >
                  <Trophy className="w-5 h-5 mr-2" />
                  Register Now
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Registration Progress Bar (when registration is open) */}
        {tournament.status === 'registration_open' && (
          <div className="glass-card p-4 mb-6 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground font-medium">Registration Progress</span>
                <span className="text-foreground font-bold">{registrationCount} / {tournament.max_squads}</span>
              </div>
              <div className="h-3 rounded-full bg-muted/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-secondary transition-all duration-700 ease-out"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <span className={cn(
                "text-2xl font-black",
                spotsLeft <= 2 ? "text-secondary" : "text-primary"
              )}>
                {spotsLeft}
              </span>
              <p className="text-xs text-muted-foreground">spots left</p>
            </div>
          </div>
        )}

        {/* Host Controls */}
        {isHost && (
          <>
            <TournamentHostControls 
              tournament={tournament} 
              registrations={registrations || []}
            />
            {tournament.status === 'registration_open' && (
              <div className="mb-6">
                <TournamentInviteSquads tournament={tournament} />
              </div>
            )}
          </>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="glass-card p-1 mb-6 inline-flex rounded-xl">
            <TabsList className="bg-transparent gap-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg px-5">
                <FileText className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="teams" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg px-5">
                <Users className="w-4 h-4 mr-2" />
                Teams ({registrations?.filter(r => r.status === 'approved').length || 0})
              </TabsTrigger>
              {(tournament.status === 'bracket_generated' || 
                tournament.status === 'ongoing' || 
                tournament.status === 'completed') && (
                <TabsTrigger value="bracket" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg px-5">
                  <Swords className="w-4 h-4 mr-2" />
                  Bracket
                </TabsTrigger>
              )}
              {isHost && tournament.status !== 'registration_open' && (
                <TabsTrigger value="rosters" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg px-5">
                  <Shield className="w-4 h-4 mr-2" />
                  Rosters
                </TabsTrigger>
              )}
              {canRegister && user && (
                <TabsTrigger value="register" className="data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary rounded-lg px-5">
                  <Trophy className="w-4 h-4 mr-2" />
                  Register
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Calendar, value: format(new Date(tournament.date_time), 'MMM d'), sub: format(new Date(tournament.date_time), 'yyyy'), color: 'primary' },
                { icon: Clock, value: format(new Date(tournament.date_time), 'h:mm'), sub: format(new Date(tournament.date_time), 'a'), color: 'primary' },
                { icon: Users, value: String(registrationCount), sub: `of ${tournament.max_squads} squads`, color: 'secondary' },
                { icon: Trophy, value: tournament.format ? TOURNAMENT_FORMAT_LABELS[tournament.format] : 'TBD', sub: 'Format', color: 'secondary' },
              ].map((stat, i) => (
                <div key={i} className="glass-card p-4 text-center relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
                  <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-${stat.color} to-transparent opacity-50`} />
                  <div className={`absolute -top-8 -right-8 w-16 h-16 bg-${stat.color}/5 rounded-full blur-xl group-hover:bg-${stat.color}/10 transition-colors`} />
                  <stat.icon className={`w-6 h-6 text-${stat.color} mx-auto mb-2`} />
                  <p className="text-lg font-black text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Description Section */}
            <div className="glass-card relative overflow-hidden group">
              {/* Top accent border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
              {/* Decorative corner glow */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/15 transition-colors duration-500" />
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-primary/5 rounded-full blur-xl" />
              
              <div className="p-6 relative">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-black text-foreground flex items-center gap-3 uppercase tracking-wide">
                    <div className="h-8 w-1.5 bg-gradient-to-b from-primary to-primary/30 rounded-full" />
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    About Tournament
                  </h3>
                  {isHost && !isEditingDesc && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditDesc(tournament.description || '');
                        setIsEditingDesc(true);
                      }}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                {isEditingDesc ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Enter tournament description..."
                      className="min-h-[120px] bg-muted/50"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingDesc(false)}>
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveDescription} disabled={updateTournament.isPending}>
                        {updateTournament.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pl-[3.25rem]">
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {tournament.description || 'No description provided.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Rules Section */}
            <div className="glass-card relative overflow-hidden group">
              {/* Top accent border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary via-secondary/50 to-transparent" />
              {/* Decorative elements */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-secondary/10 rounded-full blur-2xl group-hover:bg-secondary/15 transition-colors duration-500" />
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-secondary/5 rounded-full blur-xl" />
              {/* Grid pattern overlay */}
              <div className="absolute inset-0 opacity-[0.02]" style={{
                backgroundImage: 'linear-gradient(hsl(var(--secondary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--secondary)) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />
              
              <div className="p-6 relative">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-black text-foreground flex items-center gap-3 uppercase tracking-wide">
                    <div className="h-8 w-1.5 bg-gradient-to-b from-secondary to-secondary/30 rounded-full" />
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Swords className="w-4 h-4 text-secondary" />
                    </div>
                    Tournament Rules
                  </h3>
                  {isHost && !isEditingRules && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditRules(tournament.rules || '');
                        setIsEditingRules(true);
                      }}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                {isEditingRules ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editRules}
                      onChange={(e) => setEditRules(e.target.value)}
                      placeholder="Enter tournament rules..."
                      className="min-h-[200px] bg-muted/50 font-mono text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingRules(false)}>
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveRules} disabled={updateTournament.isPending}>
                        {updateTournament.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pl-[3.25rem]">
                    {tournament.rules ? (
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {tournament.rules}
                      </p>
                    ) : (
                      <p className="text-muted-foreground/50 italic">No rules specified yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Prize Pool */}
            {tournament.prize_wallet && (
              <div className="glass-card relative overflow-hidden group">
                {/* Top accent border */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-yellow-500/50 to-transparent" />
                <div className="absolute -top-16 -right-16 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl group-hover:bg-yellow-500/15 transition-colors duration-500" />
                <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-yellow-500/5 rounded-full blur-xl" />
                
                <div className="p-6 relative">
                  <h3 className="text-lg font-black text-foreground mb-4 flex items-center gap-3 uppercase tracking-wide">
                    <div className="h-8 w-1.5 bg-gradient-to-b from-yellow-500 to-yellow-500/30 rounded-full" />
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-yellow-500" />
                    </div>
                    Prize Pool
                  </h3>
                  <div className="pl-[3.25rem]">
                    <p className="text-muted-foreground text-sm mb-3">
                      Winners will receive USDT prizes to the following wallet:
                    </p>
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-yellow-500/20">
                      <Hash className="w-4 h-4 text-yellow-500 shrink-0" />
                      <code className="text-sm break-all text-foreground font-mono">
                        {tournament.prize_wallet}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams">
            <TournamentRegistrations
              tournamentId={tournament.id}
              registrations={registrations || []}
              isHost={isHost}
            />
          </TabsContent>

          {/* Bracket Tab */}
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

          {/* Register Tab */}
          {canRegister && user && (
            <TabsContent value="register">
              <TournamentRegistrationForm
                tournament={tournament}
                onSuccess={() => setActiveTab('teams')}
              />
            </TabsContent>
          )}

          {/* Rosters Tab */}
          {isHost && tournament.status !== 'registration_open' && (
            <TabsContent value="rosters">
              <TournamentRosterManagement
                tournament={tournament}
                isHost={isHost}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
