import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Layout } from '@/components/Layout';
import { CircuitBackground } from '@/components/tron/CircuitBackground';
import { GlowCard } from '@/components/tron/GlowCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TiptapEditor } from '@/components/TiptapEditor';
import { TiptapViewer } from '@/components/TiptapViewer';
import { TournamentBracket } from '@/components/tournament/TournamentBracket';
import { TournamentRegistrations } from '@/components/tournament/TournamentRegistrations';
import { TournamentRegistrationForm } from '@/components/tournament/TournamentRegistrationForm';
import { TournamentHostControls } from '@/components/tournament/TournamentHostControls';
import { TournamentRosterManagement } from '@/components/tournament/TournamentRosterManagement';
import { TournamentInviteSquads } from '@/components/tournament/TournamentInviteSquads';
import { MatchScheduler } from '@/components/tournament/MatchScheduler';
import SchedulingDashboard from '@/components/tournament/SchedulingDashboard';
import { UpcomingMatches } from '@/components/tournament/UpcomingMatches';
import {
  useTournament,
  useTournamentRegistrations,
  useTournamentMatches,
  useUpdateTournament,
  useWithdrawFromTournament,
} from '@/hooks/useTournaments';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
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
  CalendarClock,
  CalendarDays,
  Globe,
  MessageCircle,
  Ticket,
  IndianRupee,
  Medal,
  CheckCircle,
  ScrollText,
  Layers,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOURNAMENT_STATUS_LABELS, TOURNAMENT_FORMAT_LABELS } from '@/lib/tournament-types';
