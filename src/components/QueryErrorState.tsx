import { AlertTriangle, RefreshCw } from 'lucide-react';
import { GlowCard } from '@/components/tron/GlowCard';
import { Button } from '@/components/ui/button';
import { getUserFriendlyMessage } from '@/lib/error-utils';

interface QueryErrorStateProps {
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

export function QueryErrorState({ error, onRetry, className }: QueryErrorStateProps) {
  return (
    <div className={className ?? 'min-h-[40vh] flex items-center justify-center p-6'}>
      <GlowCard className="max-w-md w-full p-8 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
        <h2 className="text-lg font-display font-bold text-foreground">
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground">
          {getUserFriendlyMessage(error)}
        </p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try again
          </Button>
        )}
      </GlowCard>
    </div>
  );
}
