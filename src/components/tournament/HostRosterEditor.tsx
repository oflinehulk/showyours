import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  useTournamentSquadMembers,
  useHostEditRoster,
} from '@/hooks/useTournaments';
import {
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  Loader2,
  Crown,
  Pencil,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { TournamentSquad, TournamentRegistration } from '@/lib/tournament-types';

interface HostRosterEditorProps {
  tournamentId: string;
  registration: TournamentRegistration & { tournament_squads: TournamentSquad };
}

type EditorAction = 'add' | 'swap' | null;

export function HostRosterEditor({ tournamentId, registration }: HostRosterEditorProps) {
  const squad = registration.tournament_squads;
  const { data: members, isLoading } = useTournamentSquadMembers(registration.tournament_squad_id);
  const editRoster = useHostEditRoster();

  const [action, setAction] = useState<EditorAction>(null);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [newIgn, setNewIgn] = useState('');
  const [newMlbbId, setNewMlbbId] = useState('');
  const [newRole, setNewRole] = useState<'main' | 'substitute'>('substitute');
  const [sheetOpen, setSheetOpen] = useState(false);

  const resetForm = () => {
    setAction(null);
    setSelectedMemberId('');
    setNewIgn('');
    setNewMlbbId('');
    setNewRole('substitute');
  };

  const handleRemove = async (memberId: string, memberIgn: string) => {
    try {
      await editRoster.mutateAsync({
        tournamentId,
        tournamentSquadId: registration.tournament_squad_id,
        action: 'remove',
        memberId,
        reason: `Removed by host`,
      });
      toast.success(`${memberIgn} removed from roster`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove player');
    }
  };

  const handleSubmitAction = async () => {
    if (!action) return;

    if (action === 'swap' && !selectedMemberId) {
      toast.error('Select a player to replace');
      return;
    }
    if (!newIgn.trim() || !newMlbbId.trim()) {
      toast.error('Fill in IGN and MLBB ID');
      return;
    }

    try {
      await editRoster.mutateAsync({
        tournamentId,
        tournamentSquadId: registration.tournament_squad_id,
        action,
        memberId: action === 'swap' ? selectedMemberId : undefined,
        newIgn: newIgn.trim(),
        newMlbbId: newMlbbId.trim(),
        newRole,
        reason: `${action === 'add' ? 'Added' : 'Swapped'} by host`,
      });
      toast.success(action === 'add' ? 'Player added to roster' : 'Player swapped successfully');
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action} player`);
    }
  };

  const activeMembers = members?.filter(m => m.member_status === 'active') || [];

  return (
    <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) resetForm(); }}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8">
          <Pencil className="w-3 h-3" />
          Edit Roster
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={squad.logo_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {squad.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <SheetTitle className="text-base">{squad.name}</SheetTitle>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Members */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Active Roster ({activeMembers.length})
              </h4>
              <div className="space-y-1.5">
                {activeMembers.map((member) => (
                  <div
                    key={member.id}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border border-border/50",
                      member.role === 'main' ? 'bg-muted/40' : 'bg-muted/20'
                    )}
                  >
                    <span className="text-xs text-muted-foreground w-5 text-center">
                      {member.position}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{member.ign}</span>
                      <span className="text-xs text-muted-foreground">#{member.mlbb_id}</span>
                    </div>
                    <Badge
                      variant={member.role === 'main' ? 'default' : 'secondary'}
                      className="text-[10px] shrink-0"
                    >
                      {member.role === 'main' ? 'Main' : 'Sub'}
                    </Badge>

                    {/* Swap button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
                      onClick={() => {
                        setAction('swap');
                        setSelectedMemberId(member.id);
                        setNewIgn('');
                        setNewMlbbId('');
                        setNewRole(member.role as 'main' | 'substitute');
                      }}
                      title="Swap player"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </Button>

                    {/* Remove button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          title="Remove player"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove {member.ign}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove {member.ign} (#{member.mlbb_id}) from the locked roster.
                            This action is logged in the audit trail.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemove(member.id, member.ign)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            </div>

            {/* Swap Form (shown when a member is selected for swap) */}
            {action === 'swap' && selectedMemberId && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-primary" />
                    Swap: {activeMembers.find(m => m.id === selectedMemberId)?.ign}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">New IGN</label>
                      <Input
                        value={newIgn}
                        onChange={e => setNewIgn(e.target.value)}
                        placeholder="Player name"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">MLBB ID</label>
                      <Input
                        value={newMlbbId}
                        onChange={e => setNewMlbbId(e.target.value)}
                        placeholder="123456789"
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSubmitAction}
                      disabled={editRoster.isPending || !newIgn.trim() || !newMlbbId.trim()}
                      className="flex-1"
                    >
                      {editRoster.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                      Confirm Swap
                    </Button>
                    <Button size="sm" variant="ghost" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Add Player Form */}
            {action === 'add' && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-primary" />
                    Add New Player
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">IGN</label>
                      <Input
                        value={newIgn}
                        onChange={e => setNewIgn(e.target.value)}
                        placeholder="Player name"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">MLBB ID</label>
                      <Input
                        value={newMlbbId}
                        onChange={e => setNewMlbbId(e.target.value)}
                        placeholder="123456789"
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Role</label>
                    <Select value={newRole} onValueChange={(v) => setNewRole(v as 'main' | 'substitute')}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">Main</SelectItem>
                        <SelectItem value="substitute">Substitute</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSubmitAction}
                      disabled={editRoster.isPending || !newIgn.trim() || !newMlbbId.trim()}
                      className="flex-1"
                    >
                      {editRoster.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                      Add Player
                    </Button>
                    <Button size="sm" variant="ghost" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Add Player button (only visible when no form is active) */}
            {!action && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  setAction('add');
                  setNewIgn('');
                  setNewMlbbId('');
                  setNewRole('substitute');
                }}
              >
                <UserPlus className="w-4 h-4" />
                Add Player to Roster
              </Button>
            )}

            <p className="text-[10px] text-muted-foreground text-center pt-2">
              All changes are logged in the tournament audit trail.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
