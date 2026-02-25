import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { GripVertical, Shuffle, Save, Loader2, ArrowLeft, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { TournamentSquad, PotAssignment } from '@/lib/tournament-types';
import { POT_LABELS } from '@/lib/tournament-types';

interface PotAssignmentEditorProps {
  squads: TournamentSquad[];
  potCount: number;
  groupCount: number;
  onConfirm: (assignments: PotAssignment[]) => void;
  onBack: () => void;
  saving?: boolean;
}

const POT_COLORS: Record<number, { bg: string; border: string; text: string; badge: string }> = {
  1: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-500', badge: 'bg-yellow-500/20' },
  2: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500', badge: 'bg-blue-500/20' },
  3: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-500', badge: 'bg-green-500/20' },
  4: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-500', badge: 'bg-purple-500/20' },
};

export function PotAssignmentEditor({
  squads,
  potCount,
  groupCount,
  onConfirm,
  onBack,
  saving,
}: PotAssignmentEditorProps) {
  const maxPerPot = groupCount; // each pot can have at most 1 team per group
  const potCapacity = potCount * maxPerPot;
  const overflowCount = Math.max(0, squads.length - potCapacity);

  // Initialize: distribute evenly, overflow teams (beyond pot capacity) go to pot 0
  const [assignments, setAssignments] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    squads.forEach((s, i) => {
      if (i < potCapacity) {
        map.set(s.id, Math.floor(i / maxPerPot) + 1);
      } else {
        map.set(s.id, 0); // overflow
      }
    });
    return map;
  });

  const [dragSource, setDragSource] = useState<{ squadId: string; fromPot: number } | null>(null);

  const getPotSquads = useCallback((potNum: number) => {
    return squads.filter(s => assignments.get(s.id) === potNum);
  }, [squads, assignments]);

  const moveTeam = (squadId: string, toPot: number) => {
    setAssignments(prev => {
      const next = new Map(prev);
      next.set(squadId, toPot);
      return next;
    });
  };

  const handleDragStart = (squadId: string, fromPot: number) => {
    setDragSource({ squadId, fromPot });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (toPot: number) => {
    if (dragSource) {
      moveTeam(dragSource.squadId, toPot);
      setDragSource(null);
    }
  };

  const handleAutoDistribute = () => {
    const shuffled = [...squads].sort(() => Math.random() - 0.5);
    const map = new Map<string, number>();
    shuffled.forEach((s, i) => {
      if (i < potCapacity) {
        map.set(s.id, Math.floor(i / maxPerPot) + 1);
      } else {
        map.set(s.id, 0); // overflow
      }
    });
    setAssignments(map);
    toast.success('Teams redistributed randomly');
  };

  const validate = (): string | null => {
    for (let p = 1; p <= potCount; p++) {
      const count = getPotSquads(p).length;
      if (count === 0) return `Pot ${p} is empty`;
    }
    for (let p = 1; p <= potCount; p++) {
      const count = getPotSquads(p).length;
      if (count > groupCount) {
        return `Pot ${p} has ${count} teams but only ${groupCount} groups — max ${groupCount} per pot`;
      }
    }
    return null;
  };

  const handleConfirm = () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    const result: PotAssignment[] = squads.map(s => ({
      squad_id: s.id,
      squad_name: s.name,
      pot_number: assignments.get(s.id) ?? 1,
    }));
    onConfirm(result);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h4 className="text-sm font-semibold text-foreground">Pot Assignment</h4>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAutoDistribute}>
            <Shuffle className="w-3 h-3 mr-1" />
            Shuffle
          </Button>
          <Button
            size="sm"
            className="btn-gaming"
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            Start Draw with Pots
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-1.5 p-2 rounded bg-blue-500/5 border border-blue-500/20 text-xs text-blue-400">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          Drag teams between pots. Each pot can have at most {groupCount} teams (one per group).
          {overflowCount > 0 && <> {overflowCount} overflow team{overflowCount > 1 ? 's' : ''} will be placed into random groups after the pot draw.</>}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: potCount }, (_, i) => i + 1).map(potNum => {
          const potSquads = getPotSquads(potNum);
          const colors = POT_COLORS[potNum] ?? POT_COLORS[1];

          return (
            <div
              key={potNum}
              className={cn(
                'p-3 rounded-lg border transition-all min-h-[120px]',
                colors.bg, colors.border,
                dragSource && 'ring-1 ring-white/10',
              )}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(potNum)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded', colors.badge, colors.text)}>
                    Pot {potNum}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {POT_LABELS[potNum]?.split('—')[1]?.trim() || ''}
                  </span>
                </div>
                <span className={cn('text-[10px] font-medium', potSquads.length > groupCount ? 'text-red-400' : 'text-muted-foreground')}>
                  {potSquads.length}/{groupCount}
                </span>
              </div>
              <div className="space-y-1">
                {potSquads.map(squad => (
                  <div
                    key={squad.id}
                    draggable
                    onDragStart={() => handleDragStart(squad.id, potNum)}
                    onDragEnd={() => setDragSource(null)}
                    className={cn(
                      'flex items-center gap-1.5 p-1.5 rounded bg-black/20 cursor-grab active:cursor-grabbing',
                      'hover:bg-black/30 transition-colors',
                      dragSource?.squadId === squad.id && 'opacity-40',
                    )}
                  >
                    <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                    <Avatar className="h-5 w-5 shrink-0">
                      {squad.logo_url ? <AvatarImage src={squad.logo_url} alt={squad.name} /> : null}
                      <AvatarFallback className="text-[8px] bg-[#1a1a1a] text-white/70">
                        {squad.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] font-medium text-foreground truncate">{squad.name}</span>
                  </div>
                ))}
                {potSquads.length === 0 && (
                  <div className="py-4 text-center text-[10px] text-muted-foreground/50">
                    Drop teams here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overflow section — teams that don't fit into pots */}
      {(() => {
        const overflowSquads = getPotSquads(0);
        if (overflowSquads.length === 0) return null;
        return (
          <div
            className={cn(
              'p-3 rounded-lg border transition-all min-h-[80px]',
              'bg-orange-500/10 border-orange-500/30',
              dragSource && 'ring-1 ring-white/10',
            )}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(0)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-500">
                  Overflow
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Placed into random groups after pot draw
                </span>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                {overflowSquads.length}
              </span>
            </div>
            <div className="space-y-1">
              {overflowSquads.map(squad => (
                <div
                  key={squad.id}
                  draggable
                  onDragStart={() => handleDragStart(squad.id, 0)}
                  onDragEnd={() => setDragSource(null)}
                  className={cn(
                    'flex items-center gap-1.5 p-1.5 rounded bg-black/20 cursor-grab active:cursor-grabbing',
                    'hover:bg-black/30 transition-colors',
                    dragSource?.squadId === squad.id && 'opacity-40',
                  )}
                >
                  <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                  <Avatar className="h-5 w-5 shrink-0">
                    {squad.logo_url ? <AvatarImage src={squad.logo_url} alt={squad.name} /> : null}
                    <AvatarFallback className="text-[8px] bg-[#1a1a1a] text-white/70">
                      {squad.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] font-medium text-foreground truncate">{squad.name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
