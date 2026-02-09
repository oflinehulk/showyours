import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RankBadge } from '@/components/RankBadge';
import { RoleIcon } from '@/components/RoleIcon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useSquadApplications,
  useApproveApplication,
  useRejectApplication,
} from '@/hooks/useSquadApplications';
import { Check, X, Loader2, UserPlus, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface SquadApplicationsProps {
  squadId: string;
  maxMembers: number;
  currentMemberCount: number;
}

export function SquadApplications({ squadId, maxMembers, currentMemberCount }: SquadApplicationsProps) {
  const { data: applications, isLoading } = useSquadApplications(squadId);
  const approveApplication = useApproveApplication();
  const rejectApplication = useRejectApplication();

  const isFull = currentMemberCount >= maxMembers;

  const handleApprove = async (app: NonNullable<typeof applications>[0]) => {
    if (isFull) {
      toast.error('Squad is full');
      return;
    }

    try {
      await approveApplication.mutateAsync({
        applicationId: app.id,
        squadId: app.squad_id,
        applicantId: app.applicant_id,
        userId: app.user_id,
      });
      toast.success(`${app.applicant?.ign} has been added to the squad!`);
    } catch (error: any) {
      toast.error('Failed to approve application', { description: error.message });
    }
  };

  const handleReject = async (app: NonNullable<typeof applications>[0]) => {
    try {
      await rejectApplication.mutateAsync({
        applicationId: app.id,
        squadId: app.squad_id,
      });
      toast.success('Application rejected');
    } catch (error: any) {
      toast.error('Failed to reject application', { description: error.message });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Pending Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!applications || applications.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          Pending Applications
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {applications.length} pending
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isFull && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            Squad is full. You cannot approve more members until someone leaves.
          </div>
        )}

        {applications.map((app) => (
          <div
            key={app.id}
            className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-muted/50 rounded-lg"
          >
            <Link
              to={`/player/${app.applicant?.id}`}
              className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
            >
              <img
                src={app.applicant?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${app.applicant?.ign}`}
                alt={app.applicant?.ign}
                className="w-12 h-12 rounded-lg bg-muted object-cover"
              />
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{app.applicant?.ign}</p>
                <div className="flex items-center gap-2 mt-1">
                  <RankBadge rank={app.applicant?.rank || 'warrior'} size="sm" />
                  <RoleIcon role={app.applicant?.main_role || 'gold'} size="sm" />
                </div>
              </div>
            </Link>

            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
              </div>

              {app.message && (
                <p className="text-sm text-muted-foreground italic max-w-xs truncate">
                  "{app.message}"
                </p>
              )}

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(app)}
                  disabled={rejectApplication.isPending}
                  className="text-destructive border-destructive/50 hover:bg-destructive/10"
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(app)}
                  disabled={approveApplication.isPending || isFull}
                  className="btn-gaming"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
