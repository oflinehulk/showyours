import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import { useSquadMembers } from '@/hooks/useSquadMembers';
import {
  useRegisterForTournament,
  useTournamentRegistrations,
} from '@/hooks/useTournaments';
import { hasContactType, getContactValue } from '@/lib/contacts';
import { 
  Users, 
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
import { toast } from 'sonner';
import type { Tournament } from '@/lib/tournament-types';

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
  const registerForTournament = useRegisterForTournament();

  const [selectedSquadId, setSelectedSquadId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing registrations to check for duplicates
  const { data: existingRegistrations } = useTournamentRegistrations(tournament.id);

  // Get members of selected squad
  const { data: squadMembers } = useSquadMembers(selectedSquadId || undefined);

  // Check if user is leader/co-leader of selected squad
  const isLeaderOrCoLeader = useMemo(() => {
    if (!squadMembers || !user) return false;
    const myMembership = squadMembers.find(m => m.user_id === user.id);
    return myMembership?.role === 'leader' || myMembership?.role === 'co_leader';
  }, [squadMembers, user]);

  // Check if user has WhatsApp contact
  const hasRequiredContacts = useMemo(() => {
    return hasContactType(myProfile?.contacts, 'whatsapp');
  }, [myProfile]);

  // Get leaders and co-leaders from squad members
  const leadersAndCoLeaders = useMemo(() => {
    if (!squadMembers) return [];
    return squadMembers.filter(m => m.role === 'leader' || m.role === 'co_leader');
  }, [squadMembers]);

  // Check if all leaders have required contacts (check both profile contacts and manual whatsapp field)
  const allLeadersHaveContacts = useMemo(() => {
    if (!leadersAndCoLeaders.length) return false;
    return leadersAndCoLeaders.every(member => {
      const isManual = !member.profile_id;
      if (isManual) return !!member.whatsapp;
      return hasContactType(member.profile?.contacts, 'whatsapp');
    });
  }, [leadersAndCoLeaders]);

  // Check which of user's squads are already registered
  const alreadyRegisteredSquadIds = useMemo(() => {
    if (!existingRegistrations) return new Set<string>();
    return new Set(
      existingRegistrations
        .map((r) => r.tournament_squads?.existing_squad_id)
        .filter(Boolean) as string[]
    );
  }, [existingRegistrations]);

  // Filter squads - exclude already registered ones
  const eligibleSquads = useMemo(() => {
    if (!mySquads) return [];
    return mySquads.filter((s) => !alreadyRegisteredSquadIds.has(s.id));
  }, [mySquads, alreadyRegisteredSquadIds]);

  // Validate squad for tournament registration
  const squadValidation = useMemo(() => {
    if (!squadMembers) return { valid: false, errors: [] as string[] };
    
    const errors: string[] = [];
    
    // Check minimum 5 members
    if (squadMembers.length < 5) {
      errors.push(`Minimum 5 players required (currently ${squadMembers.length})`);
    }
    
    // Check user is leader/co-leader
    if (!isLeaderOrCoLeader) {
      errors.push('Only leaders or co-leaders can register for tournaments');
    }
    
    // Check leaders have contacts
    if (!allLeadersHaveContacts) {
      errors.push('All leaders/co-leaders must have WhatsApp contact in their profile');
    }
    
    return { valid: errors.length === 0, errors };
  }, [squadMembers, allLeadersHaveContacts, isLeaderOrCoLeader]);

  const handleRegister = async () => {
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

      // Double-check duplicate on submit
      if (alreadyRegisteredSquadIds.has(squad.id)) {
        toast.error('This squad is already registered for this tournament');
        setIsSubmitting(false);
        return;
      }

      // Register atomically via RPC (creates squad, members, and registration in one transaction)
      await registerForTournament.mutateAsync({
        tournamentId: tournament.id,
        squadName: squad.name,
        existingSquadId: squad.id,
        logoUrl: squad.logo_url,
        members: squadMembers.map((m, index) => ({
          ign: m.profile?.ign || m.ign || 'Unknown',
          mlbb_id: m.profile?.mlbb_id || m.mlbb_id || '',
          role: index < 5 ? 'main' : 'substitute',
          position: index + 1,
          user_id: m.user_id,
        })),
      });

      toast.success('Squad registered successfully!', {
        description: 'Your registration is pending approval from the host.',
      });
      onSuccess();
    } catch (error: unknown) {
      toast.error('Failed to register', { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if user can register - profile required
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

  // No squads or all already registered
  if (!mySquads || mySquads.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg border border-border">
          <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <h4 className="font-semibold text-foreground">No Squad Found</h4>
            <p className="text-sm text-muted-foreground mt-1">
              You must have a squad with at least 5 registered members to participate in tournaments.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/create-squad">
                <Shield className="w-4 h-4 mr-2" />
                Create Squad
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (eligibleSquads.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <Check className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <h4 className="font-semibold text-foreground">Already Registered</h4>
            <p className="text-sm text-muted-foreground mt-1">
              All your squads are already registered for this tournament.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        Register Your Squad
      </h3>

      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Only squad leaders and co-leaders can register. Your squad must have at least 5 registered members.
        </p>

        {/* Squad Selection */}
        <div>
          <Select value={selectedSquadId} onValueChange={setSelectedSquadId}>
            <SelectTrigger className="min-h-[48px] text-base">
              <SelectValue placeholder="Select your squad" />
            </SelectTrigger>
            <SelectContent>
              {eligibleSquads.map((squad) => (
                <SelectItem key={squad.id} value={squad.id}>
                  {squad.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
                <div className="mb-4 p-4 bg-destructive/10 border-l-4 border-destructive rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-destructive mb-1">Cannot register:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
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
                    const isManual = !member.profile_id;
                    const whatsapp = isManual ? member.whatsapp : getContactValue(member.profile?.contacts, 'whatsapp');
                    const discord = isManual ? undefined : getContactValue(member.profile?.contacts, 'discord');

                    return (
                      <div key={member.id} className="flex items-center gap-3 p-2 bg-primary/5 rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {member.profile?.ign || member.ign || 'Unknown'}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {SQUAD_MEMBER_ROLE_LABELS[member.role]}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {whatsapp ? (
                            <Phone className="w-4 h-4 text-primary" />
                          ) : (
                            <Phone className="w-4 h-4 text-destructive" />
                          )}
                          {discord && (
                            <MessageCircle className="w-4 h-4 text-secondary" />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {squadMembers.map((member, index) => (
                    <div key={member.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                      <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback><User className="w-3 h-3" /></AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate">{member.profile?.ign || member.ign || 'Unknown'}</span>
                      {index >= 5 && (
                        <Badge variant="secondary" className="text-xs ml-auto">Sub</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          onClick={handleRegister}
          disabled={!selectedSquadId || !squadValidation.valid || isSubmitting}
          className="w-full btn-gaming min-h-[48px] text-base"
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
