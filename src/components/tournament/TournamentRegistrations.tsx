import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  useUpdateRegistrationStatus, 
  useTournamentSquadMembers,
  useDeleteRegistration,
} from '@/hooks/useTournaments';
import { useSquadMembers } from '@/hooks/useSquadMembers';
import { getContactValue } from '@/lib/contacts';
import { captureAndDownload, captureAndShare } from '@/lib/screenshot';
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
  Trash2,
  AlertTriangle,
  Hash,
  Download,
  Share2,
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
  const deleteRegistration = useDeleteRegistration();
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [selectedExistingSquadId, setSelectedExistingSquadId] = useState<string | null>(null);
  const teamsRef = useRef<HTMLDivElement>(null);
  const screenshotRef = useRef<HTMLDivElement>(null);

  const handleApprove = async (registrationId: string) => {
    try {
      await updateStatus.mutateAsync({ registrationId, status: 'approved', tournamentId });
      toast.success('Registration approved');
    } catch (error: any) {
      toast.error('Failed to approve', { description: error.message });
    }
  };

  const handleReject = async (registrationId: string) => {
    try {
      await updateStatus.mutateAsync({ registrationId, status: 'rejected', tournamentId });
      toast.success('Registration rejected');
    } catch (error: any) {
      toast.error('Failed to reject', { description: error.message });
    }
  };

  const handleDelete = async (registrationId: string) => {
    try {
      await deleteRegistration.mutateAsync({ registrationId, tournamentId });
      toast.success('Registration removed');
    } catch (error: any) {
      toast.error('Failed to remove', { description: error.message });
    }
  };

  const statusConfig: Record<string, { color: string; label: string }> = {
    pending: { color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: 'Pending' },
    approved: { color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'Approved' },
    rejected: { color: 'bg-destructive/15 text-destructive border-destructive/30', label: 'Rejected' },
  };

  if (registrations.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">No Teams Registered</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Squads will appear here once they register for the tournament.
        </p>
      </div>
    );
  }

  const approved = registrations.filter(r => r.status === 'approved');
  const pending = registrations.filter(r => r.status === 'pending');
  const rejected = registrations.filter(r => r.status === 'rejected');

  const renderTeamCard = (reg: typeof registrations[0], index: number) => {
    const status = statusConfig[reg.status];
    
    return (
      <div
        key={reg.id}
        className={cn(
          "glass-card p-4 flex items-center gap-4 transition-all duration-200 hover:border-primary/30",
          reg.status === 'approved' && "border-l-2 border-l-emerald-500/50"
        )}
      >
        {/* Seed number for approved */}
        {reg.status === 'approved' && (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">#{index + 1}</span>
          </div>
        )}

        {/* Squad logo */}
        {reg.tournament_squads.logo_url ? (
          <img
            src={reg.tournament_squads.logo_url}
            alt={reg.tournament_squads.name}
            loading="lazy"
            className="w-12 h-12 rounded-xl object-cover border border-border/50 shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-muted/80 flex items-center justify-center border border-border/50 shrink-0">
            <Shield className="w-6 h-6 text-muted-foreground" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-foreground truncate">{reg.tournament_squads.name}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registered {new Date(reg.registered_at).toLocaleDateString()}
          </p>
        </div>

        {/* Status */}
        <Badge variant="outline" className={cn('text-xs shrink-0', status.color)}>
          {status.label}
        </Badge>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
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
                <DialogTitle className="flex items-center gap-2">
                  {reg.tournament_squads.logo_url && (
                    <img src={reg.tournament_squads.logo_url} alt="" loading="lazy" className="w-8 h-8 rounded-lg object-cover" />
                  )}
                  {reg.tournament_squads.name}
                </DialogTitle>
                <DialogDescription>
                  Team roster and contact information
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
                className="h-9 w-9 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              >
                {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleReject(reg.id)}
                disabled={updateStatus.isPending}
                className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}

          {isHost && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Remove Registration?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove <strong>{reg.tournament_squads.name}</strong> from the tournament. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(reg.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" ref={teamsRef}>
      {/* Summary bar with screenshot actions */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Approved</span>
          <span className="font-bold text-foreground">{approved.length}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Pending</span>
          <span className="font-bold text-foreground">{pending.length}</span>
        </div>
        {rejected.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Rejected</span>
            <span className="font-bold text-foreground">{rejected.length}</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Total: <span className="font-bold text-foreground">{registrations.length}</span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Download screenshot"
            onClick={() => screenshotRef.current && captureAndDownload(screenshotRef.current, `tournament-teams-${registrations.length}`)}
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Share screenshot"
            onClick={() => screenshotRef.current && captureAndShare(screenshotRef.current, `tournament-teams-${registrations.length}`)}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Approved Teams */}
      {approved.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Approved Teams
          </h3>
          <div className="space-y-2">
            {approved.map((reg, i) => renderTeamCard(reg, i))}
          </div>
        </div>
      )}

      {/* Pending Teams */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4" />
            Pending Approval
          </h3>
          <div className="space-y-2">
            {pending.map((reg, i) => renderTeamCard(reg, i))}
          </div>
        </div>
      )}

      {/* Rejected Teams */}
      {rejected.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-3 flex items-center gap-2">
            <X className="w-4 h-4" />
            Rejected
          </h3>
          <div className="space-y-2">
            {rejected.map((reg, i) => renderTeamCard(reg, i))}
          </div>
        </div>
      )}

      {/* Hidden off-screen render target for screenshots */}
      <div
        ref={screenshotRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '480px',
          backgroundColor: '#0a0a0a',
          fontFamily: 'Rajdhani, sans-serif',
        }}
      >
        <div style={{ padding: '24px', border: '1px solid rgba(255,69,0,0.3)', borderRadius: '12px' }}>
          {/* Header */}
          <div style={{ color: '#FF4500', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px' }}>
            Registered Teams
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '12px' }}>
            <span style={{ color: '#10b981' }}>Approved: {approved.length}</span>
            <span style={{ color: '#f59e0b' }}>Pending: {pending.length}</span>
            {rejected.length > 0 && <span style={{ color: '#ef4444' }}>Rejected: {rejected.length}</span>}
            <span style={{ color: '#888', marginLeft: 'auto' }}>Total: {registrations.length}</span>
          </div>

          {/* Separator */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(255,69,0,0.4), transparent)', marginBottom: '16px' }} />

          {/* Approved list */}
          {approved.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#10b981', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px' }}>
                Approved
              </div>
              {approved.map((reg, i) => (
                <div
                  key={reg.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    marginBottom: '4px',
                    backgroundColor: 'rgba(16,185,129,0.08)',
                    borderLeft: '3px solid rgba(16,185,129,0.5)',
                  }}
                >
                  <span style={{ color: '#FF4500', fontWeight: 700, fontSize: '13px', minWidth: '28px' }}>#{i + 1}</span>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px', wordBreak: 'break-word' }}>
                    {reg.tournament_squads.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Pending list */}
          {pending.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#f59e0b', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px' }}>
                Pending
              </div>
              {pending.map((reg) => (
                <div
                  key={reg.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    marginBottom: '4px',
                    backgroundColor: 'rgba(245,158,11,0.08)',
                  }}
                >
                  <span style={{ color: '#aaa', fontWeight: 600, fontSize: '14px', wordBreak: 'break-word' }}>
                    {reg.tournament_squads.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Rejected list */}
          {rejected.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#ef4444', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px' }}>
                Rejected
              </div>
              {rejected.map((reg) => (
                <div
                  key={reg.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    marginBottom: '4px',
                    backgroundColor: 'rgba(239,68,68,0.08)',
                  }}
                >
                  <span style={{ color: '#888', fontWeight: 600, fontSize: '14px', textDecoration: 'line-through', wordBreak: 'break-word' }}>
                    {reg.tournament_squads.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Branding footer */}
          <div style={{ borderTop: '1px solid rgba(255,69,0,0.2)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#FF4500', fontSize: '10px', letterSpacing: '0.25em', fontWeight: 700, textTransform: 'uppercase' }}>
              ShowYours
            </span>
            <span style={{ color: '#444', fontSize: '9px' }}>
              showyours.lovable.app
            </span>
          </div>
        </div>
      </div>
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

  if (existingSquadId && squadMembers && squadMembers.length > 0) {
    const leaders = squadMembers.filter(m => m.role === 'leader' || m.role === 'co_leader');
    const members = squadMembers.filter(m => m.role === 'member');

    const getWhatsAppNumber = (member: typeof squadMembers[0]) => {
      if (!member.profile_id) return member.whatsapp || null;
      return getContactValue(member.profile?.contacts, 'whatsapp');
    };
    const getDiscordId = (member: typeof squadMembers[0]) => {
      if (!member.profile_id) return null;
      return getContactValue(member.profile?.contacts, 'discord');
    };
    const getMemberIGN = (member: typeof squadMembers[0]) => member.profile?.ign || member.ign || 'Unknown';

    return (
      <div className="space-y-4">
        {leaders.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              Leaders & Co-Leaders
            </h4>
            <div className="space-y-2">
              {leaders.map((member) => {
                const whatsapp = getWhatsAppNumber(member);
                const discord = getDiscordId(member);
                return (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    {member.profile_id ? (
                      <Link to={`/player/${member.profile?.id}`}>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                        </Avatar>
                      </Link>
                    ) : (
                      <Link to={`/player/${member.id}`}>
                        <Avatar className="h-10 w-10">
                          <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                        </Avatar>
                      </Link>
                    )}
                    <div className="flex-1 min-w-0">
                      {member.profile_id ? (
                        <Link to={`/player/${member.profile?.id}`} className="font-medium text-foreground hover:text-primary">
                          {getMemberIGN(member)}
                        </Link>
                      ) : (
                        <Link to={`/player/${member.id}`} className="font-medium text-foreground hover:text-primary">
                          {getMemberIGN(member)}
                        </Link>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {member.role === 'leader' ? 'Leader' : 'Co-Leader'}
                      </p>
                    </div>
                    {isHost && (
                      <div className="flex items-center gap-1">
                        {whatsapp && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" title={`WhatsApp: ${whatsapp}`}>
                              <Phone className="w-4 h-4 text-green-500" />
                            </a>
                          </Button>
                        )}
                        {discord && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(discord); toast.success('Discord ID copied!'); }} title={`Discord: ${discord}`}>
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

        {members.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Members
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {members.map((member) => {
                const ign = getMemberIGN(member);
                const linkTo = member.profile_id ? `/player/${member.profile?.id}` : `/player/${member.id}`;
                return (
                  <Link key={member.id} to={linkTo} className="flex items-center gap-2 p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                    <Avatar className="h-8 w-8">
                      {member.profile_id && <AvatarImage src={member.profile?.avatar_url || undefined} />}
                      <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">{ign}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

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
            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
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
              <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/5 border border-secondary/20">
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
