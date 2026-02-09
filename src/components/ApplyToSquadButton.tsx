import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile } from '@/hooks/useProfiles';
import { useMySquadMembership } from '@/hooks/useSquadMembers';
import { useHasPendingApplication, useApplyToSquad } from '@/hooks/useSquadApplications';
import { UserPlus, Check, Loader2, AlertCircle, LogIn } from 'lucide-react';
import { toast } from 'sonner';

interface ApplyToSquadButtonProps {
  squadId: string;
  squadName: string;
}

export function ApplyToSquadButton({ squadId, squadName }: ApplyToSquadButtonProps) {
  const { user } = useAuth();
  const { data: myProfile, isLoading: profileLoading } = useMyProfile();
  const { data: myMembership, isLoading: membershipLoading } = useMySquadMembership();
  const { data: hasPending, isLoading: pendingLoading } = useHasPendingApplication(squadId);
  const applyToSquad = useApplyToSquad();

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  const isLoading = profileLoading || membershipLoading || pendingLoading;

  // Not logged in
  if (!user) {
    return (
      <Button asChild className="btn-gaming">
        <Link to="/auth">
          <LogIn className="w-4 h-4 mr-2" />
          Sign in to Apply
        </Link>
      </Button>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Button disabled className="btn-gaming">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  // Already in a squad
  if (myMembership) {
    return (
      <Button disabled variant="outline">
        <Check className="w-4 h-4 mr-2" />
        Already in a Squad
      </Button>
    );
  }

  // No profile
  if (!myProfile) {
    return (
      <Button asChild variant="outline">
        <Link to="/create-profile">
          <AlertCircle className="w-4 h-4 mr-2" />
          Create Profile to Apply
        </Link>
      </Button>
    );
  }

  // Already applied
  if (hasPending) {
    return (
      <Button disabled variant="outline">
        <Check className="w-4 h-4 mr-2" />
        Application Pending
      </Button>
    );
  }

  const handleApply = async () => {
    try {
      await applyToSquad.mutateAsync({
        squadId,
        applicantId: myProfile.id,
        message: message.trim() || undefined,
      });
      toast.success('Application sent!', {
        description: `Your application to ${squadName} has been submitted.`,
      });
      setOpen(false);
      setMessage('');
    } catch (error: any) {
      if (error.message.includes('duplicate')) {
        toast.error('You have already applied to this squad');
      } else {
        toast.error('Failed to apply', { description: error.message });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-gaming">
          <UserPlus className="w-4 h-4 mr-2" />
          Apply to Join
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply to {squadName}</DialogTitle>
          <DialogDescription>
            Send a join request to this squad. The leader will review your application.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label htmlFor="message">Message (Optional)</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell the squad why you want to join..."
            className="mt-1.5 min-h-[100px]"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {message.length}/500 characters
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={applyToSquad.isPending}
            className="btn-gaming"
          >
            {applyToSquad.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            Send Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
