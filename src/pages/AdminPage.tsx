import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import {
  useIsAdmin, useAllProfiles, useAllSquads, useAdminDeleteProfile, useAdminDeleteSquad,
  useAdminStats, useAdminUserEmails, useAllTournaments, useAdminTournamentStats,
  useAdminDeleteTournament, useAdminBanUser, useAdminUnbanUser,
  useAllNotifications, useAdminDeleteNotification,
} from '@/hooks/useAdmin';
import { GlowCard } from '@/components/tron/GlowCard';
import { CircuitLoader } from '@/components/tron/CircuitLoader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Trash2, Users, Shield, Eye, Swords, Search, BarChart3, Trophy,
  Bell, Pencil, Ban, CheckCircle, Send,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { HeroManagement } from '@/components/admin/HeroManagement';
import { AdminEditProfileDialog } from '@/components/admin/AdminEditProfileDialog';
import { AdminEditSquadDialog } from '@/components/admin/AdminEditSquadDialog';
import { AdminEditTournamentDialog } from '@/components/admin/AdminEditTournamentDialog';
import { AdminSendNotificationDialog } from '@/components/admin/AdminSendNotificationDialog';
import { AdminRoleManager } from '@/components/admin/AdminRoleManager';
import { getContactValue } from '@/lib/contacts';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: profiles, isLoading: profilesLoading } = useAllProfiles();
  const { data: squads, isLoading: squadsLoading } = useAllSquads();
  const { data: stats } = useAdminStats();
  const { data: tournaments, isLoading: tournamentsLoading } = useAllTournaments();
  const { data: tournamentStats } = useAdminTournamentStats();
  const { data: notifications, isLoading: notificationsLoading } = useAllNotifications();
  const deleteProfile = useAdminDeleteProfile();
  const deleteSquad = useAdminDeleteSquad();
  const deleteTournament = useAdminDeleteTournament();
  const banUser = useAdminBanUser();
  const unbanUser = useAdminUnbanUser();
  const deleteNotification = useAdminDeleteNotification();
  const { toast } = useToast();
  const { data: userEmails } = useAdminUserEmails();

  // Search / filter state
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerFilter, setPlayerFilter] = useState('all');
  const [squadSearch, setSquadSearch] = useState('');
  const [squadFilter, setSquadFilter] = useState('all');
  const [tournamentSearch, setTournamentSearch] = useState('');
  const [tournamentFilter, setTournamentFilter] = useState('all');

  // Dialog state
  const [editProfile, setEditProfile] = useState<typeof profiles extends (infer T)[] | undefined ? T | null : null>(null);
  const [editSquad, setEditSquad] = useState<typeof squads extends (infer T)[] | undefined ? T | null : null>(null);
  const [editTournament, setEditTournament] = useState<typeof tournaments extends (infer T)[] | undefined ? T | null : null>(null);
  const [showSendNotification, setShowSendNotification] = useState(false);

  // Fetch all squad members to map profiles to squads
  const { data: allSquadMembers } = useQuery({
    queryKey: ['allSquadMembers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('squad_members')
        .select('profile_id, squad_id, squads(name)');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });

  // Build profile->squad map
  const profileSquadMap = useMemo(() => {
    const map: Record<string, string> = {};
    allSquadMembers?.forEach((m: { profile_id: string | null; squad_id: string; squads: { name: string } | null }) => {
      if (m.profile_id && m.squads?.name) {
        map[m.profile_id] = m.squads.name;
      }
    });
    return map;
  }, [allSquadMembers]);

  // Filter profiles
  const filteredProfiles = useMemo(() => {
    if (!profiles) return [];
    let list = profiles;

    if (playerFilter === 'banned') list = list.filter(p => !!p.banned_at);
    else if (playerFilter === 'active') list = list.filter(p => !p.banned_at);
    else if (playerFilter === 'looking') list = list.filter(p => p.looking_for_squad);

    if (!playerSearch.trim()) return list;
    const q = playerSearch.toLowerCase().trim();
    return list.filter((p) => {
      const whatsapp = getContactValue(p.contacts, 'whatsapp') || '';
      const mlbbId = p.mlbb_id || '';
      const squadName = profileSquadMap[p.id] || '';
      const email = (userEmails?.[p.user_id] || '').toLowerCase();
      return (
        p.ign.toLowerCase().includes(q) ||
        mlbbId.toLowerCase().includes(q) ||
        whatsapp.includes(q) ||
        (p.rank || '').toLowerCase().includes(q) ||
        (p.main_role || '').toLowerCase().includes(q) ||
        (p.state || '').toLowerCase().includes(q) ||
        (p.favorite_heroes || []).some((h: string) => h.toLowerCase().includes(q)) ||
        squadName.toLowerCase().includes(q) ||
        email.includes(q)
      );
    });
  }, [profiles, playerSearch, playerFilter, profileSquadMap, userEmails]);

  // Filter squads
  const filteredSquads = useMemo(() => {
    if (!squads) return [];
    let list = squads;
    if (squadFilter === 'recruiting') list = list.filter(s => s.is_recruiting);
    else if (squadFilter === 'full') list = list.filter(s => !s.is_recruiting);

    if (!squadSearch.trim()) return list;
    const q = squadSearch.toLowerCase().trim();
    return list.filter(s => s.name.toLowerCase().includes(q));
  }, [squads, squadSearch, squadFilter]);

  // Filter tournaments
  const filteredTournaments = useMemo(() => {
    if (!tournaments) return [];
    let list = tournaments;
    if (tournamentFilter !== 'all') list = list.filter(t => t.status === tournamentFilter);

    if (!tournamentSearch.trim()) return list;
    const q = tournamentSearch.toLowerCase().trim();
    return list.filter(t => t.name.toLowerCase().includes(q));
  }, [tournaments, tournamentSearch, tournamentFilter]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && isAdmin === false) {
      toast({ title: 'Access Denied', description: "You don't have admin privileges.", variant: 'destructive' });
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate, toast]);

  const handleDeleteProfile = async (id: string, ign: string) => {
    try {
      await deleteProfile.mutateAsync(id);
      toast({ title: 'Profile Deleted', description: `Profile "${ign}" has been deleted.` });
    } catch { toast({ title: 'Error', description: 'Failed to delete profile.', variant: 'destructive' }); }
  };

  const handleDeleteSquad = async (id: string, name: string) => {
    try {
      await deleteSquad.mutateAsync(id);
      toast({ title: 'Squad Deleted', description: `Squad "${name}" has been deleted.` });
    } catch { toast({ title: 'Error', description: 'Failed to delete squad.', variant: 'destructive' }); }
  };

  const handleDeleteTournament = async (id: string, name: string) => {
    try {
      await deleteTournament.mutateAsync(id);
      toast({ title: 'Tournament Deleted', description: `Tournament "${name}" has been deleted.` });
    } catch { toast({ title: 'Error', description: 'Failed to delete tournament.', variant: 'destructive' }); }
  };

  const handleBan = async (id: string, ign: string) => {
    try {
      await banUser.mutateAsync(id);
      toast({ title: 'User Banned', description: `${ign} has been banned.` });
    } catch { toast({ title: 'Error', description: 'Failed to ban user.', variant: 'destructive' }); }
  };

  const handleUnban = async (id: string, ign: string) => {
    try {
      await unbanUser.mutateAsync(id);
      toast({ title: 'User Unbanned', description: `${ign} has been unbanned.` });
    } catch { toast({ title: 'Error', description: 'Failed to unban user.', variant: 'destructive' }); }
  };

  const handleDeleteNotificationItem = async (id: string) => {
    try {
      await deleteNotification.mutateAsync(id);
      toast({ title: 'Deleted', description: 'Notification deleted.' });
    } catch { toast({ title: 'Error', description: 'Failed to delete notification.', variant: 'destructive' }); }
  };

  if (authLoading || adminLoading) {
    return <Layout><div className="flex items-center justify-center min-h-[60vh]"><CircuitLoader size="lg" /></div></Layout>;
  }
  if (!isAdmin) return null;

  const tabStyle = "data-[state=active]:bg-[#FF4500]/10 data-[state=active]:text-[#FF4500] data-[state=active]:border-b-2 data-[state=active]:border-[#FF4500] rounded-lg px-4 font-display text-xs uppercase tracking-wider flex items-center gap-2";
  const thStyle = "text-[#FF4500]/70 font-display text-xs uppercase tracking-wider";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-[#FF4500]/10 border border-[#FF4500]/20 flex items-center justify-center">
            <Shield className="h-5 w-5 text-[#FF4500]" />
          </div>
          <h1 className="text-3xl font-display font-bold text-[#FF4500] tracking-wide">Admin Dashboard</h1>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <div className="bg-[#111111]/90 border border-[#FF4500]/20 p-1 mb-6 inline-flex rounded-xl overflow-x-auto">
            <TabsList className="bg-transparent gap-1">
              <TabsTrigger value="overview" className={tabStyle}><BarChart3 className="h-4 w-4" />Overview</TabsTrigger>
              <TabsTrigger value="players" className={tabStyle}><Users className="h-4 w-4" />Players ({profiles?.length || 0})</TabsTrigger>
              <TabsTrigger value="squads" className={tabStyle}><Shield className="h-4 w-4" />Squads ({squads?.length || 0})</TabsTrigger>
              <TabsTrigger value="tournaments" className={tabStyle}><Trophy className="h-4 w-4" />Tournaments ({tournaments?.length || 0})</TabsTrigger>
              <TabsTrigger value="notifications" className={tabStyle}><Bell className="h-4 w-4" />Notifications</TabsTrigger>
              <TabsTrigger value="heroes" className={tabStyle}><Swords className="h-4 w-4" />Heroes</TabsTrigger>
            </TabsList>
          </div>

          {/* ===== OVERVIEW TAB ===== */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <GlowCard hoverable className="p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Players</p>
                <div className="text-3xl font-display font-bold text-[#FF4500]">{stats?.totalProfiles || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">{stats?.lookingForSquad || 0} looking for squad</p>
              </GlowCard>
              <GlowCard hoverable className="p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Squads</p>
                <div className="text-3xl font-display font-bold text-[#FF4500]">{stats?.totalSquads || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">{stats?.recruitingSquads || 0} actively recruiting</p>
              </GlowCard>
              <GlowCard hoverable className="p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Tournaments</p>
                <div className="text-3xl font-display font-bold text-[#FF4500]">{tournamentStats?.totalTournaments || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">{tournamentStats?.totalMatches || 0} matches played</p>
              </GlowCard>
              <GlowCard hoverable className="p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Registrations</p>
                <div className="text-3xl font-display font-bold text-[#FF4500]">{tournamentStats?.totalRegistrations || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">across all tournaments</p>
              </GlowCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Rank Distribution */}
              <GlowCard className="p-5">
                <h3 className="font-display font-bold text-foreground tracking-wide mb-4">Rank Distribution</h3>
                {stats?.rankDistribution && Object.keys(stats.rankDistribution).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(stats.rankDistribution).sort((a, b) => b[1] - a[1]).map(([rank, count]) => (
                      <div key={rank} className="flex items-center gap-3">
                        <span className="text-xs capitalize w-28 truncate">{rank}</span>
                        <div className="flex-1 bg-[#0a0a0a] rounded-full h-4 overflow-hidden">
                          <div className="bg-[#FF4500]/60 h-full rounded-full" style={{ width: `${(count / (stats.totalProfiles || 1)) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-muted-foreground text-sm">No data</p>}
              </GlowCard>

              {/* State Distribution */}
              <GlowCard className="p-5">
                <h3 className="font-display font-bold text-foreground tracking-wide mb-4">Top States</h3>
                {stats?.stateDistribution && Object.keys(stats.stateDistribution).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(stats.stateDistribution).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([state, count]) => (
                      <div key={state} className="flex items-center gap-3">
                        <span className="text-xs capitalize w-28 truncate">{state}</span>
                        <div className="flex-1 bg-[#0a0a0a] rounded-full h-4 overflow-hidden">
                          <div className="bg-[#FF4500]/60 h-full rounded-full" style={{ width: `${(count / (stats.totalProfiles || 1)) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-muted-foreground text-sm">No data</p>}
              </GlowCard>

              {/* Tournament Status Distribution */}
              <GlowCard className="p-5">
                <h3 className="font-display font-bold text-foreground tracking-wide mb-4">Tournament Status</h3>
                {tournamentStats?.statusDistribution && Object.keys(tournamentStats.statusDistribution).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(tournamentStats.statusDistribution).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <Badge variant="outline" className="capitalize border-[#FF4500]/20">{status.replace(/_/g, ' ')}</Badge>
                        <span className="text-sm font-display text-[#FF4500]">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-muted-foreground text-sm">No data</p>}
              </GlowCard>

              {/* Quick Stats */}
              <GlowCard className="p-5">
                <h3 className="font-display font-bold text-foreground tracking-wide mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Top Rank</span>
                    <span className="capitalize text-[#FF4500] font-display">
                      {stats?.rankDistribution ? Object.entries(stats.rankDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A' : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Top State</span>
                    <span className="capitalize text-[#FF4500] font-display">
                      {stats?.stateDistribution ? Object.entries(stats.stateDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A' : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active Tournaments</span>
                    <span className="text-[#FF4500] font-display">
                      {(tournamentStats?.statusDistribution?.['ongoing'] || 0) + (tournamentStats?.statusDistribution?.['registration_open'] || 0)}
                    </span>
                  </div>
                </div>
              </GlowCard>
            </div>
          </TabsContent>

          {/* ===== PLAYERS TAB ===== */}
          <TabsContent value="players">
            <GlowCard className="overflow-hidden">
              <div className="p-5 border-b border-[#FF4500]/10">
                <h2 className="font-display font-bold text-foreground tracking-wide mb-3">All Player Profiles</h2>
                <div className="flex gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by IGN, MLBB ID, email, rank, role, state, hero, squad..." value={playerSearch} onChange={(e) => setPlayerSearch(e.target.value)} className="pl-9 bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50" />
                  </div>
                  <Select value={playerFilter} onValueChange={setPlayerFilter}>
                    <SelectTrigger className="w-36 bg-[#0a0a0a] border-[#FF4500]/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                      <SelectItem value="looking">Looking for Squad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-5">
                {profilesLoading ? (
                  <div className="flex justify-center py-8"><CircuitLoader /></div>
                ) : filteredProfiles.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-[#FF4500]/10 hover:bg-transparent">
                          <TableHead className={thStyle}>IGN</TableHead>
                          <TableHead className={thStyle}>Email</TableHead>
                          <TableHead className={thStyle}>Rank</TableHead>
                          <TableHead className={thStyle}>Role</TableHead>
                          <TableHead className={thStyle}>State</TableHead>
                          <TableHead className={thStyle}>Squad</TableHead>
                          <TableHead className={thStyle}>Status</TableHead>
                          <TableHead className={thStyle}>Roles</TableHead>
                          <TableHead className={`${thStyle} text-right`}>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProfiles.map((profile) => {
                          const isBanned = !!profile.banned_at;
                          return (
                            <TableRow key={profile.id} className="border-b border-[#FF4500]/5 hover:bg-[#FF4500]/5">
                              <TableCell className="font-medium">
                                {profile.ign}
                                {isBanned && <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">Banned</Badge>}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{userEmails?.[profile.user_id] || '—'}</TableCell>
                              <TableCell className="capitalize">{profile.rank}</TableCell>
                              <TableCell className="capitalize">{profile.main_role}</TableCell>
                              <TableCell className="capitalize">{profile.state || 'N/A'}</TableCell>
                              <TableCell>
                                {profileSquadMap[profile.id] ? (
                                  <Badge variant="outline" className="border-[#FF4500]/20">{profileSquadMap[profile.id]}</Badge>
                                ) : <span className="text-muted-foreground text-xs">None</span>}
                              </TableCell>
                              <TableCell>
                                <Badge variant={profile.looking_for_squad ? 'default' : 'secondary'}>
                                  {profile.looking_for_squad ? 'Looking' : 'Recruited'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <AdminRoleManager userId={profile.user_id} ign={profile.ign} />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="outline" size="sm" asChild className="border-[#FF4500]/20 hover:border-[#FF4500]/40">
                                    <Link to={`/player/${profile.id}`}><Eye className="h-4 w-4" /></Link>
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => setEditProfile(profile)} className="border-[#FF4500]/20 hover:border-[#FF4500]/40">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  {isBanned ? (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="border-green-500/20 text-green-500 hover:border-green-500/40"><CheckCircle className="h-4 w-4" /></Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="bg-[#111111] border border-[#FF4500]/20">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle className="font-display">Unban User</AlertDialogTitle>
                                          <AlertDialogDescription>Unban "{profile.ign}"? They will be able to use the platform again.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel className="border-[#FF4500]/20">Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleUnban(profile.id, profile.ign)}>Unban</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  ) : (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="border-destructive/20 text-destructive hover:border-destructive/40"><Ban className="h-4 w-4" /></Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="bg-[#111111] border border-[#FF4500]/20">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle className="font-display">Ban User</AlertDialogTitle>
                                          <AlertDialogDescription>Ban "{profile.ign}"? They will be removed from squads and unable to use the platform.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel className="border-[#FF4500]/20">Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleBan(profile.id, profile.ign)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Ban</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-[#111111] border border-[#FF4500]/20">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="font-display">Delete Profile</AlertDialogTitle>
                                        <AlertDialogDescription>Are you sure you want to delete "{profile.ign}"? This action cannot be undone.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="border-[#FF4500]/20">Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteProfile(profile.id, profile.ign)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {playerSearch || playerFilter !== 'all' ? 'No players match your search/filter' : 'No profiles found'}
                  </div>
                )}
              </div>
            </GlowCard>
            <AdminEditProfileDialog profile={editProfile} open={!!editProfile} onOpenChange={(open) => { if (!open) setEditProfile(null); }} />
          </TabsContent>

          {/* ===== SQUADS TAB ===== */}
          <TabsContent value="squads">
            <GlowCard className="overflow-hidden">
              <div className="p-5 border-b border-[#FF4500]/10">
                <h2 className="font-display font-bold text-foreground tracking-wide mb-3">All Squads</h2>
                <div className="flex gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by name..." value={squadSearch} onChange={(e) => setSquadSearch(e.target.value)} className="pl-9 bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50" />
                  </div>
                  <Select value={squadFilter} onValueChange={setSquadFilter}>
                    <SelectTrigger className="w-36 bg-[#0a0a0a] border-[#FF4500]/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="recruiting">Recruiting</SelectItem>
                      <SelectItem value="full">Full</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-5">
                {squadsLoading ? (
                  <div className="flex justify-center py-8"><CircuitLoader /></div>
                ) : filteredSquads.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-[#FF4500]/10 hover:bg-transparent">
                          <TableHead className={thStyle}>Name</TableHead>
                          <TableHead className={thStyle}>Members</TableHead>
                          <TableHead className={thStyle}>Min Rank</TableHead>
                          <TableHead className={thStyle}>Server</TableHead>
                          <TableHead className={thStyle}>Status</TableHead>
                          <TableHead className={thStyle}>Created</TableHead>
                          <TableHead className={`${thStyle} text-right`}>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSquads.map((squad) => (
                          <TableRow key={squad.id} className="border-b border-[#FF4500]/5 hover:bg-[#FF4500]/5">
                            <TableCell className="font-medium">{squad.name}</TableCell>
                            <TableCell>{squad.member_count}/{squad.max_members || 10}</TableCell>
                            <TableCell className="capitalize">{squad.min_rank}</TableCell>
                            <TableCell className="uppercase">{squad.server}</TableCell>
                            <TableCell>
                              <Badge variant={squad.is_recruiting ? 'default' : 'secondary'}>
                                {squad.is_recruiting ? 'Recruiting' : 'Full'}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(squad.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="outline" size="sm" asChild className="border-[#FF4500]/20 hover:border-[#FF4500]/40">
                                  <Link to={`/squad/${squad.id}`}><Eye className="h-4 w-4" /></Link>
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setEditSquad(squad)} className="border-[#FF4500]/20 hover:border-[#FF4500]/40">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-[#111111] border border-[#FF4500]/20">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="font-display">Delete Squad</AlertDialogTitle>
                                      <AlertDialogDescription>Are you sure you want to delete "{squad.name}"? This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="border-[#FF4500]/20">Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteSquad(squad.id, squad.name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {squadSearch || squadFilter !== 'all' ? 'No squads match your search/filter' : 'No squads found'}
                  </div>
                )}
              </div>
            </GlowCard>
            <AdminEditSquadDialog squad={editSquad} open={!!editSquad} onOpenChange={(open) => { if (!open) setEditSquad(null); }} />
          </TabsContent>

          {/* ===== TOURNAMENTS TAB ===== */}
          <TabsContent value="tournaments">
            <GlowCard className="overflow-hidden">
              <div className="p-5 border-b border-[#FF4500]/10">
                <h2 className="font-display font-bold text-foreground tracking-wide mb-3">All Tournaments</h2>
                <div className="flex gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by name..." value={tournamentSearch} onChange={(e) => setTournamentSearch(e.target.value)} className="pl-9 bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50" />
                  </div>
                  <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
                    <SelectTrigger className="w-44 bg-[#0a0a0a] border-[#FF4500]/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="registration_open">Registration Open</SelectItem>
                      <SelectItem value="registration_closed">Registration Closed</SelectItem>
                      <SelectItem value="bracket_generated">Bracket Generated</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-5">
                {tournamentsLoading ? (
                  <div className="flex justify-center py-8"><CircuitLoader /></div>
                ) : filteredTournaments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-[#FF4500]/10 hover:bg-transparent">
                          <TableHead className={thStyle}>Name</TableHead>
                          <TableHead className={thStyle}>Status</TableHead>
                          <TableHead className={thStyle}>Format</TableHead>
                          <TableHead className={thStyle}>Max Squads</TableHead>
                          <TableHead className={thStyle}>Date</TableHead>
                          <TableHead className={thStyle}>Created</TableHead>
                          <TableHead className={`${thStyle} text-right`}>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTournaments.map((tournament) => (
                          <TableRow key={tournament.id} className="border-b border-[#FF4500]/5 hover:bg-[#FF4500]/5">
                            <TableCell className="font-medium">{tournament.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize border-[#FF4500]/20">{tournament.status.replace(/_/g, ' ')}</Badge>
                            </TableCell>
                            <TableCell className="capitalize">{(tournament.format || 'single_elimination').replace(/_/g, ' ')}</TableCell>
                            <TableCell>{tournament.max_squads}</TableCell>
                            <TableCell>{new Date(tournament.date_time).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(tournament.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="outline" size="sm" asChild className="border-[#FF4500]/20 hover:border-[#FF4500]/40">
                                  <Link to={`/tournament/${tournament.id}`}><Eye className="h-4 w-4" /></Link>
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setEditTournament(tournament)} className="border-[#FF4500]/20 hover:border-[#FF4500]/40">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-[#111111] border border-[#FF4500]/20">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="font-display">Delete Tournament</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{tournament.name}"? This will cascade-delete all matches, registrations, stages, and groups. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="border-[#FF4500]/20">Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteTournament(tournament.id, tournament.name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {tournamentSearch || tournamentFilter !== 'all' ? 'No tournaments match your search/filter' : 'No tournaments found'}
                  </div>
                )}
              </div>
            </GlowCard>
            <AdminEditTournamentDialog tournament={editTournament} open={!!editTournament} onOpenChange={(open) => { if (!open) setEditTournament(null); }} />
          </TabsContent>

          {/* ===== NOTIFICATIONS TAB ===== */}
          <TabsContent value="notifications">
            <div className="mb-4">
              <Button onClick={() => setShowSendNotification(true)} className="bg-[#FF4500] hover:bg-[#FF4500]/80">
                <Send className="h-4 w-4 mr-2" />Send Notification
              </Button>
            </div>
            <GlowCard className="overflow-hidden">
              <div className="p-5 border-b border-[#FF4500]/10">
                <h2 className="font-display font-bold text-foreground tracking-wide">Recent Notifications</h2>
                <p className="text-xs text-muted-foreground mt-1">Last 200 notifications</p>
              </div>
              <div className="p-5">
                {notificationsLoading ? (
                  <div className="flex justify-center py-8"><CircuitLoader /></div>
                ) : notifications && notifications.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-[#FF4500]/10 hover:bg-transparent">
                          <TableHead className={thStyle}>Title</TableHead>
                          <TableHead className={thStyle}>Body</TableHead>
                          <TableHead className={thStyle}>Type</TableHead>
                          <TableHead className={thStyle}>Read</TableHead>
                          <TableHead className={thStyle}>Created</TableHead>
                          <TableHead className={`${thStyle} text-right`}>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notifications.map((n) => (
                          <TableRow key={n.id} className="border-b border-[#FF4500]/5 hover:bg-[#FF4500]/5">
                            <TableCell className="font-medium max-w-[200px] truncate">{n.title}</TableCell>
                            <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">{n.body}</TableCell>
                            <TableCell><Badge variant="outline" className="capitalize border-[#FF4500]/20">{n.type}</Badge></TableCell>
                            <TableCell>{n.read ? 'Yes' : 'No'}</TableCell>
                            <TableCell>{new Date(n.created_at).toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-[#111111] border border-[#FF4500]/20">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="font-display">Delete Notification</AlertDialogTitle>
                                    <AlertDialogDescription>Are you sure you want to delete this notification?</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="border-[#FF4500]/20">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteNotificationItem(n.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No notifications found</div>
                )}
              </div>
            </GlowCard>
            <AdminSendNotificationDialog profiles={profiles || []} open={showSendNotification} onOpenChange={setShowSendNotification} />
          </TabsContent>

          {/* ===== HEROES TAB ===== */}
          <TabsContent value="heroes">
            <HeroManagement />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminPage;
