import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile } from '@/hooks/useProfiles';
import { useMySquads } from '@/hooks/useSquads';
import { useSquadMembers, type SquadMember } from '@/hooks/useSquadMembers';
import { 
  useMyTournamentSquads, 
  useCreateTournamentSquad,
  useRegisterForTournament,
} from '@/hooks/useTournaments';
import { ImageUpload } from '@/components/ImageUpload';
import { 
  Users, 
  Plus, 
  Loader2, 
  Check, 
  Shield,
  UserPlus,
  AlertCircle,
  Crown,
  Phone,
  MessageCircle,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Tournament, SquadMemberRole } from '@/lib/tournament-types';

interface TournamentRegistrationFormProps {
  tournament: Tournament;
  onSuccess: () => void;
}

const SQUAD_MEMBER_ROLE_LABELS: Record<string, string> = {
  leader: 'Leader',
  co_leader: 'Co-Leader',
  member: 'Member',
};

export function TournamentRegistrationForm({ tournament, onSuccess }: TournamentRegistrationFormProps) {
  const { user } = useAuth();
  const { data: myProfile } = useMyProfile();
  const { data: mySquads } = useMySquads();
  const { data: myTournamentSquads } = useMyTournamentSquads();
  const createTournamentSquad = useCreateTournamentSquad();
  const registerForTournament = useRegisterForTournament();

  const [useExisting, setUseExisting] = useState<'existing_squad' | 'tournament_squad' | null>(null);
  const [selectedSquadId, setSelectedSquadId] = useState<string>('');
  const [selectedTournamentSquadId, setSelectedTournamentSquadId] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get members of selected squad
  const { data: squadMembers } = useSquadMembers(selectedSquadId || undefined);

  // Check if user is leader/co-leader of any squad
  const isLeaderOrCoLeader = useMemo(() => {
    if (!squadMembers || !user) return false;
    const myMembership = squadMembers.find(m => m.user_id === user.id);
    return myMembership?.role === 'leader' || myMembership?.role === 'co_leader';
  }, [squadMembers, user]);

  // Check if user has WhatsApp contact
  const hasRequiredContacts = useMemo(() => {
    if (!myProfile) return false;
    const contacts = typeof myProfile.contacts === 'string' 
      ? JSON.parse(myProfile.contacts) 
      : myProfile.contacts || [];
    return contacts.some((c: any) => c.type === 'whatsapp' && c.value);
  }, [myProfile]);

  // Get leaders and co-leaders from squad members
  const leadersAndCoLeaders = useMemo(() => {
    if (!squadMembers) return [];
    return squadMembers.filter(m => m.role === 'leader' || m.role === 'co_leader');
  }, [squadMembers]);

  // Check if all leaders have required contacts
  const allLeadersHaveContacts = useMemo(() => {
    if (!leadersAndCoLeaders.length) return false;
    return leadersAndCoLeaders.every(member => {
      const contacts = typeof member.profile?.contacts === 'string'
        ? JSON.parse(member.profile.contacts)
        : member.profile?.contacts || [];
      return contacts.some((c: any) => c.type === 'whatsapp' && c.value);
    });
  }, [leadersAndCoLeaders]);

  // Validate squad for tournament registration
  const squadValidation = useMemo(() => {
    if (!squadMembers) return { valid: false, errors: [] as string[] };
    
    const errors: string[] = [];
    
    // Check minimum 5 members
    if (squadMembers.length < 5) {
      errors.push(`Minimum 5 players required (currently ${squadMembers.length})`);
    }
    
    // Check maximum 7 members
    if (squadMembers.length > 7) {
      errors.push(`Maximum 7 players allowed (currently ${squadMembers.length})`);
    }
    
    // Check leaders have contacts
    if (!allLeadersHaveContacts) {
      errors.push('All leaders/co-leaders must have WhatsApp contact');
    }
    
    return { valid: errors.length === 0, errors };
  }, [squadMembers, allLeadersHaveContacts]);

  const handleRegisterExistingSquad = async () => {
    if (!selectedSquadId || !squadMembers) return;
    
    if (!squadValidation.valid) {
      toast.error('Squad does not meet requirements');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find the selected squad
      const squad = mySquads?.find(s => s.id === selectedSquadId);
      if (!squad) throw new Error('Squad not found');

      // Create tournament squad from existing squad
      const tournamentSquad = await createTournamentSquad.mutateAsync({
        squad: {
          name: squad.name,
          existing_squad_id: squad.id,
          logo_url: squad.logo_url,
        },
        members: squadMembers.map((m, index) => ({
          ign: m.profile?.ign || 'Unknown',
          mlbb_id: m.profile?.mlbb_id || '',
          role: index < 5 ? 'main' : 'substitute',
          position: index + 1,
          user_id: m.user_id,
        })),
      });

      // Register for tournament
      await registerForTournament.mutateAsync({
        tournamentId: tournament.id,
        squadId: tournamentSquad.id,
      });

      toast.success('Squad registered successfully!', {
        description: 'Your registration is pending approval from the host.',
      });
      onSuccess();
    } catch (error: any) {
      toast.error('Failed to register', { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectExistingTournamentSquad = async () => {
    if (!selectedTournamentSquadId) return;
    
    setIsSubmitting(true);
    try {
      await registerForTournament.mutateAsync({
        tournamentId: tournament.id,
        squadId: selectedTournamentSquadId,
      });

      toast.success('Squad registered successfully!');
      onSuccess();
    } catch (error: any) {
      toast.error('Failed to register', { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if user can register
  if (!myProfile) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
          <div>
            <h4 className="font-semibold text-destructive">Profile Required</h4>
            <p className="text-sm text-muted-foreground mt-1">
              You must create a profile before registering for tournaments.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/create-profile">
                <UserPlus className="w-4 h-4 mr-2" />
                Create Profile
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasRequiredContacts) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
          <div>
            <h4 className="font-semibold text-destructive">WhatsApp Required</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Leaders and co-leaders must have WhatsApp contact info to register for tournaments.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/create-profile">
                <Phone className="w-4 h-4 mr-2" />
                Update Profile
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Choose registration method
  if (useExisting === null) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Register Your Squad
        </h3>

        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Only squad leaders and co-leaders can register for tournaments.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Use existing platform squad */}
            {mySquads && mySquads.length > 0 && (
              <button
                onClick={() => setUseExisting('existing_squad')}
                className="p-6 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <Users className="w-8 h-8 text-primary mb-3" />
                <h4 className="font-semibold text-foreground mb-1">
                  Use Your Squad
                </h4>
                <p className="text-sm text-muted-foreground">
                  Register with your existing squad ({mySquads.length} squad{mySquads.length > 1 ? 's' : ''} available)
                </p>
              </button>
            )}

            {/* Use existing tournament squad */}
            {myTournamentSquads && myTournamentSquads.length > 0 && (
              <button
                onClick={() => setUseExisting('tournament_squad')}
                className="p-6 rounded-xl border border-border bg-card hover:border-secondary hover:bg-secondary/5 transition-all text-left group"
              >
                <Shield className="w-8 h-8 text-secondary mb-3" />
                <h4 className="font-semibold text-foreground mb-1">
                  Previous Tournament Squad
                </h4>
                <p className="text-sm text-muted-foreground">
                  Reuse a squad from a previous tournament
                </p>
              </button>
            )}
          </div>

          {/* No squads available */}
          {(!mySquads || mySquads.length === 0) && (
            <div className="p-4 bg-muted rounded-lg border border-border">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    You don't have a squad yet. Create a squad and add at least 5 registered players to participate.
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link to="/create-squad">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Squad
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step 2a: Select existing platform squad
  if (useExisting === 'existing_squad') {
    return (
      <div className="glass-card p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setUseExisting(null);
            setSelectedSquadId('');
          }}
          className="mb-4"
        >
          ← Back
        </Button>

        <h3 className="text-lg font-semibold text-foreground mb-4">
          Select Your Squad
        </h3>

        <div className="space-y-4">
          <Select value={selectedSquadId} onValueChange={setSelectedSquadId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a squad" />
            </SelectTrigger>
            <SelectContent>
              {mySquads?.map((squad) => (
                <SelectItem key={squad.id} value={squad.id}>
                  {squad.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Squad preview and validation */}
          {selectedSquadId && squadMembers && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Crown className="w-4 h-4 text-secondary" />
                  Squad Roster ({squadMembers.length} players)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Validation errors */}
                {!squadValidation.valid && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-destructive">Cannot register:</p>
                        <ul className="list-disc list-inside mt-1 text-muted-foreground">
                          {squadValidation.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Leaders/Co-leaders */}
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Leaders & Co-Leaders (Contact Points)</p>
                  <div className="space-y-2">
                    {leadersAndCoLeaders.map((member) => {
                      const contacts = typeof member.profile?.contacts === 'string'
                        ? JSON.parse(member.profile.contacts)
                        : member.profile?.contacts || [];
                      const whatsapp = contacts.find((c: any) => c.type === 'whatsapp')?.value;
                      const discord = contacts.find((c: any) => c.type === 'discord')?.value;

                      return (
                        <div key={member.id} className="flex items-center gap-3 p-2 bg-primary/5 rounded-lg">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.profile?.avatar_url || undefined} />
                            <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {member.profile?.ign || 'Unknown'}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {SQUAD_MEMBER_ROLE_LABELS[member.role]}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {whatsapp && (
                              <Phone className="w-4 h-4 text-green-500" />
                            )}
                            {discord && (
                              <MessageCircle className="w-4 h-4 text-indigo-500" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* All members */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">All Members</p>
                  <div className="grid grid-cols-2 gap-2">
                    {squadMembers.map((member, index) => (
                      <div key={member.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback><User className="w-3 h-3" /></AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">{member.profile?.ign || 'Unknown'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handleRegisterExistingSquad}
            disabled={!selectedSquadId || !squadValidation.valid || isSubmitting}
            className="w-full btn-gaming"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Register for Tournament
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Step 2b: Select existing tournament squad
  if (useExisting === 'tournament_squad') {
    return (
      <div className="glass-card p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setUseExisting(null);
            setSelectedTournamentSquadId('');
          }}
          className="mb-4"
        >
          ← Back
        </Button>

        <h3 className="text-lg font-semibold text-foreground mb-4">
          Select Tournament Squad
        </h3>

        <div className="space-y-4">
          <Select value={selectedTournamentSquadId} onValueChange={setSelectedTournamentSquadId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a squad" />
            </SelectTrigger>
            <SelectContent>
              {myTournamentSquads?.map((squad) => (
                <SelectItem key={squad.id} value={squad.id}>
                  {squad.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleSelectExistingTournamentSquad}
            disabled={!selectedTournamentSquadId || isSubmitting}
            className="w-full btn-gaming"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Register for Tournament
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
