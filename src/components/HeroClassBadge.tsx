import { cn } from '@/lib/utils';
import { HERO_CLASSES, type HeroClassId } from '@/lib/constants';
import { Shield, Swords, Skull, Sparkles, Target, Heart, HelpCircle } from 'lucide-react';

interface HeroClassBadgeProps {
  heroClass: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

const classIcons: Record<string, React.ReactNode> = {
  tank: <Shield className="w-full h-full" />,
  fighter: <Swords className="w-full h-full" />,
  assassin: <Skull className="w-full h-full" />,
  mage: <Sparkles className="w-full h-full" />,
  marksman: <Target className="w-full h-full" />,
  support: <Heart className="w-full h-full" />,
};

const classColors: Record<string, string> = {
  tank: 'text-blue-400 bg-blue-400/10',
  fighter: 'text-orange-400 bg-orange-400/10',
  assassin: 'text-red-400 bg-red-400/10',
  mage: 'text-purple-400 bg-purple-400/10',
  marksman: 'text-yellow-400 bg-yellow-400/10',
  support: 'text-green-400 bg-green-400/10',
};

export function HeroClassBadge({ heroClass, size = 'md', showName = true, className }: HeroClassBadgeProps) {
  const classData = HERO_CLASSES.find(c => c.id === heroClass);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-medium border border-current/20',
        classColors[heroClass] || 'text-muted-foreground bg-muted',
        sizeClasses[size],
        className
      )}
    >
      <span className={iconSizes[size]}>{classIcons[heroClass] || <HelpCircle className="w-full h-full" />}</span>
      {showName && <span>{classData?.name || heroClass}</span>}
    </span>
  );
}
