import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  useUpdateTournament, 
  useGenerateBracket,
  useDeleteTournament 
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
  AlertTriangle
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
  
  const [selectedFormat, setSelectedFormat] = useState<TournamentFormat>('single_elimination');

  const approvedCount = registrations.filter(r => r.status === 'approved').length;
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

  return (
    <div className="glass-card p-6 mb-6 border-secondary/30">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-secondary" />
        <h3 className="text-lg font-semibold text-foreground">Host Controls</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Registration Controls */}
        {tournament.status === 'registration_open' && (
          <Button
            variant="outline"
            onClick={handleCloseRegistration}
            disabled={updateTournament.isPending}
            className="w-full"
          >
            {updateTournament.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Pause className="w-4 h-4 mr-2" />
            )}
            Close Registration
          </Button>
        )}

        {tournament.status === 'registration_closed' && !tournament.format && (
          <Button
            variant="outline"
            onClick={handleReopenRegistration}
            disabled={updateTournament.isPending}
            className="w-full"
          >
            <Play className="w-4 h-4 mr-2" />
            Reopen Registration
          </Button>
        )}

        {/* Bracket Generation */}
        {tournament.status === 'registration_closed' && !tournament.format && (
          <div className="col-span-2 flex gap-2">
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
        )}

        {!canGenerateBracket && tournament.status === 'registration_closed' && !tournament.format && (
          <p className="text-sm text-muted-foreground col-span-full">
            Need at least 2 approved squads to generate bracket. Currently: {approvedCount}
          </p>
        )}

        {/* Tournament State Controls */}
        {tournament.status === 'bracket_generated' && (
          <Button
            onClick={handleStartTournament}
            disabled={updateTournament.isPending}
            className="btn-gaming"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Tournament
          </Button>
        )}

        {tournament.status === 'ongoing' && (
          <Button
            onClick={handleCompleteTournament}
            disabled={updateTournament.isPending}
            className="w-full"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark Completed
          </Button>
        )}

        {/* Cancel/Delete */}
        {['registration_open', 'registration_closed', 'bracket_generated'].includes(tournament.status) && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive/10">
                <XCircle className="w-4 h-4 mr-2" />
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
        )}

        {(tournament.status === 'cancelled' || tournament.status === 'completed') && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="w-4 h-4 mr-2" />
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
