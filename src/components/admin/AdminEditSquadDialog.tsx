import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { useAdminUpdateSquad } from '@/hooks/useAdmin';
import { RANKS } from '@/lib/constants';
import { toast } from 'sonner';

interface Squad {
  id: string;
  name: string;
  min_rank: string;
  is_recruiting: boolean;
  max_members: number | null;
  server: string;
  description: string | null;
}

interface AdminEditSquadDialogProps {
  squad: Squad | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminEditSquadDialog({ squad, open, onOpenChange }: AdminEditSquadDialogProps) {
  const updateSquad = useAdminUpdateSquad();
  const [form, setForm] = useState({
    name: '',
    min_rank: '',
    is_recruiting: true,
    max_members: 5,
    server: 'sea',
    description: '',
  });

  useEffect(() => {
    if (squad) {
      setForm({
        name: squad.name,
        min_rank: squad.min_rank,
        is_recruiting: squad.is_recruiting,
        max_members: squad.max_members || 5,
        server: squad.server,
        description: squad.description || '',
      });
    }
  }, [squad]);

  const handleSave = async () => {
    if (!squad) return;
    try {
      await updateSquad.mutateAsync({
        id: squad.id,
        name: form.name,
        min_rank: form.min_rank,
        is_recruiting: form.is_recruiting,
        max_members: form.max_members,
        server: form.server,
        description: form.description || null,
      });
      toast.success(`Squad "${form.name}" updated`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to update squad');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111111] border border-[#FF4500]/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-[#FF4500]">Edit Squad</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="bg-[#0a0a0a] border-[#FF4500]/20" />
          </div>
          <div>
            <Label>Min Rank</Label>
            <Select value={form.min_rank} onValueChange={(v) => setForm(f => ({ ...f, min_rank: v }))}>
              <SelectTrigger className="bg-[#0a0a0a] border-[#FF4500]/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RANKS.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Max Members</Label>
            <Input type="number" min={1} max={20} value={form.max_members} onChange={(e) => setForm(f => ({ ...f, max_members: parseInt(e.target.value) || 5 }))} className="bg-[#0a0a0a] border-[#FF4500]/20" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="bg-[#0a0a0a] border-[#FF4500]/20" rows={3} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.is_recruiting} onCheckedChange={(v) => setForm(f => ({ ...f, is_recruiting: v }))} />
            <Label>Recruiting</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-[#FF4500]/20">Cancel</Button>
          <Button onClick={handleSave} disabled={updateSquad.isPending} className="bg-[#FF4500] hover:bg-[#FF4500]/80">
            {updateSquad.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
