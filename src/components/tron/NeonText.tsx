import { cn } from '@/lib/utils';

interface NeonTextProps {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'span' | 'p';
  className?: string;
  flicker?: boolean;
  glow?: boolean;
}

export function NeonText({
  children,
  as: Tag = 'h2',
  className,
  flicker = false,
  glow = true,
}: NeonTextProps) {
  return (
    <Tag
      className={cn(
        'font-display font-bold tracking-wide',
        glow && 'text-neon',
        flicker && 'animate-neon-flicker',
        className
      )}
    >
      {children}
    </Tag>
  );
}
