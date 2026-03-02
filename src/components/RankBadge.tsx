import { memo } from 'react';
import { cn } from '@/lib/utils';
import { RANKS, type RankId } from '@/lib/constants';

interface RankBadgeProps {
  rank: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

const rankColors: Record<string, string> = {
  warrior: 'bg-rank-warrior',
  elite: 'bg-rank-elite',
  master: 'bg-rank-master',
  grandmaster: 'bg-rank-grandmaster',
  epic: 'bg-rank-epic',
  legend: 'bg-rank-legend',
  mythic: 'bg-rank-mythic',
  'mythical-honor': 'bg-rank-mythical-honor',
  'mythical-glory': 'bg-rank-mythical-glory',
  immortal: 'bg-rank-immortal',
};

const rankIcons: Record<string, string> = {
  warrior: '⚔️',
  elite: '🔷',
  master: '💎',
  grandmaster: '🏆',
  epic: '👑',
  legend: '🌟',
  mythic: '🔥',
  'mythical-honor': '⚡',
  'mythical-glory': '💫',
  immortal: '🌌',
};

export const RankBadge = memo(function RankBadge({ rank, size = 'md', showName = true, className }: RankBadgeProps) {
  const rankData = RANKS.find(r => r.id === rank);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold text-white rank-glow',
        rankColors[rank] || 'bg-muted',
        sizeClasses[size],
        className
      )}
    >
      <span>{rankIcons[rank] || '⚔️'}</span>
      {showName && <span>{rankData?.name || rank}</span>}
    </span>
  );
});
