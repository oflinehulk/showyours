import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Profile } from '@/lib/types';
import { parseContacts } from '@/lib/contacts';

interface ProfileCompletenessProps {
  profile: Profile;
  className?: string;
}

interface CompletionItem {
  label: string;
  completed: boolean;
}

export function ProfileCompleteness({ profile, className }: ProfileCompletenessProps) {
  const contacts = parseContacts(profile.contacts);
  const hasWhatsApp = contacts.some((c: { type: string }) => c.type === 'whatsapp');

  const items: CompletionItem[] = [
    { label: 'In-Game Name', completed: !!profile.ign },
    { label: 'Game ID', completed: !!profile.mlbb_id },
    { label: 'State', completed: !!profile.state },
    { label: 'Rank', completed: !!profile.rank },
    { label: 'Main Role', completed: !!(profile.main_roles?.length || profile.main_role) },
    { label: 'WhatsApp', completed: hasWhatsApp },
    { label: 'Avatar Photo', completed: !!profile.avatar_url },
    { label: 'Win Rate', completed: profile.win_rate !== null && profile.win_rate !== undefined },
    { label: 'Bio', completed: !!profile.bio },
    { label: 'Favorite Heroes', completed: (profile.favorite_heroes?.length || 0) > 0 },
  ];

  const completed = items.filter((i) => i.completed).length;
  const total = items.length;
  const percentage = Math.round((completed / total) * 100);

  if (percentage === 100) return null;

  return (
    <div className={cn('glass-card p-4', className)}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">Profile Completeness</h3>
        <span className={cn(
          'text-sm font-bold',
          percentage >= 80 ? 'text-primary' : percentage >= 50 ? 'text-muted-foreground' : 'text-secondary'
        )}>
          {percentage}%
        </span>
      </div>
      <Progress value={percentage} className="h-2 mb-3" />
      <div className="grid grid-cols-2 gap-1.5">
        {items.filter(i => !i.completed).map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Circle className="w-3 h-3 shrink-0" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
