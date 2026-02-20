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
        'rounded-lg bg-gradient-to-br from-[#FF4500] to-[#FF2D00] flex items-center justify-center relative overflow-hidden',
        sizes[size].icon
      )}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        <Swords className={cn('text-white relative z-10', sizes[size].iconInner)} />
      </div>
      {showText && (
        <span className={cn('font-display font-bold tracking-wider text-foreground group-hover:text-neon transition-colors', sizes[size].text)}>
          SHOW<span className="text-neon text-neon-subtle">YOURS</span>
        </span>
      )}
    </Link>
  );
}
