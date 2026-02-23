import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ImageUpload';
import { BottomSheet } from '@/components/tron/BottomSheet';
import { useUpdateMatchResult } from '@/hooks/useTournaments';
import { DraftPickPanel } from '@/components/tournament/DraftPickPanel';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  Loader2,
  Swords,
} from 'lucide-react';
import { toast } from 'sonner';
import { MATCH_STATUS_LABELS, validateMatchScores } from '@/lib/tournament-types';
import type { TournamentMatch } from '@/lib/tournament-types';

interface ScoreEditSheetProps {
  match: TournamentMatch | null;
  tournamentId: string;
  isHost: boolean;
  canEdit: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScoreEditSheet({
  match,
  tournamentId,
  isHost,
  canEdit,
  open,
  onOpenChange,
}: ScoreEditSheetProps) {
  const updateResult = useUpdateMatchResult();
  const [showDraftPanel, setShowDraftPanel] = useState(false);

  const [squadAScore, setSquadAScore] = useState('0');
  const [squadBScore, setSquadBScore] = useState('0');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  // Reset state when match changes
  useEffect(() => {
    if (match) {
      setSquadAScore(match.squad_a_score.toString());
      setSquadBScore(match.squad_b_score.toString());
      setScreenshotUrl(match.result_screenshot);
    }
  }, [match?.id]);

  if (!match) return null;

  const handleSubmit = async () => {
    const aScore = parseInt(squadAScore) || 0;
    const bScore = parseInt(squadBScore) || 0;

    const validation = validateMatchScores(match.best_of, aScore, bScore);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid scores');
      return;
    }

    const winnerId = aScore > bScore ? match.squad_a_id : match.squad_b_id;
    if (!winnerId) {
      toast.error('Cannot determine winner');
      return;
    }

    try {
      await updateResult.mutateAsync({
        matchId: match.id,
        winnerId,
        squadAScore: aScore,
        squadBScore: bScore,
        screenshotUrl: screenshotUrl || undefined,
        tournamentId,
      });
      toast.success('Match result updated');
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Failed to update result', { description: error.message });
    }
  };

  return (
    <>
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Match Details"
        description={`${match.squad_a?.name || 'TBD'} vs ${match.squad_b?.name || 'TBD'}`}
      >
        <div className="space-y-4">
          {/* Status & Format */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant="outline" className="border-[#FF4500]/20 text-xs">
              {MATCH_STATUS_LABELS[match.status]}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Format</span>
            <span className="text-sm font-medium font-display">Best of {match.best_of}</span>
          </div>

          {/* Scores */}
          {canEdit && match.squad_a && match.squad_b ? (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground text-center">
                Winner needs {Math.ceil(match.best_of / 2)} win{Math.ceil(match.best_of / 2) > 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-3 gap-4 items-center">
                <div>
                  <Label className="text-xs text-muted-foreground">{match.squad_a?.name}</Label>
                  <Input
                    type="number"
                    min="0"
                    max={Math.ceil(match.best_of / 2)}
                    value={squadAScore}
                    onChange={(e) => setSquadAScore(e.target.value)}
                    className="text-center text-lg font-display font-bold bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="h-px w-full bg-[#FF4500]/20" />
                  <span className="text-[#FF4500] font-display font-bold text-sm">VS</span>
                  <div className="h-px w-full bg-[#FF4500]/20" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{match.squad_b?.name}</Label>
                  <Input
                    type="number"
                    min="0"
                    max={Math.ceil(match.best_of / 2)}
                    value={squadBScore}
                    onChange={(e) => setSquadBScore(e.target.value)}
                    className="text-center text-lg font-display font-bold bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Result Screenshot (Optional)</Label>
                <div className="mt-2">
                  <ImageUpload
                    bucket="tournament-assets"
                    currentUrl={screenshotUrl}
                    onUpload={setScreenshotUrl}
                    onRemove={() => setScreenshotUrl(null)}
                    shape="wide"
                    size="md"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 items-center text-center">
              <div>
                <p className="text-sm text-muted-foreground">{match.squad_a?.name || 'TBD'}</p>
                <p className="text-2xl font-display font-bold">{match.squad_a_score}</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="h-px w-8 bg-[#FF4500]/20" />
                <span className="text-[#FF4500] font-display font-bold text-sm">VS</span>
                <div className="h-px w-8 bg-[#FF4500]/20" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{match.squad_b?.name || 'TBD'}</p>
                <p className="text-2xl font-display font-bold">{match.squad_b_score}</p>
              </div>
            </div>
          )}

          {/* Screenshot preview (read-only) */}
          {match.result_screenshot && !canEdit && (
            <div>
              <Label className="text-xs text-muted-foreground">Result Screenshot</Label>
              <img
                src={match.result_screenshot}
                alt="Match result"
                loading="lazy"
                className="mt-2 rounded-lg border border-[#FF4500]/20"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {(isHost || match.squad_a) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDraftPanel(true)}
                className="border-[#FF4500]/20 hover:border-[#FF4500]/40"
              >
                <Swords className="w-4 h-4 mr-2" />
                Draft Pick/Ban
              </Button>
            )}
            <div className="flex-1" />
            {canEdit && match.squad_a && match.squad_b && (
              <Button
                onClick={handleSubmit}
                disabled={updateResult.isPending}
                className="btn-gaming"
              >
                {updateResult.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Save Result
              </Button>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Draft Panel (rendered outside BottomSheet to avoid z-index issues) */}
      {match && (
        <DraftPickPanel
          match={match}
          tournamentId={tournamentId}
          isHost={isHost}
          open={showDraftPanel}
          onClose={() => setShowDraftPanel(false)}
        />
      )}
    </>
  );
}
