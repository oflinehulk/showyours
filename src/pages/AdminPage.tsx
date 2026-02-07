import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin, useAllProfiles, useAllSquads, useAdminDeleteProfile, useAdminDeleteSquad, useAdminStats } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, Users, Shield, Eye, Swords } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { HeroManagement } from '@/components/admin/HeroManagement';

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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
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
          <Shield className="h-8 w-8 text-secondary" />
          <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Players</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats?.totalProfiles || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.lookingForSquad || 0} looking for squad
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Squads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats?.totalSquads || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.recruitingSquads || 0} actively recruiting
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top State</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.stateDistribution && Object.keys(stats.stateDistribution).length > 0 ? (
                <>
                  <div className="text-xl font-bold text-primary capitalize">
                    {Object.entries(stats.stateDistribution).sort((a, b) => b[1] - a[1])[0]?.[0]}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Object.entries(stats.stateDistribution).sort((a, b) => b[1] - a[1])[0]?.[1]} players
                  </p>
                </>
              ) : (
                <div className="text-xl font-bold text-muted-foreground">N/A</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top Rank</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.rankDistribution && Object.keys(stats.rankDistribution).length > 0 ? (
                <>
                  <div className="text-xl font-bold text-primary capitalize">
                    {Object.entries(stats.rankDistribution).sort((a, b) => b[1] - a[1])[0]?.[0]}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Object.entries(stats.rankDistribution).sort((a, b) => b[1] - a[1])[0]?.[1]} players
                  </p>
                </>
              ) : (
                <div className="text-xl font-bold text-muted-foreground">N/A</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="players" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="players" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Players ({profiles?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="squads" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Squads ({squads?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="heroes" className="flex items-center gap-2">
              <Swords className="h-4 w-4" />
              Heroes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="players">
            <Card>
              <CardHeader>
                <CardTitle>All Player Profiles</CardTitle>
              </CardHeader>
              <CardContent>
                {profilesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading profiles...</div>
                ) : profiles && profiles.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>IGN</TableHead>
                          <TableHead>Rank</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profiles.map((profile) => (
                          <TableRow key={profile.id}>
                            <TableCell className="font-medium">{profile.ign}</TableCell>
                            <TableCell className="capitalize">{profile.rank}</TableCell>
                            <TableCell className="capitalize">{profile.main_role}</TableCell>
                            <TableCell className="capitalize">{profile.state || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant={profile.looking_for_squad ? "default" : "secondary"}>
                                {profile.looking_for_squad ? 'Looking' : 'Recruited'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(profile.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" asChild>
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
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Profile</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{profile.ign}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
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
                  <div className="text-center py-8 text-muted-foreground">No profiles found</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="squads">
            <Card>
              <CardHeader>
                <CardTitle>All Squads</CardTitle>
              </CardHeader>
              <CardContent>
                {squadsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading squads...</div>
                ) : squads && squads.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Members</TableHead>
                          <TableHead>Min Rank</TableHead>
                          <TableHead>Server</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {squads.map((squad) => (
                          <TableRow key={squad.id}>
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
                                <Button variant="outline" size="sm" asChild>
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
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Squad</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{squad.name}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
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
              </CardContent>
            </Card>
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
