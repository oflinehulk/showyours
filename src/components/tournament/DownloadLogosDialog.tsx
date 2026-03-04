import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Image, Monitor, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { downloadTeamLogosZip } from '@/lib/logo-downloader';
import type { TournamentRegistration, TournamentSquad } from '@/lib/tournament-types';

interface DownloadLogosDialogProps {
  tournamentName: string;
  registrations: (TournamentRegistration & { tournament_squads: TournamentSquad })[];
}

export function DownloadLogosDialog({ tournamentName, registrations }: DownloadLogosDialogProps) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<'original' | 'obs' | null>(null);

  const approvedTeams = registrations
    .filter((r) => r.status === 'approved')
    .map((r) => ({
      name: r.tournament_squads.name,
      logoUrl: r.tournament_squads.logo_url,
    }));

  const teamsWithLogos = approvedTeams.filter((t) => t.logoUrl);

  const handleDownload = async (format: 'original' | 'obs') => {
    if (teamsWithLogos.length === 0) {
      toast.error('No logos to download', {
        description: 'None of the approved teams have uploaded a logo.',
      });
      return;
    }

    setDownloading(format);
    const toastId = toast.loading('Preparing logos...', {
      description: `Processing 0 of ${teamsWithLogos.length} logos`,
    });

    try {
      const result = await downloadTeamLogosZip(
        approvedTeams,
        tournamentName,
        format,
        (current, total) => {
          toast.loading('Preparing logos...', {
            id: toastId,
            description: `Processing ${current} of ${total} logos`,
          });
        },
      );

      const parts = [`${result.downloaded} logo${result.downloaded !== 1 ? 's' : ''} downloaded`];
      if (result.skipped > 0) parts.push(`${result.skipped} without logo`);
      if (result.failed > 0) parts.push(`${result.failed} failed`);

      toast.success('Logos ZIP downloaded!', {
        id: toastId,
        description: parts.join(' · '),
      });
      setOpen(false);
    } catch (error) {
      toast.error('Download failed', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Download className="w-3.5 h-3.5" />
          Logos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Download className="w-4 h-4 text-[#FF4500]" />
            Download Team Logos
          </DialogTitle>
          <DialogDescription>
            Download all approved team logos as a ZIP file.
            {approvedTeams.length > 0 && (
              <span className="block mt-1 text-xs">
                {teamsWithLogos.length} of {approvedTeams.length} teams have logos
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          <button
            onClick={() => handleDownload('original')}
            disabled={downloading !== null || teamsWithLogos.length === 0}
            className="w-full p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              {downloading === 'original' ? (
                <Loader2 className="w-5 h-5 text-[#FF4500] animate-spin shrink-0" />
              ) : (
                <Image className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">Original</p>
                <p className="text-xs text-muted-foreground">
                  Download logos in their original resolution
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleDownload('obs')}
            disabled={downloading !== null || teamsWithLogos.length === 0}
            className="w-full p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              {downloading === 'obs' ? (
                <Loader2 className="w-5 h-5 text-[#FF4500] animate-spin shrink-0" />
              ) : (
                <Monitor className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">OBS-Ready (512×512)</p>
                <p className="text-xs text-muted-foreground">
                  Resized to 512×512 with transparent background for stream overlays
                </p>
              </div>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
