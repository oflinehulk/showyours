import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  useUpdateTournament,
  useGenerateBracket,
  useDeleteTournament,
  useUpdateRegistrationSeed,
  useAutoSeedByRegistrationOrder,
  useWithdrawSquad,
} from '@/hooks/useTournaments';
import {
  Settings,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Shuffle,
  Loader2,
  Trash2,
  AlertTriangle,
  ListOrdered,
  UserMinus,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { Tournament, TournamentRegistration, TournamentSquad, TournamentFormat } from '@/lib/tournament-types';
import { TOURNAMENT_FORMAT_LABELS } from '@/lib/tournament-types';

interface TournamentHostControlsProps {
  tournament: Tournament;
  registrations: (TournamentRegistration & { tournament_squads: TournamentSquad })[];
}

export function TournamentHostControls({ tournament, registrations }: TournamentHostControlsProps) {
  const navigate = useNavigate();
  const updateTournament = useUpdateTournament();
  const generateBracket = useGenerateBracket();
  const deleteTournament = useDeleteTournament();
  const updateSeed = useUpdateRegistrationSeed();
  const autoSeed = useAutoSeedByRegistrationOrder();
  const withdrawSquad = useWithdrawSquad();

  const [selectedFormat, setSelectedFormat] = useState<TournamentFormat>('single_elimination');

  const approvedRegistrations = registrations.filter(r => r.status === 'approved');
  const approvedCount = approvedRegistrations.length;
  const canGenerateBracket =
    tournament.status === 'registration_closed' &&
    approvedCount >= 2;

  const handleCloseRegistration = async () => {
    try {
      await updateTournament.mutateAsync({
        id: tournament.id,
        status: 'registration_closed',
      });
      toast.success('Registration closed');
    } catch (error: any) {
      toast.error('Failed to close registration', { description: error.message });
    }
  };

  const handleReopenRegistration = async () => {
    try {
      await updateTournament.mutateAsync({
        id: tournament.id,
        status: 'registration_open',
      });
      toast.success('Registration reopened');
    } catch (error: any) {
      toast.error('Failed to reopen registration', { description: error.message });
    }
  };

  const handleGenerateBracket = async () => {
    try {
      await generateBracket.mutateAsync({
        tournamentId: tournament.id,
        format: selectedFormat,
      });
      toast.success('Bracket generated!', {
        description: 'Matches have been created. You can now start the tournament.',
      });
    } catch (error: any) {
      toast.error('Failed to generate bracket', { description: error.message });
    }
  };

  const handleStartTournament = async () => {
    try {
      await updateTournament.mutateAsync({
        id: tournament.id,
        status: 'ongoing',
      });
      toast.success('Tournament started!');
    } catch (error: any) {
      toast.error('Failed to start tournament', { description: error.message });
    }
  };

  const handleCompleteTournament = async () => {
    try {
      await updateTournament.mutateAsync({
        id: tournament.id,
        status: 'completed',
      });
      toast.success('Tournament completed!');
    } catch (error: any) {
      toast.error('Failed to complete tournament', { description: error.message });
    }
  };

  const handleCancelTournament = async () => {
    try {
      await updateTournament.mutateAsync({
        id: tournament.id,
        status: 'cancelled',
      });
      toast.success('Tournament cancelled');
    } catch (error: any) {
      toast.error('Failed to cancel tournament', { description: error.message });
    }
  };

  const handleDeleteTournament = async () => {
    try {
      await deleteTournament.mutateAsync(tournament.id);
      toast.success('Tournament deleted');
      navigate('/tournaments');
    } catch (error: any) {
      toast.error('Failed to delete tournament', { description: error.message });
    }
  };

  const handleAutoSeed = async () => {
    try {
      await autoSeed.mutateAsync(tournament.id);
      toast.success('Seeds assigned by registration order');
    } catch (error: any) {
      toast.error('Failed to auto-seed', { description: error.message });
    }
  };

  const handleSeedChange = async (registrationId: string, value: string) => {
    const seed = value === '' ? null : parseInt(value);
    if (value !== '' && (isNaN(seed!) || seed! < 1)) return;
    try {
      await updateSeed.mutateAsync({
        registrationId,
        seed,
        tournamentId: tournament.id,
      });
    } catch (error: any) {
      toast.error('Failed to update seed', { description: error.message });
    }
  };

  const handleWithdrawSquad = async (reg: TournamentRegistration & { tournament_squads: TournamentSquad }) => {
    try {
      await withdrawSquad.mutateAsync({
        registrationId: reg.id,
        squadId: reg.tournament_squad_id,
        tournamentId: tournament.id,
      });
      toast.success(`${reg.tournament_squads.name} withdrawn`, {
        description: 'All remaining matches have been forfeited.',
      });
    } catch (error: any) {
      toast.error('Failed to withdraw squad', { description: error.message });
    }
  };

  return (
    <div className="glass-card p-6 mb-6 border-secondary/30">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-secondary" />
        <h3 className="text-lg font-semibold text-foreground">Host Controls</h3>
      </div>

      {/* Step Progress Indicator */}
      <StepIndicator status={tournament.status} />

      {/* Stage-specific primary action */}
      <div className="mt-5 space-y-4">
        {/* Registration Open → Close Registration */}
        {tournament.status === 'registration_open' && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs text-muted-foreground mb-3">Next step: close registration to configure seeding and generate bracket.</p>
            <Button
              onClick={handleCloseRegistration}
              disabled={updateTournament.isPending}
              className="btn-gaming w-full sm:w-auto"
            >
              {updateTournament.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Pause className="w-4 h-4 mr-2" />
              )}
              Close Registration
            </Button>
          </div>
        )}

        {/* Registration Closed → Seeding + Format + Generate Bracket */}
        {tournament.status === 'registration_closed' && !tournament.format && (
          <div className="space-y-4">
            {/* Seeding Section */}
            {approvedCount > 0 && (
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-secondary" />
                    <h4 className="text-sm font-semibold text-foreground">Seeding</h4>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAutoSeed}
                      disabled={autoSeed.isPending}
                    >
                      {autoSeed.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <ListOrdered className="w-3 h-3 mr-1" />
                      )}
                      Auto-seed
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReopenRegistration}
                      disabled={updateTournament.isPending}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Reopen
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Assign seeds to control bracket placement. Leave empty for random.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {approvedRegistrations
                    .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
                    .map((reg) => (
                      <div key={reg.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <Input
                          type="number"
                          min={1}
                          max={approvedCount}
                          value={reg.seed ?? ''}
                          onChange={(e) => handleSeedChange(reg.id, e.target.value)}
                          className="w-12 h-7 text-center text-xs"
                          placeholder="#"
                        />
                        <Avatar className="h-5 w-5 shrink-0">
                          {reg.tournament_squads.logo_url ? (
                            <AvatarImage src={reg.tournament_squads.logo_url} alt={reg.tournament_squads.name} />
                          ) : null}
                          <AvatarFallback className="text-[9px] bg-[#1a1a1a] text-muted-foreground">
                            {reg.tournament_squads.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium truncate flex-1">
                          {reg.tournament_squads.name}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Format + Generate */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-3">
                Choose format and generate the bracket.
                {approvedCount < 2 && ` Need at least 2 approved squads (currently ${approvedCount}).`}
              </p>
              <div className="flex gap-2">
                <Select
                  value={selectedFormat}
                  onValueChange={(v) => setSelectedFormat(v as TournamentFormat)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TOURNAMENT_FORMAT_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleGenerateBracket}
                  disabled={!canGenerateBracket || generateBracket.isPending}
                  className="btn-gaming"
                >
                  {generateBracket.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Shuffle className="w-4 h-4 mr-2" />
                  )}
                  Generate Bracket
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bracket Generated → Start Tournament */}
        {tournament.status === 'bracket_generated' && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs text-muted-foreground mb-3">Bracket is ready. Start the tournament when all teams are prepared.</p>
            <Button
              onClick={handleStartTournament}
              disabled={updateTournament.isPending}
              className="btn-gaming w-full sm:w-auto"
            >
              {updateTournament.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Start Tournament
            </Button>
          </div>
        )}

        {/* Ongoing → Complete or manage squads */}
        {tournament.status === 'ongoing' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-3">Mark the tournament as complete once all matches are finished.</p>
              <Button
                onClick={handleCompleteTournament}
                disabled={updateTournament.isPending}
                className="w-full sm:w-auto"
              >
                {updateTournament.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Mark Completed
              </Button>
            </div>

            {/* Squad Withdrawal */}
            {approvedRegistrations.length > 0 && (
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <UserMinus className="w-4 h-4 text-destructive" />
                  <h4 className="text-sm font-semibold text-foreground">Withdraw Squad</h4>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Forfeit all remaining matches for a squad. Opponents get walkover wins.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {approvedRegistrations.map((reg) => (
                    <div key={reg.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Avatar className="h-5 w-5 shrink-0">
                          {reg.tournament_squads.logo_url ? (
                            <AvatarImage src={reg.tournament_squads.logo_url} alt={reg.tournament_squads.name} />
                          ) : null}
                          <AvatarFallback className="text-[9px] bg-[#1a1a1a] text-muted-foreground">
                            {reg.tournament_squads.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium truncate">
                          {reg.tournament_squads.name}
                        </span>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive h-7 px-2 text-xs hover:bg-destructive/10">
                            <UserMinus className="w-3 h-3 mr-1" />
                            Withdraw
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Withdraw {reg.tournament_squads.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will forfeit all remaining matches for this squad. Opponents will receive walkover wins and advance in the bracket. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleWithdrawSquad(reg)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Withdraw Squad
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bracket Generated — Squad Withdrawal also available */}
        {tournament.status === 'bracket_generated' && approvedRegistrations.length > 0 && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <UserMinus className="w-4 h-4 text-destructive" />
              <h4 className="text-sm font-semibold text-foreground">Withdraw Squad</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Forfeit all remaining matches for a squad. Opponents get walkover wins.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {approvedRegistrations.map((reg) => (
                <div key={reg.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Avatar className="h-5 w-5 shrink-0">
                      {reg.tournament_squads.logo_url ? (
                        <AvatarImage src={reg.tournament_squads.logo_url} alt={reg.tournament_squads.name} />
                      ) : null}
                      <AvatarFallback className="text-[9px] bg-[#1a1a1a] text-muted-foreground">
                        {reg.tournament_squads.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate">
                      {reg.tournament_squads.name}
                    </span>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive h-7 px-2 text-xs hover:bg-destructive/10">
                        <UserMinus className="w-3 h-3 mr-1" />
                        Withdraw
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Withdraw {reg.tournament_squads.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will forfeit all remaining matches for this squad. Opponents will receive walkover wins and advance in the bracket. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleWithdrawSquad(reg)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Withdraw Squad
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancel Tournament — available in pre-completion stages */}
        {['registration_open', 'registration_closed', 'bracket_generated', 'ongoing'].includes(tournament.status) && (
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10">
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Cancel Tournament
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Cancel Tournament?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will cancel the tournament and notify all registered squads. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Tournament</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelTournament}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Cancel Tournament
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Delete — only for cancelled/completed */}
        {(tournament.status === 'cancelled' || tournament.status === 'completed') && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Tournament
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Delete Tournament?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the tournament and all associated data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteTournament}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

// Step progress indicator
const STEPS = [
  { key: 'registration_open', label: 'Registration' },
  { key: 'registration_closed', label: 'Closed' },
  { key: 'bracket_generated', label: 'Bracket' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
] as const;

function StepIndicator({ status }: { status: string }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <XCircle className="w-4 h-4" />
        Tournament Cancelled
      </div>
    );
  }

  const currentIndex = STEPS.findIndex(s => s.key === status);

  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center">
            {i > 0 && (
              <div
                className={cn(
                  'w-6 h-px shrink-0',
                  isCompleted ? 'bg-green-500' : isCurrent ? 'bg-[#FF4500]/60' : 'bg-muted-foreground/20'
                )}
              />
            )}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                  isCompleted && 'bg-green-500/20 border-green-500 text-green-500',
                  isCurrent && 'bg-[#FF4500]/20 border-[#FF4500] text-[#FF4500] shadow-[0_0_8px_rgba(255,69,0,0.3)]',
                  !isCompleted && !isCurrent && 'border-muted-foreground/20 text-muted-foreground/40'
                )}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-[10px] whitespace-nowrap',
                  isCompleted && 'text-green-500',
                  isCurrent && 'text-[#FF4500] font-semibold',
                  !isCompleted && !isCurrent && 'text-muted-foreground/40'
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
