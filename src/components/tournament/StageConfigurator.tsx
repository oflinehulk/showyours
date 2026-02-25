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
import { GlowCard } from '@/components/tron/GlowCard';
import { useCreateStages, useDeleteStages } from '@/hooks/useTournaments';
import {
  Layers,
  Plus,
  Trash2,
  Loader2,
  Save,
  Users,
  Trophy,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { TournamentFormat, TournamentStage } from '@/lib/tournament-types';
import { TOURNAMENT_FORMAT_LABELS } from '@/lib/tournament-types';

interface StageInput {
  name: string;
  format: TournamentFormat;
  best_of: 1 | 3 | 5;
  finals_best_of: 1 | 3 | 5 | null;
  group_count: number;
  advance_per_group: number;
  advance_best_remaining: number;
  advance_to_lower_per_group: number;
}

interface StageConfiguratorProps {
  tournamentId: string;
  existingStages: TournamentStage[];
  approvedCount: number;
  onStagesCreated?: () => void;
}

const DEFAULT_STAGE: StageInput = {
  name: '',
  format: 'round_robin',
  best_of: 1,
  finals_best_of: null,
  group_count: 4,
  advance_per_group: 2,
  advance_best_remaining: 0,
  advance_to_lower_per_group: 0,
};

export function StageConfigurator({
  tournamentId,
  existingStages,
  approvedCount,
  onStagesCreated,
}: StageConfiguratorProps) {
  const createStages = useCreateStages();
  const deleteStages = useDeleteStages();

  const [stages, setStages] = useState<StageInput[]>(() => {
    if (existingStages.length > 0) return []; // Already configured
    return [
      { ...DEFAULT_STAGE, name: 'Group Stage', format: 'round_robin' },
      { ...DEFAULT_STAGE, name: 'Knockout Stage', format: 'single_elimination', best_of: 3, finals_best_of: 5, group_count: 0, advance_per_group: 0, advance_best_remaining: 0 },
    ];
  });

  const canReconfigure = existingStages.length > 0 && existingStages.every(s => s.status === 'pending' || s.status === 'configuring');

  const handleReconfigure = async () => {
    try {
      await deleteStages.mutateAsync(tournamentId);
      toast.success('Stages deleted', { description: 'You can now reconfigure stages.' });
    } catch (error: unknown) {
      toast.error('Failed to delete stages', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  if (existingStages.length > 0) {
    return (
      <GlowCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#FF4500]" />
            <h4 className="text-sm font-semibold text-foreground">Stages Configured</h4>
          </div>
          {canReconfigure && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={deleteStages.isPending}
                  className="text-xs"
                >
                  {deleteStages.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <RotateCcw className="w-3 h-3 mr-1" />
                  )}
                  Reconfigure
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reconfigure Stages?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all stages, matches, and group assignments. Registrations and seeds are preserved. You can set up stages from scratch.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReconfigure}>Delete & Reconfigure</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <div className="space-y-2">
          {existingStages.map((stage, i) => (
            <div key={stage.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
              <div className="w-7 h-7 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/30 flex items-center justify-center text-xs font-bold text-[#FF4500]">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{stage.name}</p>
                <p className="text-xs text-muted-foreground">
                  {TOURNAMENT_FORMAT_LABELS[stage.format]} &middot; Bo{stage.best_of}
                  {stage.group_count > 0 && ` \u00B7 ${stage.group_count} groups`}
                  {stage.advance_per_group > 0 && ` \u00B7 Top ${stage.advance_per_group}/group`}
                  {stage.advance_to_lower_per_group > 0 && ` \u00B7 ${stage.advance_to_lower_per_group}/group to LB`}
                  {stage.advance_best_remaining > 0 && ` + ${stage.advance_best_remaining} best`}
                  {stage.finals_best_of && ` \u00B7 Finals Bo${stage.finals_best_of}`}
                </p>
              </div>
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded',
                stage.status === 'completed' && 'bg-green-500/10 text-green-500',
                stage.status === 'ongoing' && 'bg-yellow-500/10 text-yellow-500',
                stage.status === 'configuring' && 'bg-blue-500/10 text-blue-500',
                stage.status === 'pending' && 'bg-muted text-muted-foreground',
              )}>
                {stage.status}
              </span>
            </div>
          ))}
        </div>
      </GlowCard>
    );
  }

  const updateStage = (index: number, updates: Partial<StageInput>) => {
    setStages(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const addStage = () => {
    if (stages.length >= 3) return;
    setStages(prev => [...prev, {
      ...DEFAULT_STAGE,
      name: `Stage ${prev.length + 1}`,
      format: 'single_elimination',
      best_of: 3,
      finals_best_of: 5,
      group_count: 0,
      advance_per_group: 0,
      advance_best_remaining: 0,
    }]);
  };

  const removeStage = (index: number) => {
    if (stages.length <= 1) return;
    setStages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Validate
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      if (!s.name.trim()) {
        toast.error(`Stage ${i + 1} needs a name`);
        return;
      }
      if (s.format === 'round_robin' && s.group_count > 0 && i < stages.length - 1) {
        if (s.advance_per_group < 1) {
          toast.error(`Stage ${i + 1}: Set how many teams advance per group`);
          return;
        }

        // Validate total advancing teams for next knockout stage
        const nextStage = stages[i + 1];
        if (nextStage && nextStage.format !== 'round_robin') {
          const totalAdvancing = s.advance_per_group * s.group_count
            + (s.advance_to_lower_per_group || 0) * s.group_count
            + (s.advance_best_remaining || 0);
          if (totalAdvancing < 2) {
            toast.error(`Stage ${i + 1}: At least 2 teams must advance to the next stage`);
            return;
          }
        }
      }
    }

    try {
      await createStages.mutateAsync({
        tournamentId,
        stages: stages.map((s, i) => ({
          stage_number: i + 1,
          name: s.name.trim(),
          format: s.format,
          best_of: s.best_of,
          finals_best_of: s.finals_best_of,
          group_count: s.format === 'round_robin' ? s.group_count : 0,
          advance_per_group: s.format === 'round_robin' ? s.advance_per_group : 0,
          advance_best_remaining: s.format === 'round_robin' ? s.advance_best_remaining : 0,
          advance_to_lower_per_group: s.format === 'round_robin' ? s.advance_to_lower_per_group : 0,
          lb_initial_rounds: 0,
        })),
      });
      toast.success('Stages configured');
      onStagesCreated?.();
    } catch (error: unknown) {
      toast.error('Failed to create stages', { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#FF4500]" />
          <h4 className="text-sm font-semibold text-foreground">Configure Stages</h4>
        </div>
        <span className="text-xs text-muted-foreground">{approvedCount} teams registered</span>
      </div>

      <div className="space-y-3">
        {stages.map((stage, index) => (
          <div key={index} className="relative">
            {/* Connector arrow between stages */}
            {index > 0 && (
              <div className="flex justify-center -mt-1 mb-1">
                <ArrowRight className="w-4 h-4 text-[#FF4500]/40 rotate-90" />
              </div>
            )}
            <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/30 flex items-center justify-center text-xs font-bold text-[#FF4500]">
                    {index + 1}
                  </div>
                  <Input
                    value={stage.name}
                    onChange={(e) => updateStage(index, { name: e.target.value })}
                    placeholder="Stage name"
                    className="h-8 flex-1 sm:w-40 text-sm bg-transparent border-none shadow-none focus-visible:ring-0 px-1 font-semibold"
                  />
                </div>
                {stages.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeStage(index)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Format */}
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Format</label>
                  <Select
                    value={stage.format}
                    onValueChange={(v) => updateStage(index, { format: v as TournamentFormat })}
                  >
                    <SelectTrigger className="h-8 text-xs mt-0.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TOURNAMENT_FORMAT_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Best of */}
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Best of</label>
                  <Select
                    value={String(stage.best_of)}
                    onValueChange={(v) => updateStage(index, { best_of: parseInt(v) as 1 | 3 | 5 })}
                  >
                    <SelectTrigger className="h-8 text-xs mt-0.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Bo1</SelectItem>
                      <SelectItem value="3">Bo3</SelectItem>
                      <SelectItem value="5">Bo5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Finals best of */}
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Finals Bo</label>
                  <Select
                    value={stage.finals_best_of ? String(stage.finals_best_of) : 'same'}
                    onValueChange={(v) => updateStage(index, { finals_best_of: v === 'same' ? null : parseInt(v) as 1 | 3 | 5 })}
                  >
                    <SelectTrigger className="h-8 text-xs mt-0.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="same">Same</SelectItem>
                      <SelectItem value="1">Bo1</SelectItem>
                      <SelectItem value="3">Bo3</SelectItem>
                      <SelectItem value="5">Bo5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Group stage settings */}
              {stage.format === 'round_robin' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Groups</label>
                    <Input
                      type="number"
                      min={0}
                      max={26}
                      value={stage.group_count}
                      onChange={(e) => updateStage(index, { group_count: parseInt(e.target.value) || 0 })}
                      className="h-8 text-xs mt-0.5"
                    />
                  </div>
                  {index < stages.length - 1 && stage.group_count > 0 && (
                    <>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider" title="Minimum teams advancing to Upper Bracket per group. Larger groups automatically send more.">Adv/Group</label>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={stage.advance_per_group}
                          onChange={(e) => updateStage(index, { advance_per_group: parseInt(e.target.value) || 0 })}
                          className="h-8 text-xs mt-0.5"
                        />
                      </div>
                      {stages[index + 1]?.format === 'double_elimination' && (
                        <div>
                          <label className="text-[10px] text-muted-foreground uppercase tracking-wider" title="Bottom N teams per group go to Lower Bracket. Remaining go to Upper Bracket.">To LB/Group</label>
                          <Input
                            type="number"
                            min={0}
                            max={20}
                            value={stage.advance_to_lower_per_group}
                            onChange={(e) => updateStage(index, { advance_to_lower_per_group: parseInt(e.target.value) || 0 })}
                            className="h-8 text-xs mt-0.5"
                          />
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Best Extra</label>
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          value={stage.advance_best_remaining}
                          onChange={(e) => updateStage(index, { advance_best_remaining: parseInt(e.target.value) || 0 })}
                          className="h-8 text-xs mt-0.5"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Preview */}
              {stage.format === 'round_robin' && stage.group_count > 0 && approvedCount > 0 && (() => {
                const baseSize = Math.floor(approvedCount / stage.group_count);
                const extraGroups = approvedCount % stage.group_count;
                const hasUnevenGroups = extraGroups > 0;
                // Variable advancement: larger groups send more to UB, bottom N always go to LB
                const ubTotal = hasUnevenGroups && stage.advance_to_lower_per_group > 0
                  ? (stage.group_count - extraGroups) * stage.advance_per_group
                    + extraGroups * Math.max(stage.advance_per_group, (baseSize + 1) - stage.advance_to_lower_per_group)
                  : stage.advance_per_group * stage.group_count;
                const lbTotal = stage.advance_to_lower_per_group * stage.group_count + stage.advance_best_remaining;
                return (
                  <p className="text-[10px] text-muted-foreground">
                    {hasUnevenGroups
                      ? <>{stage.group_count - extraGroups} groups of {baseSize}, {extraGroups} groups of {baseSize + 1}</>
                      : <>~{baseSize} teams per group</>
                    }
                    {index < stages.length - 1 && stage.advance_per_group > 0 && (
                      stage.advance_to_lower_per_group > 0
                        ? <> &rarr; {ubTotal} UB + {lbTotal} LB{hasUnevenGroups && ' (larger groups send more to UB)'}</>
                        : <> &rarr; {stage.advance_per_group * stage.group_count + stage.advance_best_remaining} advancing</>
                    )}
                  </p>
                );
              })()}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {stages.length < 3 && (
          <Button variant="outline" size="sm" onClick={addStage}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Stage
          </Button>
        )}
        <Button
          size="sm"
          className="btn-gaming ml-auto"
          onClick={handleSave}
          disabled={createStages.isPending}
        >
          {createStages.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Stages
        </Button>
      </div>
    </div>
  );
}
