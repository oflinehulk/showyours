import { cn } from '@/lib/utils';

interface CircuitLoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CircuitLoader({ className, size = 'md' }: CircuitLoaderProps) {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <svg
        className={cn(sizeMap[size], 'animate-spin')}
        viewBox="0 0 50 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer ring */}
        <circle
          cx="25"
          cy="25"
          r="20"
          stroke="rgba(255,69,0,0.15)"
          strokeWidth="2"
          fill="none"
        />
        {/* Animated arc */}
        <path
          d="M25 5 A20 20 0 0 1 45 25"
          stroke="#FF4500"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          style={{
            filter: 'drop-shadow(0 0 4px rgba(255,69,0,0.6))',
          }}
        />
        {/* Center dot */}
        <circle
          cx="25"
          cy="25"
          r="2"
          fill="#FF4500"
          style={{
            filter: 'drop-shadow(0 0 3px rgba(255,69,0,0.8))',
          }}
        />
        {/* Circuit node dots */}
        <circle cx="25" cy="5" r="1.5" fill="#FF4500" opacity="0.6" />
        <circle cx="45" cy="25" r="1.5" fill="#FF4500" opacity="0.6" />
      </svg>
    </div>
  );
}
