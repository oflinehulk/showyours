import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Swords } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

export function Logo({ size = 'md', className, showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-6 h-6', iconInner: 'w-3 h-3', text: 'text-base' },
    md: { icon: 'w-8 h-8', iconInner: 'w-4 h-4', text: 'text-lg' },
    lg: { icon: 'w-12 h-12', iconInner: 'w-6 h-6', text: 'text-2xl' },
  };

  return (
    <Link to="/" className={cn('flex items-center gap-2 group', className)}>
      <div className={cn(
        'rounded-xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center relative overflow-hidden',
        sizes[size].icon
      )}>
        {/* Animated shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        <Swords className={cn('text-primary-foreground relative z-10', sizes[size].iconInner)} />
      </div>
      {showText && (
        <span className={cn('font-bold text-foreground group-hover:text-primary transition-colors', sizes[size].text)}>
          MLBB<span className="text-primary">Recruit</span>
        </span>
      )}
    </Link>
  );
}
