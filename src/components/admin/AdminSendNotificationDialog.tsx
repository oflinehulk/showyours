import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Search } from 'lucide-react';
import { useAdminSendNotification } from '@/hooks/useAdmin';
import { toast } from 'sonner';

interface Profile {
  id: string;
  user_id: string;
  ign: string;
}

interface AdminSendNotificationDialogProps {
  profiles: Profile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminSendNotificationDialog({ profiles, open, onOpenChange }: AdminSendNotificationDialogProps) {
  const sendNotification = useAdminSendNotification();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('info');
  const [broadcast, setBroadcast] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [search, setSearch] = useState('');

  const filteredProfiles = profiles.filter(p =>
    p.ign.toLowerCase().includes(search.toLowerCase())
  );

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required');
      return;
    }

    const userIds = broadcast
      ? profiles.map(p => p.user_id)
      : selectedUserId ? [selectedUserId] : [];

    if (userIds.length === 0) {
      toast.error('Select a recipient or enable broadcast');
      return;
    }

    try {
      await sendNotification.mutateAsync({ userIds, title: title.trim(), body: body.trim(), type });
      toast.success(broadcast ? `Notification sent to ${userIds.length} users` : 'Notification sent');
      setTitle('');
      setBody('');
      setType('info');
      setBroadcast(false);
      setSelectedUserId('');
      onOpenChange(false);
    } catch {
      toast.error('Failed to send notification');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111111] border border-[#FF4500]/20 max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-[#FF4500]">Send Notification</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-[#0a0a0a] border-[#FF4500]/20" placeholder="Notification title" />
          </div>
          <div>
            <Label>Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="bg-[#0a0a0a] border-[#FF4500]/20" rows={3} placeholder="Notification message" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-[#0a0a0a] border-[#FF4500]/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={broadcast} onCheckedChange={setBroadcast} />
            <Label>Broadcast to all users ({profiles.length})</Label>
          </div>
          {!broadcast && (
            <div>
              <Label>Recipient</Label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-[#0a0a0a] border-[#FF4500]/20" placeholder="Search players..." />
              </div>
              <div className="max-h-40 overflow-y-auto border border-[#FF4500]/10 rounded-md">
                {filteredProfiles.slice(0, 50).map(p => (
                  <button
                    key={p.user_id}
                    onClick={() => setSelectedUserId(p.user_id)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[#FF4500]/10 ${selectedUserId === p.user_id ? 'bg-[#FF4500]/20 text-[#FF4500]' : ''}`}
                  >
                    {p.ign}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-[#FF4500]/20">Cancel</Button>
          <Button onClick={handleSend} disabled={sendNotification.isPending} className="bg-[#FF4500] hover:bg-[#FF4500]/80">
            {sendNotification.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
