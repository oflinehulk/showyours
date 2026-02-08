import { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useMyTournamentSquads, 
  useCreateTournamentSquad,
  useRegisterForTournament,
  useTournamentSquadMembers
} from '@/hooks/useTournaments';
import { useMySquads } from '@/hooks/useSquads';
import { ImageUpload } from '@/components/ImageUpload';
import { 
  Users, 
  Plus, 
  Trash2, 
  Loader2, 
  Check, 
  Shield,
  UserPlus,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Tournament, TournamentSquad, SquadMemberRole } from '@/lib/tournament-types';

interface TournamentRegistrationFormProps {
  tournament: Tournament;
  onSuccess: () => void;
}

interface MemberInput {
  ign: string;
  mlbb_id: string;
  role: SquadMemberRole;
  position: number;
}

export function TournamentRegistrationForm({ tournament, onSuccess }: TournamentRegistrationFormProps) {
  const { user } = useAuth();
  const { data: existingSquads } = useMySquads();
  const { data: myTournamentSquads } = useMyTournamentSquads();
  const createTournamentSquad = useCreateTournamentSquad();
  const registerForTournament = useRegisterForTournament();

  const [useExisting, setUseExisting] = useState<boolean | null>(null);
  const [selectedExistingSquadId, setSelectedExistingSquadId] = useState<string>('');
  const [selectedTournamentSquadId, setSelectedTournamentSquadId] = useState<string>('');
  
  // New squad form state
  const [squadName, setSquadName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberInput[]>([
    { ign: '', mlbb_id: '', role: 'main', position: 1 },
    { ign: '', mlbb_id: '', role: 'main', position: 2 },
    { ign: '', mlbb_id: '', role: 'main', position: 3 },
    { ign: '', mlbb_id: '', role: 'main', position: 4 },
    { ign: '', mlbb_id: '', role: 'main', position: 5 },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const addSubstitute = () => {
    if (members.length >= 7) return;
    setMembers([
      ...members,
      { ign: '', mlbb_id: '', role: 'substitute', position: members.length + 1 }
    ]);
  };

  const removeMember = (index: number) => {
    if (members.length <= 5) return; // Keep minimum 5 main players
    if (members[index].role === 'main') return; // Can't remove main players
    setMembers(members.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: keyof MemberInput, value: string) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const canSubmitNewSquad = () => {
    const mainPlayers = members.filter(m => m.role === 'main');
    return (
      squadName.trim() &&
      mainPlayers.length === 5 &&
      mainPlayers.every(m => m.ign.trim() && m.mlbb_id.trim())
    );
  };

  const handleSubmitNewSquad = async () => {
    if (!canSubmitNewSquad()) return;
    
    setIsSubmitting(true);
    try {
      // Create tournament squad
      const squad = await createTournamentSquad.mutateAsync({
        squad: {
          name: squadName.trim(),
          existing_squad_id: null,
          logo_url: logoUrl,
        },
        members: members.filter(m => m.ign.trim() && m.mlbb_id.trim()).map(m => ({
          ign: m.ign.trim(),
          mlbb_id: m.mlbb_id.trim(),
          role: m.role,
          position: m.position,
          user_id: null, // Can be linked later
        })),
      });

      // Register for tournament
      await registerForTournament.mutateAsync({
        tournamentId: tournament.id,
        squadId: squad.id,
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

  // Step 1: Choose method
  if (useExisting === null) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Register Your Squad
        </h3>

        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Choose how you want to register:
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {myTournamentSquads && myTournamentSquads.length > 0 && (
              <button
                onClick={() => setUseExisting(true)}
                className="p-6 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <Users className="w-8 h-8 text-primary mb-3" />
                <h4 className="font-semibold text-foreground mb-1">
                  Use Existing Tournament Squad
                </h4>
                <p className="text-sm text-muted-foreground">
                  Register with a squad you've already created for tournaments
                </p>
              </button>
            )}

            <button
              onClick={() => setUseExisting(false)}
              className="p-6 rounded-xl border border-border bg-card hover:border-secondary hover:bg-secondary/5 transition-all text-left group"
            >
              <UserPlus className="w-8 h-8 text-secondary mb-3" />
              <h4 className="font-semibold text-foreground mb-1">
                Create New Tournament Squad
              </h4>
              <p className="text-sm text-muted-foreground">
                Create a new roster with 5 main players and up to 2 substitutes
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2a: Select existing tournament squad
  if (useExisting) {
    return (
      <div className="glass-card p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setUseExisting(null)}
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

  // Step 2b: Create new tournament squad
  return (
    <div className="glass-card p-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setUseExisting(null)}
        className="mb-4"
      >
        ← Back
      </Button>

      <h3 className="text-lg font-semibold text-foreground mb-4">
        Create Tournament Squad
      </h3>

      {/* Info notice */}
      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 mb-6">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p>Roster requirements:</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>Exactly 5 main players (required)</li>
              <li>Up to 2 substitutes (optional)</li>
              <li>Max 2 roster changes after tournament starts</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Squad Info */}
        <div className="flex items-start gap-4">
          <ImageUpload
            bucket="tournament-assets"
            currentUrl={logoUrl}
            onUpload={setLogoUrl}
            onRemove={() => setLogoUrl(null)}
            shape="square"
            size="md"
          />
          <div className="flex-1">
            <Label htmlFor="squadName">Squad Name *</Label>
            <Input
              id="squadName"
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
              placeholder="Your tournament squad name"
              className="mt-1.5"
            />
          </div>
        </div>

        {/* Players */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>Roster *</Label>
            {members.length < 7 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSubstitute}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Substitute
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {members.map((member, index) => (
              <div
                key={index}
                className={cn(
                  'p-3 rounded-lg border',
                  member.role === 'main' 
                    ? 'bg-primary/5 border-primary/20' 
                    : 'bg-secondary/5 border-secondary/20'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={member.role === 'main' ? 'default' : 'secondary'}>
                    {member.role === 'main' ? `Player ${index + 1}` : `Sub ${index - 4}`}
                  </Badge>
                  {member.role === 'substitute' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-auto"
                      onClick={() => removeMember(index)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="In-Game Name"
                    value={member.ign}
                    onChange={(e) => updateMember(index, 'ign', e.target.value)}
                  />
                  <Input
                    placeholder="MLBB ID (e.g., 12345678)"
                    value={member.mlbb_id}
                    onChange={(e) => updateMember(index, 'mlbb_id', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmitNewSquad}
          disabled={!canSubmitNewSquad() || isSubmitting}
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
