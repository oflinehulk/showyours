import { useState, useCallback, DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shuffle, Check, ArrowRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdvancingTeam, SplitAdvancementResult } from '@/lib/bracket-utils';
import { applyStandardSeeding } from '@/hooks/tournament/useBracketSeeding';
import { avoidSameGroupInR1 } from '@/lib/bracket-utils';

interface KnockoutMatchupEditorProps {
  splitResult: SplitAdvancementResult;
  groupLabelMap: Map<string, string>;
  onConfirm: (ubOrder: string[], lbOrder: string[]) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
}

type Slot = string | null;

export function KnockoutMatchupEditor({
  splitResult,
  groupLabelMap,
  onConfirm,
  onCancel,
  isPending,
}: KnockoutMatchupEditorProps) {
  const ubTeams = splitResult.upperBracket;
  const lbTeams = splitResult.lowerBracket;

  // Calculate UB R1 slot count (next power of 2)
  const ubSlotCount = Math.pow(2, Math.ceil(Math.log2(ubTeams.length)));
  const lbSlotCount = Math.pow(2, Math.ceil(Math.log2(lbTeams.length)));

  // UB slots managed by host (drag & drop)
  const [ubSlots, setUbSlots] = useState<Slot[]>(() => Array(ubSlotCount).fill(null));

  // LB auto-paired
  const [lbSlots, setLbSlots] = useState<Slot[]>(() => {
    const lbIds = lbTeams.map(t => t.squadId);
    const seeded = applyStandardSeeding(lbIds);
    const avoided = avoidSameGroupInR1(seeded, groupLabelMap);
    const padded = [...avoided];
    while (padded.length < lbSlotCount) padded.push(null);
    return padded;
  });

  const [draggedTeamId, setDraggedTeamId] = useState<string | null>(null);

  // Build team lookup
  const allTeams = new Map<string, AdvancingTeam>();
  for (const t of [...ubTeams, ...lbTeams]) {
    allTeams.set(t.squadId, t);
  }

  // Teams not yet placed in UB slots
  const placedUbIds = new Set(ubSlots.filter(Boolean) as string[]);
  const unplacedUbTeams = ubTeams.filter(t => !placedUbIds.has(t.squadId));

  const handleDragStart = (e: DragEvent, teamId: string) => {
    e.dataTransfer.setData('text/plain', teamId);
    setDraggedTeamId(teamId);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnSlot = useCallback((e: DragEvent, slotIndex: number) => {
    e.preventDefault();
    const teamId = e.dataTransfer.getData('text/plain');
    if (!teamId) return;

    setUbSlots(prev => {
      const next = [...prev];
      // If this team was already in another slot, clear that slot
      const existingIndex = next.indexOf(teamId);
      if (existingIndex !== -1) {
        next[existingIndex] = null;
      }
      // If target slot has a team, swap it back to pool (clear it)
      next[slotIndex] = teamId;
      return next;
    });
    setDraggedTeamId(null);
  }, []);

  const handleRemoveFromSlot = (slotIndex: number) => {
    setUbSlots(prev => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
  };

  const handleAutoFillUB = () => {
    const ids = ubTeams.map(t => t.squadId);
    const seeded = applyStandardSeeding(ids);
    const avoided = avoidSameGroupInR1(seeded, groupLabelMap);
    const padded = [...avoided];
    while (padded.length < ubSlotCount) padded.push(null);
    setUbSlots(padded);
  };

  const handleResetUB = () => {
    setUbSlots(Array(ubSlotCount).fill(null));
  };

  const handleShuffleLB = () => {
    const lbIds = lbTeams.map(t => t.squadId);
    const seeded = applyStandardSeeding(lbIds);
    const avoided = avoidSameGroupInR1(seeded, groupLabelMap);
    const padded = [...avoided];
    while (padded.length < lbSlotCount) padded.push(null);
    setLbSlots(padded);
  };

  const allUbPlaced = unplacedUbTeams.length === 0;

  const handleConfirm = async () => {
    await onConfirm(ubSlots as string[], lbSlots as string[]);
  };

  const renderTeamChip = (team: AdvancingTeam, isDraggable: boolean, small?: boolean) => (
    <div
      key={team.squadId}
      draggable={isDraggable}
      onDragStart={isDraggable ? (e) => handleDragStart(e, team.squadId) : undefined}
      className={cn(
        'flex items-center gap-1.5 rounded-md border px-2 py-1.5 transition-all',
        isDraggable && 'cursor-grab active:cursor-grabbing hover:border-primary/50 hover:bg-primary/5',
        isDraggable && 'border-border bg-muted/50',
        !isDraggable && 'border-transparent bg-transparent',
        small && 'py-1',
      )}
    >
      <Avatar className="h-4 w-4 shrink-0">
        {team.squad.logo_url ? (
          <AvatarImage src={team.squad.logo_url} alt={team.squad.name} />
        ) : null}
        <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
          {team.squad.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className={cn('font-medium truncate', small ? 'text-[10px]' : 'text-xs')}>
        {team.squad.name}
      </span>
      <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 shrink-0 border-muted-foreground/20">
        {team.groupLabel}
      </Badge>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Knockout Matchup Assignment</h4>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={onCancel} className="text-xs h-7">
            Cancel
          </Button>
        </div>
      </div>

      {/* Upper Bracket Section */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">Upper Bracket</span>
            <Badge variant="secondary" className="text-[10px]">{ubTeams.length} teams</Badge>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={handleAutoFillUB} className="text-[10px] h-6 px-2">
              <Shuffle className="w-3 h-3 mr-1" />
              Auto-fill
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetUB} className="text-[10px] h-6 px-2">
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Unplaced team pool */}
        {unplacedUbTeams.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] text-muted-foreground mb-1.5">Drag teams into bracket slots:</p>
            <div className="flex flex-wrap gap-1">
              {unplacedUbTeams.map(t => renderTeamChip(t, true))}
            </div>
          </div>
        )}

        {allUbPlaced && (
          <p className="text-[10px] text-green-400 mb-2 flex items-center gap-1">
            <Check className="w-3 h-3" /> All teams placed
          </p>
        )}

        {/* Bracket slots */}
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">Round 1 Matches:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {Array.from({ length: ubSlotCount / 2 }, (_, matchIdx) => {
              const slotA = matchIdx * 2;
              const slotB = matchIdx * 2 + 1;
              const teamA = ubSlots[slotA] ? allTeams.get(ubSlots[slotA]!) : null;
              const teamB = ubSlots[slotB] ? allTeams.get(ubSlots[slotB]!) : null;

              return (
                <div key={matchIdx} className="rounded-md border border-border bg-background/50 p-1.5">
                  <span className="text-[9px] text-muted-foreground font-medium mb-1 block">
                    Match {matchIdx + 1}
                  </span>
                  <div className="space-y-1">
                    {[slotA, slotB].map(si => {
                      const team = ubSlots[si] ? allTeams.get(ubSlots[si]!) : null;
                      return (
                        <div
                          key={si}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDropOnSlot(e, si)}
                          className={cn(
                            'h-8 rounded border-2 border-dashed flex items-center px-2 transition-all',
                            !team && 'border-muted-foreground/20 bg-muted/20',
                            !team && draggedTeamId && 'border-primary/40 bg-primary/5',
                            team && 'border-solid border-border bg-muted/50',
                          )}
                        >
                          {team ? (
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Avatar className="h-4 w-4 shrink-0">
                                  {team.squad.logo_url ? (
                                    <AvatarImage src={team.squad.logo_url} alt={team.squad.name} />
                                  ) : null}
                                  <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                                    {team.squad.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-[10px] font-medium truncate">{team.squad.name}</span>
                                <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 shrink-0">
                                  {team.groupLabel}
                                </Badge>
                              </div>
                              <button
                                onClick={() => handleRemoveFromSlot(si)}
                                className="text-muted-foreground hover:text-destructive text-[10px] shrink-0 ml-1"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50 italic">
                              {si === slotA && ubSlotCount > ubTeams.length ? 'BYE' : 'Drop team here'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lower Bracket Section (auto-paired) */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">Lower Bracket</span>
            <Badge variant="secondary" className="text-[10px]">{lbTeams.length} teams</Badge>
            <Badge variant="outline" className="text-[9px] border-muted-foreground/20">Auto-paired</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={handleShuffleLB} className="text-[10px] h-6 px-2">
            <Shuffle className="w-3 h-3 mr-1" />
            Re-shuffle
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {Array.from({ length: lbSlotCount / 2 }, (_, matchIdx) => {
            const slotA = matchIdx * 2;
            const slotB = matchIdx * 2 + 1;
            const teamA = lbSlots[slotA] ? allTeams.get(lbSlots[slotA]!) : null;
            const teamB = lbSlots[slotB] ? allTeams.get(lbSlots[slotB]!) : null;

            return (
              <div key={matchIdx} className="rounded-md border border-border bg-background/50 p-1.5">
                <span className="text-[9px] text-muted-foreground font-medium mb-1 block">
                  LB Match {matchIdx + 1}
                </span>
                <div className="space-y-0.5">
                  {[teamA, teamB].map((team, ti) => (
                    <div key={ti} className={cn(
                      'h-7 rounded flex items-center px-2',
                      team ? 'bg-muted/50' : 'bg-muted/20'
                    )}>
                      {team ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-3.5 w-3.5 shrink-0">
                            {team.squad.logo_url ? (
                              <AvatarImage src={team.squad.logo_url} alt={team.squad.name} />
                            ) : null}
                            <AvatarFallback className="text-[7px] bg-muted text-muted-foreground">
                              {team.squad.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] font-medium truncate">{team.squad.name}</span>
                          <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 shrink-0">
                            {team.groupLabel}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-[9px] text-muted-foreground/50 italic">BYE</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirm */}
      <Button
        onClick={handleConfirm}
        disabled={!allUbPlaced || isPending}
        className="btn-gaming w-full"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <ArrowRight className="w-4 h-4 mr-2" />
        )}
        Generate Knockout Bracket ({ubTeams.length} UB + {lbTeams.length} LB)
      </Button>
    </div>
  );
}
