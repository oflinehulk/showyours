import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'primary' | 'secondary' | 'accent';
  hoverable?: boolean;
  noBorder?: boolean;
  id?: string;
}

const glowColorMap = {
  primary: 'border-[#FF4500]/20 hover:border-[#FF4500]/40',
  secondary: 'border-[#FF6B35]/20 hover:border-[#FF6B35]/40',
  accent: 'border-[#FF2D00]/20 hover:border-[#FF2D00]/40',
};

const glowShadowMap = {
  primary: 'hover:shadow-[0_0_10px_rgba(255,69,0,0.15)]',
  secondary: 'hover:shadow-[0_0_10px_rgba(255,107,53,0.15)]',
  accent: 'hover:shadow-[0_0_10px_rgba(255,45,0,0.15)]',
};

export function GlowCard({
  children,
  className,
  glowColor = 'primary',
  hoverable = false,
  noBorder = false,
  id,
}: GlowCardProps) {
  return (
    <div
      id={id}
      className={cn(
        'bg-[#111111] rounded-lg',
        !noBorder && 'border',
        !noBorder && glowColorMap[glowColor],
        hoverable && 'transition-all duration-300 hover:-translate-y-0.5',
        hoverable && glowShadowMap[glowColor],
        className
      )}
    >
      {children}
    </div>
  );
}