import type { PrizeTier } from '@/lib/tournament-types';
import { TournamentAuditLog } from '@/components/tournament/TournamentAuditLog';
import { RosterChangeRequestForm } from '@/components/tournament/RosterChangeRequestForm';
import { toast } from 'sonner';

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tournament, isLoading } = useTournament(id);
  const { data: registrations } = useTournamentRegistrations(id);
  const { data: matches } = useTournamentMatches(id);
  const updateTournament = useUpdateTournament();
  const withdrawFromTournament = useWithdrawFromTournament();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('overview');

  // Editing states
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [editRules, setEditRules] = useState('');
  const [editDetails, setEditDetails] = useState({
    prize_pool: '',
    team_size: '',
    entry_fee: '',
    region: '',
    contact_info: '',
  });

  const isHost = user?.id === tournament?.host_id;
  const registrationCount = registrations?.filter(r => r.status === 'approved').length || 0;
  const spotsLeft = Math.max(0, (tournament?.max_squads || 0) - registrationCount);
  const canRegister = tournament?.status === 'registration_open' && spotsLeft > 0;

  // Find the current user's registration (as squad leader)
  const myRegistration = user && !isHost
    ? (registrations || []).find(
        r => r.tournament_squads?.leader_id === user.id && ['pending', 'approved'].includes(r.status)
      )
    : null;
  const canWithdraw = myRegistration && tournament
    && ['registration_open', 'registration_closed', 'bracket_generated'].includes(tournament.status);

  const handleWithdraw = async () => {
    if (!myRegistration || !tournament) return;
    try {
      await withdrawFromTournament.mutateAsync({
        registrationId: myRegistration.id,
        tournamentId: tournament.id,
      });
      toast.success('Squad withdrawn from tournament');
    } catch (error: unknown) {
      toast.error('Failed to withdraw', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  // Compute user's squad IDs in this tournament for dispute eligibility
  const userSquadIds = (registrations || [])
    .filter(r => r.status === 'approved' && r.tournament_squads?.leader_id === user?.id)
    .map(r => r.tournament_squad_id);

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
    } catch (error: unknown) {
      toast.error('Failed to update', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleSaveRules = async () => {
    if (!tournament) return;
    try {
      await updateTournament.mutateAsync({ id: tournament.id, rules: editRules });
      toast.success('Rules updated');
      setIsEditingRules(false);
    } catch (error: unknown) {
      toast.error('Failed to update', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleSaveDetails = async () => {
    if (!tournament) return;
    try {
      await updateTournament.mutateAsync({
        id: tournament.id,
        prize_pool: editDetails.prize_pool.trim() || null,
        team_size: editDetails.team_size || null,
        entry_fee: editDetails.entry_fee.trim() || null,
        region: editDetails.region || null,
        contact_info: editDetails.contact_info.trim() || null,
      });
      toast.success('Tournament details updated');
      setIsEditingDetails(false);
    } catch (error: unknown) {
      toast.error('Failed to update', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const startEditingDetails = () => {
    setEditDetails({
      prize_pool: tournament?.prize_pool || '',
      team_size: tournament?.team_size || '5v5',
      entry_fee: tournament?.entry_fee || '',
      region: tournament?.region || '',
      contact_info: tournament?.contact_info || '',
    });
    setIsEditingDetails(true);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-72 w-full rounded-2xl mb-8 bg-[#111111]" />
          <Skeleton className="h-10 w-80 mb-4 bg-[#111111]" />
          <Skeleton className="h-5 w-[500px] bg-[#111111]" />
        </div>
      </Layout>
    );
  }

  if (!tournament) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <GlowCard className="p-12 max-w-md mx-auto text-center">
            <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold mb-2">Tournament not found</h2>
            <p className="text-muted-foreground text-sm mb-6">This tournament may have been deleted or doesn't exist.</p>
            <Button variant="outline" asChild className="border-[#FF4500]/20 hover:border-[#FF4500]/40">
              <Link to="/tournaments">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tournaments
              </Link>
            </Button>
          </GlowCard>
        </div>
      </Layout>
    );
  }

  const defaultStatusInfo = {
    color: 'bg-muted text-muted-foreground border-border',
    icon: <Trophy className="w-3 h-3" />,
    glow: '',
  };
  const statusInfo = statusConfig[tournament.status] || defaultStatusInfo;
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
          <div className="relative h-40 md:h-72">
            {tournament.banner_url ? (
              <img
                src={tournament.banner_url}
                alt={tournament.name}
                loading="lazy"
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
            <CircuitBackground intensity="light" />
          </div>

          {/* Floating content over banner */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
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
                  {tournament.is_multi_stage && (
                    <Badge variant="outline" className="text-xs uppercase tracking-wider border-[#FF4500]/40 text-[#FF4500]">
                      <Layers className="w-3 h-3 mr-1" />
                      Multi-Stage
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
                <h1 className="text-2xl md:text-5xl font-display font-black text-foreground tracking-tight leading-none mb-1">
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
                  {tournament.team_size && (
                    <span className="flex items-center gap-1.5">
                      <Swords className="w-4 h-4 text-secondary" />
                      {tournament.team_size}
                    </span>
                  )}
                  {tournament.prize_pool ? (
                    <span className="flex items-center gap-1.5 text-yellow-500 font-medium">
                      <IndianRupee className="w-4 h-4" />
                      {tournament.prize_pool}
                    </span>
                  ) : tournament.prize_wallet ? (
                    <span className="flex items-center gap-1.5 text-secondary font-medium">
                      <Wallet className="w-4 h-4" />
                      USDT Prize
                    </span>
                  ) : null}
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
              {canWithdraw && (
                <Button
                  variant="outline"
                  className="border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={handleWithdraw}
                  disabled={withdrawFromTournament.isPending}
                >
                  {withdrawFromTournament.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4 mr-2" />
                  )}
                  Withdraw Squad
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Registration Progress Bar (when registration is open) */}
        {tournament.status === 'registration_open' && (
          <GlowCard className="p-4 mb-6 flex items-center gap-4">
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
                "text-2xl font-display font-black",
                spotsLeft <= 2 ? "text-secondary" : "text-primary"
              )}>
                {spotsLeft}
              </span>
              <p className="text-xs text-muted-foreground">spots left</p>
            </div>
          </GlowCard>
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
          {/* Responsive tab bar: sticky scrollable on mobile, inline on desktop */}
          <div className={cn(
            "sticky top-14 z-30 -mx-4 px-4 py-2 mb-4 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-[#FF4500]/10",
            "md:static md:mx-0 md:px-0 md:py-0 md:mb-6 md:border-0 md:bg-transparent md:backdrop-blur-none md:inline-flex"
          )}>
            <div className={cn(
              "md:bg-[#111111]/90 md:border md:border-[#FF4500]/20 md:p-1 md:rounded-xl md:inline-flex"
            )}>
              <TabsList className="bg-transparent flex items-center gap-1 overflow-x-auto scrollbar-hide w-full md:w-auto">
                <TabsTrigger value="overview" className="shrink-0 whitespace-nowrap min-h-[44px] data-[state=active]:bg-[#FF4500]/10 data-[state=active]:text-[#FF4500] data-[state=active]:border-b-2 data-[state=active]:border-[#FF4500] rounded-lg px-4 md:px-5 font-display text-xs uppercase tracking-wider">
                  <FileText className="w-4 h-4 mr-1.5" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="teams" className="shrink-0 whitespace-nowrap min-h-[44px] data-[state=active]:bg-[#FF4500]/10 data-[state=active]:text-[#FF4500] data-[state=active]:border-b-2 data-[state=active]:border-[#FF4500] rounded-lg px-4 md:px-5 font-display text-xs uppercase tracking-wider">
                  <Users className="w-4 h-4 mr-1.5" />
                  Teams ({registrations?.filter(r => r.status === 'approved').length || 0})
                </TabsTrigger>
                {(tournament.status === 'bracket_generated' ||
                  tournament.status === 'ongoing' ||
                  tournament.status === 'completed') && (
                  <>
                    <TabsTrigger value="bracket" className="shrink-0 whitespace-nowrap min-h-[44px] data-[state=active]:bg-[#FF4500]/10 data-[state=active]:text-[#FF4500] data-[state=active]:border-b-2 data-[state=active]:border-[#FF4500] rounded-lg px-4 md:px-5 font-display text-xs uppercase tracking-wider">
                      <Swords className="w-4 h-4 mr-1.5" />
                      Bracket
                    </TabsTrigger>
                    <TabsTrigger value="upcoming" className="shrink-0 whitespace-nowrap min-h-[44px] data-[state=active]:bg-[#FF4500]/10 data-[state=active]:text-[#FF4500] data-[state=active]:border-b-2 data-[state=active]:border-[#FF4500] rounded-lg px-4 md:px-5 font-display text-xs uppercase tracking-wider">
                      <CalendarDays className="w-4 h-4 mr-1.5" />
                      Upcoming
                    </TabsTrigger>
                  </>
                )}
                {isHost && tournament.status !== 'registration_open' && (
                  <TabsTrigger value="rosters" className="shrink-0 whitespace-nowrap min-h-[44px] data-[state=active]:bg-[#FF4500]/10 data-[state=active]:text-[#FF4500] data-[state=active]:border-b-2 data-[state=active]:border-[#FF4500] rounded-lg px-4 md:px-5 font-display text-xs uppercase tracking-wider">
                    <Shield className="w-4 h-4 mr-1.5" />
                    Rosters
                  </TabsTrigger>
                )}
                {isHost && (tournament.status === 'bracket_generated' || tournament.status === 'ongoing') && (
                  <TabsTrigger value="schedule" className="shrink-0 whitespace-nowrap min-h-[44px] data-[state=active]:bg-[#FF4500]/10 data-[state=active]:text-[#FF4500] data-[state=active]:border-b-2 data-[state=active]:border-[#FF4500] rounded-lg px-4 md:px-5 font-display text-xs uppercase tracking-wider">
                    <CalendarClock className="w-4 h-4 mr-1.5" />
                    Schedule
                  </TabsTrigger>
                )}
                {canRegister && user && (
                  <TabsTrigger value="register" className="shrink-0 whitespace-nowrap min-h-[44px] data-[state=active]:bg-[#FF6B35]/10 data-[state=active]:text-[#FF6B35] data-[state=active]:border-b-2 data-[state=active]:border-[#FF6B35] rounded-lg px-4 md:px-5 font-display text-xs uppercase tracking-wider">
                    <Trophy className="w-4 h-4 mr-1.5" />
                    Register
                  </TabsTrigger>
                )}
                {isHost && (
                  <TabsTrigger value="activity" className="shrink-0 whitespace-nowrap min-h-[44px] data-[state=active]:bg-[#FF4500]/10 data-[state=active]:text-[#FF4500] data-[state=active]:border-b-2 data-[state=active]:border-[#FF4500] rounded-lg px-4 md:px-5 font-display text-xs uppercase tracking-wider">
                    <ScrollText className="w-4 h-4 mr-1.5" />
                    Activity
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Tournament Info Grid — with Edit button for hosts */}
            {isEditingDetails ? (
              <div className="glass-card relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF4500] via-[#FF4500]/50 to-transparent" />
                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-display font-bold uppercase tracking-wider text-[#FF4500] flex items-center gap-2">
                      <div className="h-6 w-1 bg-gradient-to-b from-[#FF4500] to-[#FF4500]/30 rounded-full" />
                      Edit Tournament Details
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-1.5 block">Prize Pool</label>
                      <Input
                        value={editDetails.prize_pool}
                        onChange={(e) => setEditDetails(d => ({ ...d, prize_pool: e.target.value }))}
                        placeholder="e.g. ₹5,000 or 100 USDT"
                        className="bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-1.5 block">Team Size</label>
                      <Select value={editDetails.team_size} onValueChange={(v) => setEditDetails(d => ({ ...d, team_size: v }))}>
                        <SelectTrigger className="bg-[#0a0a0a] border-[#FF4500]/20">
                          <SelectValue placeholder="Select team size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5v5">5v5</SelectItem>
                          <SelectItem value="3v3">3v3</SelectItem>
                          <SelectItem value="1v1">1v1</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-1.5 block">Entry Fee</label>
                      <Input
                        value={editDetails.entry_fee}
                        onChange={(e) => setEditDetails(d => ({ ...d, entry_fee: e.target.value }))}
                        placeholder="e.g. Free, ₹100 per team"
                        className="bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-1.5 block">Region / Server</label>
                      <Select value={editDetails.region} onValueChange={(v) => setEditDetails(d => ({ ...d, region: v }))}>
                        <SelectTrigger className="bg-[#0a0a0a] border-[#FF4500]/20">
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="India">India</SelectItem>
                          <SelectItem value="SEA">SEA</SelectItem>
                          <SelectItem value="Global">Global</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-1.5 block">Contact Info</label>
                      <Input
                        value={editDetails.contact_info}
                        onChange={(e) => setEditDetails(d => ({ ...d, contact_info: e.target.value }))}
                        placeholder="Discord ID or WhatsApp number"
                        className="bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingDetails(false)}>
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveDetails} disabled={updateTournament.isPending}>
                      {updateTournament.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                      Save Details
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Edit button for hosts */}
                {isHost && (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={startEditingDetails}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Edit Details
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: Calendar, label: 'Date', value: format(new Date(tournament.date_time), 'MMM d, yyyy'), color: 'text-[#FF4500]' },
                    { icon: Clock, label: 'Time', value: format(new Date(tournament.date_time), 'h:mm a'), color: 'text-[#FF4500]' },
                    { icon: Users, label: 'Team Size', value: tournament.team_size || '5v5', color: 'text-[#FF4500]' },
                    { icon: Ticket, label: 'Entry Fee', value: tournament.entry_fee || 'Free', color: 'text-emerald-400' },
                    { icon: IndianRupee, label: 'Prize Pool', value: tournament.prize_pool || '—', color: 'text-yellow-500' },
                    { icon: Shield, label: 'Squads', value: `${registrationCount} / ${tournament.max_squads}`, color: 'text-[#FF4500]' },
                    { icon: Swords, label: 'Format', value: tournament.format ? TOURNAMENT_FORMAT_LABELS[tournament.format] : 'TBD', color: 'text-[#FF4500]' },
                    { icon: Globe, label: 'Region', value: tournament.region || '—', color: 'text-sky-400' },
                  ].map((item, i) => (
                    <div key={i} className="bg-[#111111] border border-[#FF4500]/20 rounded-lg p-4 relative overflow-hidden group hover:border-[#FF4500]/40 hover:shadow-[0_0_10px_rgba(255,69,0,0.15)] transition-all duration-300">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#FF4500]/40 to-transparent" />
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#FF4500]/10 flex items-center justify-center shrink-0">
                          <item.icon className={cn('w-4.5 h-4.5', item.color)} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-display">{item.label}</p>
                          <p className="text-sm font-display font-bold text-foreground truncate">{item.value}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Contact Info (if provided) */}
                {tournament.contact_info && (
                  <div className="bg-[#111111] border border-[#FF4500]/20 rounded-lg p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#FF4500]/10 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4.5 h-4.5 text-[#FF4500]" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-display">Host Contact</p>
                      <p className="text-sm font-display font-bold text-foreground">{tournament.contact_info}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Description Section */}
            <div className="glass-card relative overflow-hidden group">
              {/* Top accent border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
              {/* Decorative corner glow */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/15 transition-colors duration-500" />
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-primary/5 rounded-full blur-xl" />
              
              <div className="p-6 relative">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-display font-black text-foreground flex items-center gap-3 uppercase tracking-wide">
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
                  <h3 className="text-lg font-display font-black text-foreground flex items-center gap-3 uppercase tracking-wide">
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
                    <TiptapEditor
                      content={editRules}
                      onChange={setEditRules}
                      placeholder="Enter tournament rules..."
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
                      <TiptapViewer content={tournament.rules} />
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
                  <h3 className="text-lg font-display font-black text-foreground mb-4 flex items-center gap-3 uppercase tracking-wide">
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

            {/* Prize Tiers */}
            {tournament.prize_tiers && tournament.prize_tiers.length > 0 && (
              <PrizeTiersCard
                tiers={tournament.prize_tiers}
                isHost={isHost}
                isCompleted={tournament.status === 'completed'}
                tournamentId={tournament.id}
              />
            )}
          </TabsContent>
          <TabsContent value="teams">
            <TournamentRegistrations
              tournamentId={tournament.id}
              registrations={registrations || []}
              isHost={isHost}
            />
            {/* Roster change request form for squad leaders (non-hosts) */}
            {myRegistration && tournament.status !== 'registration_open' && (
              <div className="mt-6">
                <RosterChangeRequestForm
                  tournamentId={tournament.id}
                  tournamentSquadId={myRegistration.tournament_squad_id}
                  squadName={myRegistration.tournament_squads?.name || 'Your Squad'}
                />
              </div>
            )}
          </TabsContent>

          {/* Bracket Tab */}
          {(tournament.status === 'bracket_generated' ||
            tournament.status === 'ongoing' ||
            tournament.status === 'completed') && (
            <>
              <TabsContent value="bracket">
                <TournamentBracket
                  tournament={tournament}
                  matches={matches || []}
                  isHost={isHost}
                  userSquadIds={userSquadIds}
                />
              </TabsContent>
              <TabsContent value="upcoming">
                <UpcomingMatches
                  matches={matches || []}
                  tournamentName={tournament.name}
                />
              </TabsContent>
            </>
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

          {/* Schedule Tab */}
          {isHost && (tournament.status === 'bracket_generated' || tournament.status === 'ongoing') && (
            <TabsContent value="schedule">
              <SchedulingDashboard
                tournamentId={tournament.id}
                tournamentName={tournament.name}
                matches={matches || []}
                registrations={registrations || []}
              />
              <MatchScheduler
                tournamentId={tournament.id}
                matches={matches || []}
              />
            </TabsContent>
          )}

          {/* Activity Log Tab */}
          {isHost && (
            <TabsContent value="activity">
              <TournamentAuditLog tournamentId={tournament.id} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}

// Prize Tiers display card
function PrizeTiersCard({
  tiers,
  isHost,
  isCompleted,
  tournamentId,
}: {
  tiers: PrizeTier[];
  isHost: boolean;
  isCompleted: boolean;
  tournamentId: string;
}) {
  const updateTournament = useUpdateTournament();

  const handleToggleDistributed = async (index: number) => {
    const updated = tiers.map((t, i) => i === index ? { ...t, distributed: !t.distributed } : t);
    try {
      await updateTournament.mutateAsync({
        id: tournamentId,
        prize_tiers: updated,
      });
      toast.success(updated[index].distributed ? 'Marked as distributed' : 'Marked as pending');
    } catch (error: unknown) {
      toast.error('Failed to update', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const placeColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];

  return (
    <div className="glass-card relative overflow-hidden group">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-amber-500/50 to-transparent" />
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl group-hover:bg-yellow-500/15 transition-colors duration-500" />

      <div className="p-6 relative">
        <h3 className="text-lg font-display font-black text-foreground mb-4 flex items-center gap-3 uppercase tracking-wide">
          <div className="h-8 w-1.5 bg-gradient-to-b from-yellow-500 to-yellow-500/30 rounded-full" />
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <Medal className="w-4 h-4 text-yellow-500" />
          </div>
          Prize Breakdown
        </h3>
        <div className="pl-[3.25rem] space-y-2">
          {tiers.map((tier, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border',
                tier.distributed
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-muted/30 border-border/50'
              )}
            >
              <div className="flex items-center gap-3">
                <Trophy className={cn('w-5 h-5', placeColors[i] || 'text-muted-foreground')} />
                <div>
                  <p className="text-sm font-semibold">{tier.label}</p>
                  <p className="text-xs text-muted-foreground">{tier.prize}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {tier.distributed && (
                  <Badge variant="outline" className="text-xs border-green-500/30 text-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Distributed
                  </Badge>
                )}
                {isHost && isCompleted && (
                  <button
                    onClick={() => handleToggleDistributed(i)}
                    className={cn(
                      'w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors',
                      tier.distributed
                        ? 'bg-green-500/20 border-green-500/50 text-green-500'
                        : 'border-muted-foreground/30 text-muted-foreground hover:border-green-500/30'
                    )}
                  >
                    {tier.distributed ? <Check className="w-3 h-3" /> : null}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
