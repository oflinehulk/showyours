import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin, useAllProfiles, useAllSquads, useAdminDeleteProfile, useAdminDeleteSquad, useAdminStats } from '@/hooks/useAdmin';
import { GlowCard } from '@/components/tron/GlowCard';
import { CircuitLoader } from '@/components/tron/CircuitLoader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trash2, Users, Shield, Eye, Swords, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { HeroManagement } from '@/components/admin/HeroManagement';
import { getContactValue } from '@/lib/contacts';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: profiles, isLoading: profilesLoading } = useAllProfiles();
  const { data: squads, isLoading: squadsLoading } = useAllSquads();
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const deleteProfile = useAdminDeleteProfile();
  const deleteSquad = useAdminDeleteSquad();
  const { toast } = useToast();
  const [playerSearch, setPlayerSearch] = useState('');

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
    allSquadMembers?.forEach((m: any) => {
      if (m.profile_id && m.squads?.name) {
        map[m.profile_id] = m.squads.name;
      }
    });
    return map;
  }, [allSquadMembers]);

  // Filter profiles based on search
  const filteredProfiles = useMemo(() => {
    if (!profiles) return [];
    if (!playerSearch.trim()) return profiles;
    const q = playerSearch.toLowerCase().trim();
    return profiles.filter((p) => {
      const whatsapp = getContactValue(p.contacts, 'whatsapp') || '';
      const mlbbId = p.mlbb_id || '';
      const squadName = profileSquadMap[p.id] || '';
      return (
        p.ign.toLowerCase().includes(q) ||
        mlbbId.toLowerCase().includes(q) ||
        whatsapp.includes(q) ||
        (p.rank || '').toLowerCase().includes(q) ||
        (p.main_role || '').toLowerCase().includes(q) ||
        (p.state || '').toLowerCase().includes(q) ||
        (p.favorite_heroes || []).some((h: string) => h.toLowerCase().includes(q)) ||
        squadName.toLowerCase().includes(q)
      );
    });
  }, [profiles, playerSearch, profileSquadMap]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && isAdmin === false) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate, toast]);

  const handleDeleteProfile = async (profileId: string, ign: string) => {
    try {
      await deleteProfile.mutateAsync(profileId);
      toast({
        title: "Profile Deleted",
        description: `Profile "${ign}" has been deleted.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete profile.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSquad = async (squadId: string, name: string) => {
    try {
      await deleteSquad.mutateAsync(squadId);
      toast({
        title: "Squad Deleted",
        description: `Squad "${name}" has been deleted.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete squad.",
        variant: "destructive",
      });
    }
  };

  if (authLoading || adminLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <CircuitLoader size="lg" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-[#FF4500]/10 border border-[#FF4500]/20 flex items-center justify-center">
            <Shield className="h-5 w-5 text-[#FF4500]" />
          </div>
          <h1 className="text-3xl font-display font-bold text-[#FF4500] tracking-wide">Admin Dashboard</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <GlowCard hoverable className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Players</p>
            <div className="text-3xl font-display font-bold text-[#FF4500]">{stats?.totalProfiles || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.lookingForSquad || 0} looking for squad
            </p>
          </GlowCard>

          <GlowCard hoverable className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Squads</p>
            <div className="text-3xl font-display font-bold text-[#FF4500]">{stats?.totalSquads || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.recruitingSquads || 0} actively recruiting
            </p>
          </GlowCard>

          <GlowCard hoverable className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Top State</p>
            {stats?.stateDistribution && Object.keys(stats.stateDistribution).length > 0 ? (
              <>
                <div className="text-xl font-display font-bold text-[#FF4500] capitalize">
                  {Object.entries(stats.stateDistribution).sort((a, b) => b[1] - a[1])[0]?.[0]}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Object.entries(stats.stateDistribution).sort((a, b) => b[1] - a[1])[0]?.[1]} players
                </p>
              </>
            ) : (
              <div className="text-xl font-display font-bold text-muted-foreground">N/A</div>
            )}
          </GlowCard>

          <GlowCard hoverable className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Top Rank</p>
            {stats?.rankDistribution && Object.keys(stats.rankDistribution).length > 0 ? (
              <>
                <div className="text-xl font-display font-bold text-[#FF4500] capitalize">
                  {Object.entries(stats.rankDistribution).sort((a, b) => b[1] - a[1])[0]?.[0]}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Object.entries(stats.rankDistribution).sort((a, b) => b[1] - a[1])[0]?.[1]} players
                </p>
              </>
            ) : (
              <div className="text-xl font-display font-bold text-muted-foreground">N/A</div>
            )}
          </GlowCard>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="players" className="w-full">
          <div className="bg-[#111111]/90 border border-[#FF4500]/20 p-1 mb-6 inline-flex rounded-xl">
            <TabsList className="bg-transparent gap-1">
              <TabsTrigger value="players" className="data-[state=active]:bg-[#FF4500]/10 data-[state=active]:text-[#FF4500] data-[state=active]:border-b-2 data-[state=active]:border-[#FF4500] rounded-lg px-5 font-display text-xs uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4" />
                Players ({profiles?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="squads" className="data-[state=active]:bg-[#FF4500]/10 data-[state=active]:text-[#FF4500] data-[state=active]:border-b-2 data-[state=active]:border-[#FF4500] rounded-lg px-5 font-display text-xs uppercase tracking-wider flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Squads ({squads?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="heroes" className="data-[state=active]:bg-[#FF4500]/10 data-[state=active]:text-[#FF4500] data-[state=active]:border-b-2 data-[state=active]:border-[#FF4500] rounded-lg px-5 font-display text-xs uppercase tracking-wider flex items-center gap-2">
                <Swords className="h-4 w-4" />
                Heroes
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="players">
            <GlowCard className="overflow-hidden">
              <div className="p-5 border-b border-[#FF4500]/10">
                <h2 className="font-display font-bold text-foreground tracking-wide mb-3">All Player Profiles</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by IGN, MLBB ID, WhatsApp, rank, role, state, hero, squad..."
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    className="pl-9 bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
                  />
                </div>
              </div>
              <div className="p-5">
                {profilesLoading ? (
                  <div className="flex justify-center py-8">
                    <CircuitLoader />
                  </div>
                ) : filteredProfiles.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-[#FF4500]/10 hover:bg-transparent">
                          <TableHead className="text-[#FF4500]/70 font-display text-xs uppercase tracking-wider">IGN</TableHead>
                          <TableHead className="text-[#FF4500]/70 font-display text-xs uppercase tracking-wider">Rank</TableHead>
                          <TableHead className="text-[#FF4500]/70 font-display text-xs uppercase tracking-wider">Role</TableHead>
                          <TableHead className="text-[#FF4500]/70 font-display text-xs uppercase tracking-wider">State</TableHead>
                          <TableHead className="text-[#FF4500]/70 font-display text-xs uppercase tracking-wider">Squad</TableHead>
                          <TableHead className="text-[#FF4500]/70 font-display text-xs uppercase tracking-wider">Status</TableHead>
                          <TableHead className="text-[#FF4500]/70 font-display text-xs uppercase tracking-wider text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProfiles.map((profile) => (
                          <TableRow key={profile.id} className="border-b border-[#FF4500]/5 hover:bg-[#FF4500]/5">
                            <TableCell className="font-medium">{profile.ign}</TableCell>
                            <TableCell className="capitalize">{profile.rank}</TableCell>
                            <TableCell className="capitalize">{profile.main_role}</TableCell>
                            <TableCell className="capitalize">{profile.state || 'N/A'}</TableCell>
                            <TableCell>
                              {profileSquadMap[profile.id] ? (
                                <Badge variant="outline" className="border-[#FF4500]/20">{profileSquadMap[profile.id]}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">None</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={profile.looking_for_squad ? "default" : "secondary"}>
                                {profile.looking_for_squad ? 'Looking' : 'Recruited'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" asChild className="border-[#FF4500]/20 hover:border-[#FF4500]/40">
                                  <Link to={`/player/${profile.id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-[#111111] border border-[#FF4500]/20">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="font-display">Delete Profile</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{profile.ign}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="border-[#FF4500]/20">Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteProfile(profile.id, profile.ign)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
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
                    {playerSearch ? 'No players match your search' : 'No profiles found'}
                  </div>
                )}
              </div>
            </GlowCard>
          </TabsContent>

          <TabsContent value="squads">
            <GlowCard className="overflow-hidden">
              <div className="p-5 border-b border-[#FF4500]/10">
                <h2 className="font-display font-bold text-foreground tracking-wide">All Squads</h2>
              </div>
              <div className="p-5">
                {squadsLoading ? (
                  <div className="flex justify-center py-8">
                    <CircuitLoader />
                  </div>
                ) : squads && squads.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-[#FF4500]/10 hover:bg-transparent">
                          <TableHead className="text-[#FF4500]/70 font-display text-xs uppercase tracking-wider">Name</TableHead>
                          <TableHead className="text-[#FF4500]/70 font-display text-xs uppercase tracking-wider">Members</TableHead>
                          <TableHead className="text-[#FF4500]/70 font-display text-xs uppercase tracking-wider">Min Rank</TableHead>
                          <TableHead className="text-[#FF4500]/70 font-display text-xs uppercase tracking-wider">Server</TableHead>
                          <TableHead className="text-[#FF4500]/70 font-display text-xs uppercase tracking-wider">Status</TableHead>
                          <TableHead className="text-[#FF4500]/70 font-display text-xs uppercase tracking-wider">Created</TableHead>
                          <TableHead className="text-[#FF4500]/70 font-display text-xs uppercase tracking-wider text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {squads.map((squad) => (
                          <TableRow key={squad.id} className="border-b border-[#FF4500]/5 hover:bg-[#FF4500]/5">
                            <TableCell className="font-medium">{squad.name}</TableCell>
                            <TableCell>{squad.member_count}/{squad.max_members || 10}</TableCell>
                            <TableCell className="capitalize">{squad.min_rank}</TableCell>
                            <TableCell className="uppercase">{squad.server}</TableCell>
                            <TableCell>
                              <Badge variant={squad.is_recruiting ? "default" : "secondary"}>
                                {squad.is_recruiting ? 'Recruiting' : 'Full'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(squad.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" asChild className="border-[#FF4500]/20 hover:border-[#FF4500]/40">
                                  <Link to={`/squad/${squad.id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-[#111111] border border-[#FF4500]/20">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="font-display">Delete Squad</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{squad.name}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="border-[#FF4500]/20">Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteSquad(squad.id, squad.name)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
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
                  <div className="text-center py-8 text-muted-foreground">No squads found</div>
                )}
              </div>
            </GlowCard>
          </TabsContent>

          <TabsContent value="heroes">
            <HeroManagement />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminPage;
