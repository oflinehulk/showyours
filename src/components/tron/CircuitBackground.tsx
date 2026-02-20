import { cn } from '@/lib/utils';

interface CircuitBackgroundProps {
  className?: string;
  intensity?: 'light' | 'medium' | 'strong';
}

export function CircuitBackground({ className, intensity = 'light' }: CircuitBackgroundProps) {
  const opacityMap = {
    light: 0.03,
    medium: 0.06,
    strong: 0.1,
  };
  const op = opacityMap[intensity];

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {/* Grid pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,69,0,${op}) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,69,0,${op}) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      {/* Circuit nodes - SVG */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: op * 8 }}
      >
        <defs>
          <pattern id="circuit-dots" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="0" cy="0" r="1.5" fill="#FF4500" />
            <circle cx="60" cy="0" r="1.5" fill="#FF4500" />
            <circle cx="0" cy="60" r="1.5" fill="#FF4500" />
            <circle cx="60" cy="60" r="1.5" fill="#FF4500" />
            <circle cx="30" cy="30" r="1" fill="#FF4500" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit-dots)" />
      </svg>
      {/* Radial glow from center */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(255,69,0,0.05) 0%, transparent 60%)',
        }}
      />
    </div>
  );
}
