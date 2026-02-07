import { cn } from '@/lib/utils';
import { ROLES, type RoleId } from '@/lib/constants';
import { Target, Swords, Crosshair, Shield, Trees, HelpCircle } from 'lucide-react';

interface RoleIconProps {
  role: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

const roleIcons: Record<string, React.ReactNode> = {
  gold: <Target className="w-full h-full" />,
  exp: <Swords className="w-full h-full" />,
  mid: <Crosshair className="w-full h-full" />,
  roam: <Shield className="w-full h-full" />,
  jungle: <Trees className="w-full h-full" />,
};

const roleColors: Record<string, string> = {
  gold: 'text-yellow-400',
  exp: 'text-orange-400',
  mid: 'text-purple-400',
  roam: 'text-cyan-400',
  jungle: 'text-green-400',
};

export function RoleIcon({ role, size = 'md', showName = true, className }: RoleIconProps) {
  const roleData = ROLES.find(r => r.id === role);
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn(sizeClasses[size], roleColors[role] || 'text-muted-foreground')}>
        {roleIcons[role] || <HelpCircle className="w-full h-full" />}
      </span>
      {showName && (
        <span className="text-muted-foreground">{roleData?.name || role}</span>
      )}
    </span>
  );
}
