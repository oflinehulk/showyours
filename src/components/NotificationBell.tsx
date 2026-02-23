import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications';
import {
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  UserCheck,
  UserX,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { NotificationType } from '@/lib/tournament-types';

const NOTIFICATION_ICONS: Record<NotificationType, typeof CheckCircle> = {
  registration_approved: CheckCircle,
  registration_rejected: XCircle,
  roster_change_approved: UserCheck,
  roster_change_rejected: UserX,
  tournament_cancelled: AlertTriangle,
  dispute_raised: AlertTriangle,
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  registration_approved: 'text-green-500',
  registration_rejected: 'text-destructive',
  roster_change_approved: 'text-green-500',
  roster_change_rejected: 'text-destructive',
  tournament_cancelled: 'text-destructive',
  dispute_raised: 'text-yellow-500',
};

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: notifications } = useNotifications();
  const { data: unreadCount } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleNotificationClick = (notification: { id: string; tournament_id: string | null; read: boolean }) => {
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
    if (notification.tournament_id) {
      navigate(`/tournament/${notification.tournament_id}`);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative w-9 h-9 text-muted-foreground hover:text-[#FF4500]"
        >
          <Bell className="w-4 h-4" />
          {(unreadCount ?? 0) > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount! > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {(unreadCount ?? 0) > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-1 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => markAllRead.mutate()}
            >
              <Check className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {!notifications || notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = NOTIFICATION_ICONS[notification.type as NotificationType] || Bell;
              const color = NOTIFICATION_COLORS[notification.type as NotificationType] || 'text-muted-foreground';

              return (
                <button
                  key={notification.id}
                  className={cn(
                    'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0',
                    !notification.read && 'bg-primary/5'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', color)} />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', !notification.read && 'font-medium')}>
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {notification.body}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
