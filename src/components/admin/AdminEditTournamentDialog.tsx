import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useAdminUpdateTournament } from '@/hooks/useAdmin';
import { toast } from 'sonner';

const STATUSES = [
  { id: 'registration_open', name: 'Registration Open' },
  { id: 'registration_closed', name: 'Registration Closed' },
  { id: 'bracket_generated', name: 'Bracket Generated' },
  { id: 'ongoing', name: 'Ongoing' },
  { id: 'completed', name: 'Completed' },
  { id: 'cancelled', name: 'Cancelled' },
];

const FORMATS = [
  { id: 'single_elimination', name: 'Single Elimination' },
  { id: 'double_elimination', name: 'Double Elimination' },
  { id: 'round_robin', name: 'Round Robin' },
];

interface Tournament {
  id: string;
  name: string;
  status: string;
  max_squads: number;
  date_time: string;
  description: string | null;
  format: string | null;
  prize_pool: string | null;
  entry_fee: string | null;
  rules: string | null;
}

interface AdminEditTournamentDialogProps {
  tournament: Tournament | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminEditTournamentDialog({ tournament, open, onOpenChange }: AdminEditTournamentDialogProps) {
  const updateTournament = useAdminUpdateTournament();
  const [form, setForm] = useState({
    name: '',
    status: 'registration_open',
    max_squads: 16,
    date_time: '',
    description: '',
    format: 'single_elimination',
    prize_pool: '',
    entry_fee: '',
    rules: '',
  });

  useEffect(() => {
    if (tournament) {
      setForm({
        name: tournament.name,
        status: tournament.status,
        max_squads: tournament.max_squads,
        date_time: tournament.date_time ? new Date(tournament.date_time).toISOString().slice(0, 16) : '',
        description: tournament.description || '',
        format: tournament.format || 'single_elimination',
        prize_pool: tournament.prize_pool || '',
        entry_fee: tournament.entry_fee || '',
        rules: tournament.rules || '',
      });
    }
  }, [tournament]);

  const handleSave = async () => {
    if (!tournament) return;
    try {
      await updateTournament.mutateAsync({
        id: tournament.id,
        name: form.name,
        status: form.status,
        max_squads: form.max_squads,
        date_time: form.date_time ? new Date(form.date_time).toISOString() : tournament.date_time,
        description: form.description || null,
        format: form.format,
        prize_pool: form.prize_pool || null,
        entry_fee: form.entry_fee || null,
        rules: form.rules || null,
      });
      toast.success(`Tournament "${form.name}" updated`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to update tournament');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111111] border border-[#FF4500]/20 max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-[#FF4500]">Edit Tournament</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="bg-[#0a0a0a] border-[#FF4500]/20" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="bg-[#0a0a0a] border-[#FF4500]/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Format</Label>
            <Select value={form.format} onValueChange={(v) => setForm(f => ({ ...f, format: v }))}>
              <SelectTrigger className="bg-[#0a0a0a] border-[#FF4500]/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMATS.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Max Squads</Label>
            <Input type="number" min={2} max={128} value={form.max_squads} onChange={(e) => setForm(f => ({ ...f, max_squads: parseInt(e.target.value) || 16 }))} className="bg-[#0a0a0a] border-[#FF4500]/20" />
          </div>
          <div>
            <Label>Date & Time</Label>
            <Input type="datetime-local" value={form.date_time} onChange={(e) => setForm(f => ({ ...f, date_time: e.target.value }))} className="bg-[#0a0a0a] border-[#FF4500]/20" />
          </div>
          <div>
            <Label>Prize Pool</Label>
            <Input value={form.prize_pool} onChange={(e) => setForm(f => ({ ...f, prize_pool: e.target.value }))} className="bg-[#0a0a0a] border-[#FF4500]/20" placeholder="e.g. ₹5000" />
          </div>
          <div>
            <Label>Entry Fee</Label>
            <Input value={form.entry_fee} onChange={(e) => setForm(f => ({ ...f, entry_fee: e.target.value }))} className="bg-[#0a0a0a] border-[#FF4500]/20" placeholder="e.g. ₹100 or Free" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="bg-[#0a0a0a] border-[#FF4500]/20" rows={3} />
          </div>
          <div>
            <Label>Rules</Label>
            <Textarea value={form.rules} onChange={(e) => setForm(f => ({ ...f, rules: e.target.value }))} className="bg-[#0a0a0a] border-[#FF4500]/20" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-[#FF4500]/20">Cancel</Button>
          <Button onClick={handleSave} disabled={updateTournament.isPending} className="bg-[#FF4500] hover:bg-[#FF4500]/80">
            {updateTournament.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
