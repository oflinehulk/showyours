import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Shield,
  Swords,
  X,
  Check,
  Loader2,
  ChevronDown,
  Ban,
  Edit3,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useHeroes } from '@/hooks/useHeroes';
import { useMatchDraft, useSaveMatchDraft } from '@/hooks/useMatchDrafts';
import type { TournamentMatch, TournamentSquad } from '@/lib/tournament-types';

interface DraftPickPanelProps {
  match: TournamentMatch;
  tournamentId: string;
  isHost: boolean;
  open: boolean;
  onClose: () => void;
}

export function DraftPickPanel({ match, tournamentId, isHost, open, onClose }: DraftPickPanelProps) {
  const { data: heroes } = useHeroes();
  const { data: existingDraft, isLoading: loadingDraft } = useMatchDraft(match.id);
  const saveDraft = useSaveMatchDraft();

  const [squadABans, setSquadABans] = useState<string[]>([]);
  const [squadBBans, setSquadBBans] = useState<string[]>([]);
  const [squadAIngameBans, setSquadAIngameBans] = useState<string[]>([]);
  const [squadBIngameBans, setSquadBIngameBans] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Load existing draft data
  useEffect(() => {
    if (existingDraft) {
      setSquadABans(existingDraft.squad_a_bans || []);
      setSquadBBans(existingDraft.squad_b_bans || []);
      setSquadAIngameBans(existingDraft.squad_a_ingame_bans || []);
      setSquadBIngameBans(existingDraft.squad_b_ingame_bans || []);
      setNotes(existingDraft.notes || '');
    } else {
      setSquadABans([]);
      setSquadBBans([]);
      setSquadAIngameBans([]);
      setSquadBIngameBans([]);
      setNotes('');
    }
  }, [existingDraft]);

  const squadAName = (match.squad_a as TournamentSquad | null)?.name || 'Team A';
  const squadBName = (match.squad_b as TournamentSquad | null)?.name || 'Team B';

  const handleSave = async () => {
    try {
      await saveDraft.mutateAsync({
        matchId: match.id,
        tournamentId,
        squadABans,
        squadBBans,
        squadAIngameBans,
        squadBIngameBans,
        notes: notes.trim() || null,
      });
      toast.success('Draft saved');
      onClose();
    } catch (error: unknown) {
      toast.error('Failed to save draft', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-primary" />
            Draft Pick &amp; Ban
          </DialogTitle>
          <DialogDescription>
            R{match.round} #{match.match_number}: {squadAName} vs {squadBName}
          </DialogDescription>
        </DialogHeader>

        {loadingDraft ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Team A Bans */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-1 bg-primary rounded-full" />
                <h4 className="font-semibold text-foreground">{squadAName} — Pre-game Bans</h4>
                <Badge variant="outline" className="text-xs">Max 2</Badge>
              </div>
              <HeroBanSelector
                selectedBans={squadABans}
                onChange={setSquadABans}
                maxBans={2}
                heroes={heroes || []}
                disabled={!isHost}
              />
            </div>

            {/* Team B Bans */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-1 bg-secondary rounded-full" />
                <h4 className="font-semibold text-foreground">{squadBName} — Pre-game Bans</h4>
                <Badge variant="outline" className="text-xs">Max 2</Badge>
              </div>
              <HeroBanSelector
                selectedBans={squadBBans}
                onChange={setSquadBBans}
                maxBans={2}
                heroes={heroes || []}
                disabled={!isHost}
              />
            </div>

            {/* In-game bans (additional, noted by host) */}
            <div className="border-t border-border pt-4 space-y-4">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Ban className="w-4 h-4 text-muted-foreground" />
                In-Game Bans (noted by host)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{squadAName}</Label>
                  <HeroBanSelector
                    selectedBans={squadAIngameBans}
                    onChange={setSquadAIngameBans}
                    maxBans={5}
                    heroes={heroes || []}
                    disabled={!isHost}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{squadBName}</Label>
                  <HeroBanSelector
                    selectedBans={squadBIngameBans}
                    onChange={setSquadBIngameBans}
                    maxBans={5}
                    heroes={heroes || []}
                    disabled={!isHost}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-1.5">
                <FileText className="w-3 h-3" />
                Notes
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add draft notes..."
                className="min-h-[80px]"
                disabled={!isHost}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {isHost ? 'Cancel' : 'Close'}
          </Button>
          {isHost && (
            <Button onClick={handleSave} disabled={saveDraft.isPending} className="btn-gaming">
              {saveDraft.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save Draft
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hero ban selector with combobox
function HeroBanSelector({
  selectedBans,
  onChange,
  maxBans,
  heroes,
  disabled,
}: {
  selectedBans: string[];
  onChange: (bans: string[]) => void;
  maxBans: number;
  heroes: { id: string; name: string; hero_class: string }[];
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [customHero, setCustomHero] = useState('');

  const addBan = (heroName: string) => {
    if (selectedBans.length >= maxBans) {
      toast.error(`Maximum ${maxBans} bans allowed`);
      return;
    }
    if (selectedBans.includes(heroName)) {
      toast.error('Hero already banned');
      return;
    }
    onChange([...selectedBans, heroName]);
    setOpen(false);
  };

  const removeBan = (heroName: string) => {
    onChange(selectedBans.filter(b => b !== heroName));
  };

  const addCustomHero = () => {
    const name = customHero.trim();
    if (!name) return;
    addBan(name);
    setCustomHero('');
  };

  return (
    <div className="space-y-2">
      {/* Selected bans */}
      <div className="flex flex-wrap gap-2">
        {selectedBans.map((ban) => (
          <Badge
            key={ban}
            variant="destructive"
            className="flex items-center gap-1 text-sm"
          >
            <Ban className="w-3 h-3" />
            {ban}
            {!disabled && (
              <button onClick={() => removeBan(ban)} className="ml-1 hover:text-destructive-foreground/80">
                <X className="w-3 h-3" />
              </button>
            )}
          </Badge>
        ))}
        {selectedBans.length === 0 && (
          <span className="text-xs text-muted-foreground italic">No bans selected</span>
        )}
      </div>

      {/* Add ban */}
      {!disabled && selectedBans.length < maxBans && (
        <div className="flex gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="justify-between">
                Select Hero
                <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-3rem)] sm:w-[250px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search heroes..." />
                <CommandList>
                  <CommandEmpty>No hero found.</CommandEmpty>
                  <CommandGroup>
                    {heroes
                      .filter(h => !selectedBans.includes(h.name))
                      .map((hero) => (
                        <CommandItem
                          key={hero.id}
                          value={hero.name}
                          onSelect={() => addBan(hero.name)}
                        >
                          <span>{hero.name}</span>
                          <Badge variant="outline" className="ml-auto text-xs capitalize">
                            {hero.hero_class}
                          </Badge>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Custom hero name input */}
          <div className="flex gap-1">
            <Input
              value={customHero}
              onChange={(e) => setCustomHero(e.target.value)}
              placeholder="Or type hero name"
              className="h-9 text-sm flex-1"
              onKeyDown={(e) => e.key === 'Enter' && addCustomHero()}
            />
            {customHero.trim() && (
              <Button size="sm" variant="ghost" onClick={addCustomHero}>
                <Check className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Summary view for draft data shown on match cards
export function DraftSummaryBadge({ matchId }: { matchId: string }) {
  const { data: draft } = useMatchDraft(matchId);

  if (!draft) return null;

  const totalBans = (draft.squad_a_bans?.length || 0) + (draft.squad_b_bans?.length || 0);
  if (totalBans === 0) return null;

  return (
    <Badge variant="outline" className="text-xs gap-1">
      <Swords className="w-3 h-3" />
      {totalBans} bans
    </Badge>
  );
}
