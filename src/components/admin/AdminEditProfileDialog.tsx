import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { useAdminUpdateProfile } from '@/hooks/useAdmin';
import { RANKS, ROLES, INDIAN_STATES } from '@/lib/constants';
import { toast } from 'sonner';

interface Profile {
  id: string;
  ign: string;
  rank: string;
  main_role: string;
  state: string | null;
  bio: string | null;
  looking_for_squad: boolean;
  server: string;
  mlbb_id: string | null;
}

interface AdminEditProfileDialogProps {
  profile: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminEditProfileDialog({ profile, open, onOpenChange }: AdminEditProfileDialogProps) {
  const updateProfile = useAdminUpdateProfile();
  const [form, setForm] = useState({
    ign: '',
    rank: '',
    main_role: '',
    state: '',
    bio: '',
    looking_for_squad: false,
    server: 'sea',
    mlbb_id: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        ign: profile.ign,
        rank: profile.rank,
        main_role: profile.main_role,
        state: profile.state || '',
        bio: profile.bio || '',
        looking_for_squad: profile.looking_for_squad,
        server: profile.server,
        mlbb_id: profile.mlbb_id || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    try {
      await updateProfile.mutateAsync({
        id: profile.id,
        ign: form.ign,
        rank: form.rank,
        main_role: form.main_role,
        state: form.state || null,
        bio: form.bio || null,
        looking_for_squad: form.looking_for_squad,
        server: form.server,
        mlbb_id: form.mlbb_id || null,
      });
      toast.success(`Profile "${form.ign}" updated`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to update profile');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111111] border border-[#FF4500]/20 max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-[#FF4500]">Edit Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>IGN</Label>
            <Input value={form.ign} onChange={(e) => setForm(f => ({ ...f, ign: e.target.value }))} className="bg-[#0a0a0a] border-[#FF4500]/20" />
          </div>
          <div>
            <Label>MLBB ID</Label>
            <Input value={form.mlbb_id} onChange={(e) => setForm(f => ({ ...f, mlbb_id: e.target.value }))} className="bg-[#0a0a0a] border-[#FF4500]/20" />
          </div>
          <div>
            <Label>Rank</Label>
            <Select value={form.rank} onValueChange={(v) => setForm(f => ({ ...f, rank: v }))}>
              <SelectTrigger className="bg-[#0a0a0a] border-[#FF4500]/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RANKS.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Main Role</Label>
            <Select value={form.main_role} onValueChange={(v) => setForm(f => ({ ...f, main_role: v }))}>
              <SelectTrigger className="bg-[#0a0a0a] border-[#FF4500]/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>State</Label>
            <Select value={form.state} onValueChange={(v) => setForm(f => ({ ...f, state: v }))}>
              <SelectTrigger className="bg-[#0a0a0a] border-[#FF4500]/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INDIAN_STATES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea value={form.bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} className="bg-[#0a0a0a] border-[#FF4500]/20" rows={3} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.looking_for_squad} onCheckedChange={(v) => setForm(f => ({ ...f, looking_for_squad: v }))} />
            <Label>Looking for Squad</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-[#FF4500]/20">Cancel</Button>
          <Button onClick={handleSave} disabled={updateProfile.isPending} className="bg-[#FF4500] hover:bg-[#FF4500]/80">
            {updateProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
