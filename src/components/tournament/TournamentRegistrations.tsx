import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  useUpdateRegistrationStatus, 
  useTournamentSquadMembers 
} from '@/hooks/useTournaments';
import { useSquadMembers } from '@/hooks/useSquadMembers';
import { 
  Check, 
  X, 
  Users, 
  Eye,
  Loader2,
  Shield,
  Crown,
  Phone,
  MessageCircle,
  User,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { TournamentRegistration, TournamentSquad, TournamentSquadMember } from '@/lib/tournament-types';

interface TournamentRegistrationsProps {
  tournamentId: string;
  registrations: (TournamentRegistration & { tournament_squads: TournamentSquad })[];
  isHost: boolean;
}

export function TournamentRegistrations({
  tournamentId,
  registrations,
  isHost,
}: TournamentRegistrationsProps) {
  const updateStatus = useUpdateRegistrationStatus();
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [selectedExistingSquadId, setSelectedExistingSquadId] = useState<string | null>(null);

  const handleApprove = async (registrationId: string) => {
    try {
      await updateStatus.mutateAsync({
        registrationId,
        status: 'approved',
        tournamentId,
      });
      toast.success('Registration approved');
    } catch (error: any) {
      toast.error('Failed to approve', { description: error.message });
    }
  };

  const handleReject = async (registrationId: string) => {
    try {
      await updateStatus.mutateAsync({
        registrationId,
        status: 'rejected',
        tournamentId,
      });
      toast.success('Registration rejected');
    } catch (error: any) {
      toast.error('Failed to reject', { description: error.message });
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    approved: 'bg-green-500/20 text-green-400 border-green-500/30',
    rejected: 'bg-destructive/20 text-destructive border-destructive/30',
  };

  if (registrations.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No registrations yet</h3>
        <p className="text-muted-foreground text-sm">
          Squads will appear here once they register for the tournament.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Squad</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Registered</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registrations.map((reg) => (
            <TableRow key={reg.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {reg.tournament_squads.logo_url ? (
                    <img
                      src={reg.tournament_squads.logo_url}
                      alt={reg.tournament_squads.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Shield className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <span className="font-medium text-foreground">
                    {reg.tournament_squads.name}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn(statusColors[reg.status])}>
                  {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(reg.registered_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedSquadId(reg.tournament_squad_id);
                          setSelectedExistingSquadId(reg.tournament_squads.existing_squad_id);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>{reg.tournament_squads.name} Roster</DialogTitle>
                        <DialogDescription>
                          View the team's player roster and contact leaders
                        </DialogDescription>
                      </DialogHeader>
                      <SquadRosterView 
                        tournamentSquadId={reg.tournament_squad_id} 
                        existingSquadId={reg.tournament_squads.existing_squad_id}
                        isHost={isHost}
                      />
                    </DialogContent>
                  </Dialog>

                  {isHost && reg.status === 'pending' && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleApprove(reg.id)}
                        disabled={updateStatus.isPending}
                        className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                      >
                        {updateStatus.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleReject(reg.id)}
                        disabled={updateStatus.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface SquadRosterViewProps {
  tournamentSquadId: string;
  existingSquadId: string | null;
  isHost: boolean;
}

function SquadRosterView({ tournamentSquadId, existingSquadId, isHost }: SquadRosterViewProps) {
  const { data: tournamentMembers, isLoading: tournamentLoading } = useTournamentSquadMembers(tournamentSquadId);
  const { data: squadMembers, isLoading: squadLoading } = useSquadMembers(existingSquadId || undefined);

  const isLoading = tournamentLoading || squadLoading;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  // Show linked squad members if available (with profiles)
  if (existingSquadId && squadMembers && squadMembers.length > 0) {
    const leaders = squadMembers.filter(m => m.role === 'leader' || m.role === 'co_leader');
    const members = squadMembers.filter(m => m.role === 'member');

    const getWhatsAppNumber = (contacts: any) => {
      const parsed = typeof contacts === 'string' ? JSON.parse(contacts) : contacts;
      return parsed?.find?.((c: any) => c.type === 'whatsapp')?.value;
    };

    const getDiscordId = (contacts: any) => {
      const parsed = typeof contacts === 'string' ? JSON.parse(contacts) : contacts;
      return parsed?.find?.((c: any) => c.type === 'discord')?.value;
    };

    return (
      <div className="space-y-4">
        {/* Leaders/Co-Leaders with contact info */}
        {leaders.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              Leaders & Co-Leaders
            </h4>
            <div className="space-y-2">
              {leaders.map((member) => {
                const whatsapp = getWhatsAppNumber(member.profile?.contacts);
                const discord = getDiscordId(member.profile?.contacts);

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
                  >
                    <Link to={`/player/${member.profile?.id}`}>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link 
                        to={`/player/${member.profile?.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {member.profile?.ign || 'Unknown'}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {member.role === 'leader' ? 'Leader' : 'Co-Leader'}
                      </p>
                    </div>
                    
                    {/* Contact buttons - visible to host */}
                    {isHost && (
                      <div className="flex items-center gap-1">
                        {whatsapp && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <a
                              href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`WhatsApp: ${whatsapp}`}
                            >
                              <Phone className="w-4 h-4 text-green-500" />
                            </a>
                          </Button>
                        )}
                        {discord && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              navigator.clipboard.writeText(discord);
                              toast.success('Discord ID copied!');
                            }}
                            title={`Discord: ${discord}`}
                          >
                            <MessageCircle className="w-4 h-4 text-indigo-500" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Regular Members */}
        {members.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Members
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {members.map((member) => (
                <Link
                  key={member.id}
                  to={`/player/${member.profile?.id}`}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.profile?.avatar_url || undefined} />
                    <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">{member.profile?.ign || 'Unknown'}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback to tournament squad members (old format without profiles)
  if (!tournamentMembers || tournamentMembers.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No roster data</p>;
  }

  const mainPlayers = tournamentMembers.filter(m => m.role === 'main');
  const substitutes = tournamentMembers.filter(m => m.role === 'substitute');

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">Main Players</h4>
        <div className="space-y-2">
          {mainPlayers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20"
            >
              <span className="font-medium text-foreground">{member.ign}</span>
              <span className="text-sm text-muted-foreground">ID: {member.mlbb_id}</span>
            </div>
          ))}
        </div>
      </div>

      {substitutes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Substitutes</h4>
          <div className="space-y-2">
            {substitutes.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/5 border border-secondary/20"
              >
                <span className="font-medium text-foreground">{member.ign}</span>
                <span className="text-sm text-muted-foreground">ID: {member.mlbb_id}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
