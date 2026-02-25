import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
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
  useTournamentStages,
  useTournamentGroups,
  useTournamentGroupTeams,
  useStageMatches,
  useGenerateStageBracket,
  useCompleteStage,
  useUpdateStage,
  useResetBracket,
  useResetStageBracket,
  useDeleteStages,
} from '@/hooks/useTournaments';
import { StageConfigurator } from '@/components/tournament/StageConfigurator';
import { GroupAssignment } from '@/components/tournament/GroupAssignment';
import { GroupStandings } from '@/components/tournament/GroupStandings';
import { HostAddSquad } from '@/components/tournament/HostAddSquad';
import { computeGroupStandings, determineAdvancingTeams, determineSplitAdvancingTeams } from '@/lib/bracket-utils';
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
  Layers,
  ArrowRight,
  Trophy,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type {
  Tournament,
  TournamentRegistration,
  TournamentSquad,
  TournamentFormat,
  TournamentStage,
} from '@/lib/tournament-types';
import { TOURNAMENT_FORMAT_LABELS, STAGE_STATUS_LABELS } from '@/lib/tournament-types';

interface TournamentHostControlsProps {
  tournament: Tournament;
  registrations: (TournamentRegistration & { tournament_squads: TournamentSquad })[];
}

export function TournamentHostControls({ tournament, registrations }: TournamentHostControlsProps) {
  const navigate = useNavigate();
  const updateTournament = useUpdateTournament();
  const generateBracket = useGenerateBracket();
  const deleteTournament = useDeleteTournament();
  const resetBracket = useResetBracket();
  const updateSeed = useUpdateRegistrationSeed();
  const autoSeed = useAutoSeedByRegistrationOrder();
  const withdrawSquad = useWithdrawSquad();

  type ExtendedFormat = TournamentFormat | 'multi_stage';
  const [selectedFormat, setSelectedFormat] = useState<ExtendedFormat>('single_elimination');

  const approvedRegistrations = registrations.filter(r => r.status === 'approved');
  const approvedCount = approvedRegistrations.length;
  const canGenerateBracket =
    tournament.status === 'registration_closed' &&
    approvedCount >= 2;

  const isMultiStage = tournament.is_multi_stage;

  const handleCloseRegistration = async () => {
    try {
      await updateTournament.mutateAsync({
        id: tournament.id,
        status: 'registration_closed',
      });
      toast.success('Registration closed');
    } catch (error: unknown) {
      toast.error('Failed to close registration', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleReopenRegistration = async () => {
    try {
      await updateTournament.mutateAsync({
        id: tournament.id,
        status: 'registration_open',
      });
      toast.success('Registration reopened');
    } catch (error: unknown) {
      toast.error('Failed to reopen registration', { description: error instanceof Error ? error.message : 'Unknown error' });
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
    } catch (error: unknown) {
      toast.error('Failed to generate bracket', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleStartTournament = async () => {
    try {
      // Verify bracket exists before starting
      const { count, error: countError } = await supabase
        .from('tournament_matches')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', tournament.id);

      if (countError) throw countError;
      if (!count || count === 0) {
        toast.error('Cannot start tournament', { description: 'No bracket has been generated. Generate a bracket first.' });
        return;
      }

      await updateTournament.mutateAsync({
        id: tournament.id,
        status: 'ongoing',
      });
      toast.success('Tournament started!');
    } catch (error: unknown) {
      toast.error('Failed to start tournament', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleResetBracket = async () => {
    try {
      await resetBracket.mutateAsync(tournament.id);
      toast.success('Bracket reset', { description: 'You can now reconfigure seeding and format.' });
    } catch (error: unknown) {
      toast.error('Failed to reset bracket', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleCompleteTournament = async () => {
    try {
      await updateTournament.mutateAsync({
        id: tournament.id,
        status: 'completed',
      });
      toast.success('Tournament completed!');
    } catch (error: unknown) {
      toast.error('Failed to complete tournament', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleCancelTournament = async () => {
    try {
      await updateTournament.mutateAsync({
        id: tournament.id,
        status: 'cancelled',
      });
      toast.success('Tournament cancelled');
    } catch (error: unknown) {
      toast.error('Failed to cancel tournament', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleDeleteTournament = async () => {
    try {
      await deleteTournament.mutateAsync(tournament.id);
      toast.success('Tournament deleted');
      navigate('/tournaments');
    } catch (error: unknown) {
      toast.error('Failed to delete tournament', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleAutoSeed = async () => {
    try {
      await autoSeed.mutateAsync(tournament.id);
      toast.success('Seeds assigned by registration order');
    } catch (error: unknown) {
      toast.error('Failed to auto-seed', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleSeedChange = async (registrationId: string, value: string) => {
    const seed = value === '' ? null : parseInt(value);
    if (value !== '' && (isNaN(seed!) || seed! < 1)) return;

    // Validate seed uniqueness across approved registrations
    if (seed !== null) {
      const duplicate = approvedRegistrations.find(
        r => r.id !== registrationId && r.seed === seed
      );
      if (duplicate) {
        toast.error('Duplicate seed', { description: `Seed ${seed} is already assigned to another squad.` });
        return;
      }
    }

    try {
      await updateSeed.mutateAsync({
        registrationId,
        seed,
        tournamentId: tournament.id,
      });
    } catch (error: unknown) {
      toast.error('Failed to update seed', { description: error instanceof Error ? error.message : 'Unknown error' });
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
    } catch (error: unknown) {
      toast.error('Failed to withdraw squad', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  return (
    <div className="glass-card p-6 mb-6 border-secondary/30">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-secondary" />
        <h3 className="text-lg font-semibold text-foreground">Host Controls</h3>
        {isMultiStage && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#FF4500]/10 text-[#FF4500] border border-[#FF4500]/20">
            Multi-Stage
          </span>
        )}
      </div>

      {/* Step Progress Indicator */}
      <StepIndicator status={tournament.status} isMultiStage={isMultiStage} />

      {/* Stage-specific primary action */}
      <div className="mt-5 space-y-4">
        {/* Registration Open → Close Registration */}
        {tournament.status === 'registration_open' && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs text-muted-foreground mb-3">
              Next step: close registration to {isMultiStage ? 'configure stages and generate brackets.' : 'configure seeding and generate bracket.'}
            </p>
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

        {/* Registration Closed — Multi-Stage Flow */}
        {tournament.status === 'registration_closed' && isMultiStage && (
          <MultiStageSetup
            tournament={tournament}
            registrations={registrations}
            approvedRegistrations={approvedRegistrations}
            approvedCount={approvedCount}
            onReopenRegistration={handleReopenRegistration}
            reopenPending={updateTournament.isPending}
          />
        )}

        {/* Registration Closed → Seeding + Format + Generate Bracket (Single-Stage) */}
        {tournament.status === 'registration_closed' && !isMultiStage && !tournament.format && (
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
                  onValueChange={(v) => setSelectedFormat(v as ExtendedFormat)}
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
                    <SelectItem value="multi_stage">
                      Multi-Stage (Group + Knockout)
                    </SelectItem>
                  </SelectContent>
                </Select>
                {selectedFormat === 'multi_stage' ? (
                  <Button
                    onClick={async () => {
                      try {
                        await updateTournament.mutateAsync({
                          id: tournament.id,
                          is_multi_stage: true,
                        });
                        toast.success('Switched to Multi-Stage mode', {
                          description: 'Configure your stages below.',
                        });
                      } catch (error: unknown) {
                        toast.error('Failed to switch format', {
                          description: error instanceof Error ? error.message : 'Unknown error',
                        });
                      }
                    }}
                    disabled={updateTournament.isPending}
                    className="btn-gaming"
                  >
                    {updateTournament.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Layers className="w-4 h-4 mr-2" />
                    )}
                    Configure Multi-Stage
                  </Button>
                ) : (
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
                )}
              </div>
            </div>

            {/* Host Add Squad */}
            <HostAddSquad tournament={tournament} />
          </div>
        )}

        {/* Bracket Generated → Start Tournament or Reset */}
        {tournament.status === 'bracket_generated' && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs text-muted-foreground mb-3">Bracket is ready. Start the tournament when all teams are prepared.</p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleStartTournament}
                disabled={updateTournament.isPending || resetBracket.isPending}
                className="btn-gaming w-full sm:w-auto"
              >
                {updateTournament.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Start Tournament
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={resetBracket.isPending || updateTournament.isPending}
                    className="w-full sm:w-auto"
                  >
                    {resetBracket.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RotateCcw className="w-4 h-4 mr-2" />
                    )}
                    Reset Bracket
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Bracket?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete all generated matches and return to the seeding & format selection step. Seeds and registrations are preserved.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetBracket}>Reset</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {/* Ongoing — Multi-Stage Stage Management */}
        {tournament.status === 'ongoing' && isMultiStage && (
          <MultiStageOngoing
            tournament={tournament}
            registrations={registrations}
            onComplete={handleCompleteTournament}
            completePending={updateTournament.isPending}
          />
        )}

        {/* Ongoing → Complete or manage squads (Single-Stage) */}
        {tournament.status === 'ongoing' && !isMultiStage && (
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
          </div>
        )}

        {/* Squad Withdrawal (bracket_generated or ongoing) */}
        {(tournament.status === 'bracket_generated' || tournament.status === 'ongoing') && approvedRegistrations.length > 0 && (
          <WithdrawSquadSection
            approvedRegistrations={approvedRegistrations}
            onWithdraw={handleWithdrawSquad}
          />
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

// ========== Multi-Stage Setup (registration_closed) ==========

function MultiStageSetup({
  tournament,
  registrations,
  approvedRegistrations,
  approvedCount,
  onReopenRegistration,
  reopenPending,
}: {
  tournament: Tournament;
  registrations: (TournamentRegistration & { tournament_squads: TournamentSquad })[];
  approvedRegistrations: (TournamentRegistration & { tournament_squads: TournamentSquad })[];
  approvedCount: number;
  onReopenRegistration: () => void;
  reopenPending: boolean;
}) {
  const { data: stages } = useTournamentStages(tournament.id);
  const updateTournament = useUpdateTournament();
  const deleteStages = useDeleteStages();
  const autoSeed = useAutoSeedByRegistrationOrder();
  const updateSeed = useUpdateRegistrationSeed();
  const generateStageBracket = useGenerateStageBracket();

  const hasStages = stages && stages.length > 0;
  const firstStage = stages?.[0];
  const firstStageIsGroupStage = firstStage?.format === 'round_robin' && firstStage?.group_count > 0;

  const { data: groups } = useTournamentGroups(firstStage?.id);
  const { data: groupTeams } = useTournamentGroupTeams(firstStage?.id);
  const hasGroups = groups && groups.length > 0 && groupTeams && groupTeams.length > 0;

  const handleAutoSeed = async () => {
    try {
      await autoSeed.mutateAsync(tournament.id);
      toast.success('Seeds assigned by registration order');
    } catch (error: unknown) {
      toast.error('Failed to auto-seed', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleSeedChange = async (registrationId: string, value: string) => {
    const seed = value === '' ? null : parseInt(value);
    if (value !== '' && (isNaN(seed!) || seed! < 1)) return;

    // Validate seed uniqueness across approved registrations
    if (seed !== null) {
      const duplicate = approvedRegistrations.find(
        r => r.id !== registrationId && r.seed === seed
      );
      if (duplicate) {
        toast.error('Duplicate seed', { description: `Seed ${seed} is already assigned to another squad.` });
        return;
      }
    }

    try {
      await updateSeed.mutateAsync({
        registrationId,
        seed,
        tournamentId: tournament.id,
      });
    } catch (error: unknown) {
      toast.error('Failed to update seed', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleGenerateStage1 = async () => {
    if (!firstStage) return;

    try {
      const squadIds = approvedRegistrations
        .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
        .map(r => r.tournament_squad_id);

      await generateStageBracket.mutateAsync({
        tournamentId: tournament.id,
        stageId: firstStage.id,
        stage: firstStage,
        squadIds,
      });

      // Multi-stage: skip bracket_generated, go directly to ongoing
      await updateTournament.mutateAsync({
        id: tournament.id,
        status: 'ongoing',
        format: firstStage.format,
      });

      toast.success(`${firstStage.name} bracket generated!`);
    } catch (error: unknown) {
      toast.error('Failed to generate bracket', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Reopen / Switch to Single-Stage buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              if (stages && stages.length > 0) {
                await deleteStages.mutateAsync(tournament.id);
              }
              await updateTournament.mutateAsync({
                id: tournament.id,
                is_multi_stage: false,
              });
              toast.success('Switched to single-stage mode');
            } catch (error: unknown) {
              toast.error('Failed to switch', {
                description: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }}
          disabled={reopenPending || deleteStages.isPending || updateTournament.isPending}
        >
          {deleteStages.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <RotateCcw className="w-3 h-3 mr-1" />
          )}
          Switch to Single-Stage
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onReopenRegistration}
          disabled={reopenPending}
        >
          <Play className="w-3 h-3 mr-1" />
          Reopen Registration
        </Button>
      </div>

      {/* Step 1: Seeding */}
      {approvedCount > 0 && (
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-secondary" />
              <h4 className="text-sm font-semibold text-foreground">Seeding</h4>
            </div>
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
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Seeds used for balanced group assignment (snake-draft).
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

      {/* Step 2: Stage Configuration */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border">
        <StageConfigurator
          tournamentId={tournament.id}
          existingStages={stages || []}
          approvedCount={approvedCount}
        />
      </div>

      {/* Step 3: Group Assignment (if stage 1 is a group stage) */}
      {hasStages && firstStageIsGroupStage && (
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <GroupAssignment
            tournamentId={tournament.id}
            tournamentName={tournament.name}
            stage={firstStage!}
            registrations={registrations}
          />
        </div>
      )}

      {/* Step 4: Generate Stage 1 Bracket */}
      {hasStages && (
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <p className="text-xs text-muted-foreground mb-3">
            {firstStageIsGroupStage && !hasGroups
              ? 'Assign teams to groups first, then generate the bracket.'
              : `Generate ${firstStage!.name} bracket to start the tournament.`}
          </p>
          <Button
            onClick={handleGenerateStage1}
            disabled={
              generateStageBracket.isPending ||
              updateTournament.isPending ||
              approvedCount < 2 ||
              (firstStageIsGroupStage && !hasGroups)
            }
            className="btn-gaming"
          >
            {(generateStageBracket.isPending || updateTournament.isPending) ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Shuffle className="w-4 h-4 mr-2" />
            )}
            Generate {firstStage?.name || 'Stage 1'} Bracket
          </Button>
        </div>
      )}

      {/* Host Add Squad (multi-stage) */}
      <HostAddSquad tournament={tournament} />
    </div>
  );
}

// ========== Multi-Stage Ongoing ==========

function MultiStageOngoing({
  tournament,
  registrations,
  onComplete,
  completePending,
}: {
  tournament: Tournament;
  registrations: (TournamentRegistration & { tournament_squads: TournamentSquad })[];
  onComplete: () => void;
  completePending: boolean;
}) {
  const { data: stages } = useTournamentStages(tournament.id);
  const completeStage = useCompleteStage();
  const generateStageBracket = useGenerateStageBracket();
  const [showAdvancing, setShowAdvancing] = useState(false);

  if (!stages || stages.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-muted/30 border border-border">
        <p className="text-xs text-muted-foreground mb-3">Mark the tournament as complete once all matches are finished.</p>
        <Button onClick={onComplete} disabled={completePending} className="w-full sm:w-auto">
          {completePending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
          Mark Completed
        </Button>
      </div>
    );
  }

  const currentStage = stages.find(s => s.status === 'ongoing') || stages.find(s => s.status === 'pending' || s.status === 'configuring');
  const nextStage = currentStage ? stages.find(s => s.stage_number === currentStage.stage_number + 1) : undefined;
  const allStagesComplete = stages.every(s => s.status === 'completed');
  const isLastStage = currentStage && !nextStage;

  return (
    <div className="space-y-4">
      {/* Stage Progress */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-[#FF4500]" />
          <h4 className="text-sm font-semibold text-foreground">Stage Progress</h4>
        </div>
        <div className="space-y-2">
          {stages.map((stage, i) => (
            <div key={stage.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2',
                stage.status === 'completed' && 'bg-green-500/20 border-green-500 text-green-500',
                stage.status === 'ongoing' && 'bg-[#FF4500]/20 border-[#FF4500] text-[#FF4500]',
                (stage.status === 'pending' || stage.status === 'configuring') && 'border-muted-foreground/20 text-muted-foreground/40',
              )}>
                {stage.status === 'completed' ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className={cn(
                'text-xs font-medium flex-1',
                stage.status === 'ongoing' && 'text-[#FF4500]',
                stage.status === 'completed' && 'text-green-500',
                (stage.status === 'pending' || stage.status === 'configuring') && 'text-muted-foreground/50',
              )}>
                {stage.name}
              </span>
              <span className={cn(
                'text-[10px] px-2 py-0.5 rounded',
                stage.status === 'completed' && 'bg-green-500/10 text-green-500',
                stage.status === 'ongoing' && 'bg-[#FF4500]/10 text-[#FF4500]',
                (stage.status === 'pending' || stage.status === 'configuring') && 'bg-muted text-muted-foreground',
              )}>
                {STAGE_STATUS_LABELS[stage.status]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Current Stage Actions */}
      {currentStage?.status === 'ongoing' && (
        <CurrentStageActions
          tournament={tournament}
          currentStage={currentStage}
          nextStage={nextStage}
          registrations={registrations}
          isLastStage={!!isLastStage}
        />
      )}

      {/* Complete Tournament (when all stages done) */}
      {allStagesComplete && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-xs text-green-400 mb-3">All stages completed. Mark the tournament as complete.</p>
          <Button onClick={onComplete} disabled={completePending} className="btn-gaming w-full sm:w-auto">
            {completePending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trophy className="w-4 h-4 mr-2" />}
            Complete Tournament
          </Button>
        </div>
      )}
    </div>
  );
}

// Actions for the currently ongoing stage
function CurrentStageActions({
  tournament,
  currentStage,
  nextStage,
  registrations,
  isLastStage,
}: {
  tournament: Tournament;
  currentStage: TournamentStage;
  nextStage: TournamentStage | undefined;
  registrations: (TournamentRegistration & { tournament_squads: TournamentSquad })[];
  isLastStage: boolean;
}) {
  const completeStage = useCompleteStage();
  const generateStageBracket = useGenerateStageBracket();
  const resetStageBracket = useResetStageBracket();
  const { data: stageMatches } = useStageMatches(currentStage.id);
  const { data: groups } = useTournamentGroups(currentStage.id);
  const { data: groupTeams } = useTournamentGroupTeams(currentStage.id);

  const allMatchesCompleted = stageMatches && stageMatches.length > 0 && stageMatches.every(m => m.status === 'completed');
  const hasResults = stageMatches && stageMatches.some(m => m.status === 'completed' || m.status === 'ongoing');
  const isGroupStage = currentStage.format === 'round_robin' && currentStage.group_count > 0;

  const handleCompleteAndAdvance = async () => {
    try {
      // Complete current stage
      await completeStage.mutateAsync({
        stageId: currentStage.id,
        tournamentId: tournament.id,
      });

      // If there is a next stage and this is a group stage, compute advancing teams and generate next stage
      if (nextStage && isGroupStage && groups && groupTeams && stageMatches) {
        const squadMap = new Map(
          registrations
            .filter(r => r.status === 'approved')
            .map(r => [r.tournament_squad_id, r.tournament_squads])
        );

        const groupData = groups.map(group => {
          const teamIds = (groupTeams || [])
            .filter(gt => gt.group_id === group.id)
            .map(gt => gt.tournament_squad_id);
          const groupSquadMap = new Map<string, typeof squadMap extends Map<string, infer V> ? V : never>();
          for (const tid of teamIds) {
            const squad = squadMap.get(tid);
            if (squad) groupSquadMap.set(tid, squad);
          }
          return {
            label: group.label,
            matches: (stageMatches || []).filter(m => m.group_id === group.id),
            squadMap: groupSquadMap,
          };
        });

        const useSplitAdvancement = currentStage.advance_to_lower_per_group > 0
          && nextStage.format === 'double_elimination';

        if (useSplitAdvancement) {
          // Split advancement: top -> UB, bottom -> LB
          const splitResult = determineSplitAdvancingTeams(
            groupData,
            currentStage.advance_per_group,
            currentStage.advance_to_lower_per_group,
            currentStage.advance_best_remaining,
          );

          const ubSquadIds = splitResult.upperBracket.map(a => a.squadId);
          const lbSquadIds = splitResult.lowerBracket.map(a => a.squadId);

          await generateStageBracket.mutateAsync({
            tournamentId: tournament.id,
            stageId: nextStage.id,
            stage: nextStage,
            ubSquadIds,
            lbSquadIds,
          });

          toast.success(`${currentStage.name} completed! ${nextStage.name} bracket generated with ${ubSquadIds.length} UB + ${lbSquadIds.length} LB teams.`);
        } else {
          // Flat advancement
          const advancing = determineAdvancingTeams(
            groupData,
            currentStage.advance_per_group,
            currentStage.advance_best_remaining,
          );

          const advancingSquadIds = advancing.map(a => a.squadId);

          await generateStageBracket.mutateAsync({
            tournamentId: tournament.id,
            stageId: nextStage.id,
            stage: nextStage,
            squadIds: advancingSquadIds,
          });

          toast.success(`${currentStage.name} completed! ${nextStage.name} bracket generated with ${advancingSquadIds.length} teams.`);
        }
      } else if (nextStage) {
        toast.success(`${currentStage.name} completed! Configure ${nextStage.name} next.`);
      } else {
        toast.success(`${currentStage.name} completed!`);
      }
    } catch (error: unknown) {
      toast.error('Failed', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleResetStage = async () => {
    try {
      await resetStageBracket.mutateAsync({
        tournamentId: tournament.id,
        stageId: currentStage.id,
        stageNumber: currentStage.stage_number,
      });
      toast.success('Stage bracket reset', { description: 'You can now reconfigure groups and regenerate the bracket.' });
    } catch (error: unknown) {
      toast.error('Failed to reset stage', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  return (
    <div className="p-4 rounded-lg bg-muted/30 border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Play className="w-4 h-4 text-[#FF4500]" />
        <h4 className="text-sm font-semibold text-foreground">{currentStage.name}</h4>
        <span className="text-[10px] text-muted-foreground">
          {stageMatches ? `${stageMatches.filter(m => m.status === 'completed').length}/${stageMatches.length} matches` : '...'}
        </span>
      </div>

      {!allMatchesCompleted && (
        <p className="text-xs text-muted-foreground mb-3">
          Complete all matches in this stage before advancing.
        </p>
      )}

      {allMatchesCompleted && (
        <>
          {/* Show advancing teams preview for group stages */}
          {isGroupStage && groups && groupTeams && stageMatches && (
            <div className="mb-3">
              <p className="text-xs text-green-400 mb-2">
                All matches done. {nextStage ? `${currentStage.advance_per_group * currentStage.group_count + currentStage.advance_best_remaining} teams will advance to ${nextStage.name}.` : ''}
              </p>
            </div>
          )}

          <Button
            onClick={handleCompleteAndAdvance}
            disabled={completeStage.isPending || generateStageBracket.isPending}
            className="btn-gaming"
          >
            {(completeStage.isPending || generateStageBracket.isPending) ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ArrowRight className="w-4 h-4 mr-2" />
            )}
            {nextStage ? `Complete & Start ${nextStage.name}` : `Complete ${currentStage.name}`}
          </Button>
        </>
      )}

      {/* Reset Stage Bracket — only for first stage with no results */}
      {currentStage.stage_number === 1 && !hasResults && (
        <div className="mt-3 pt-3 border-t border-border">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={resetStageBracket.isPending}
                className="text-xs"
              >
                {resetStageBracket.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <RotateCcw className="w-3 h-3 mr-1" />
                )}
                Reset Stage Bracket
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset {currentStage.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all matches for this stage and return to the group/bracket setup step. Group assignments are preserved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetStage}>Reset Stage</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

// ========== Withdraw Squad Section ==========

function WithdrawSquadSection({
  approvedRegistrations,
  onWithdraw,
}: {
  approvedRegistrations: (TournamentRegistration & { tournament_squads: TournamentSquad })[];
  onWithdraw: (reg: TournamentRegistration & { tournament_squads: TournamentSquad }) => void;
}) {
  return (
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
                    onClick={() => onWithdraw(reg)}
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
  );
}

// ========== Step Progress Indicator ==========

const STEPS = [
  { key: 'registration_open', label: 'Registration' },
  { key: 'registration_closed', label: 'Closed' },
  { key: 'bracket_generated', label: 'Bracket' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
] as const;

const MULTI_STAGE_STEPS = [
  { key: 'registration_open', label: 'Registration' },
  { key: 'registration_closed', label: 'Setup' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
] as const;

function StepIndicator({ status, isMultiStage }: { status: string; isMultiStage?: boolean }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <XCircle className="w-4 h-4" />
        Tournament Cancelled
      </div>
    );
  }

  const steps = isMultiStage ? MULTI_STAGE_STEPS : STEPS;
  const currentIndex = steps.findIndex(s => s.key === status);

  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      {steps.map((step, i) => {
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
