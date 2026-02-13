import { Layout } from './Layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

export function LoadingPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    </Layout>
  );
}

export function LoadingCards({ count = 6, columns = 3 }: { count?: number; columns?: number }) {
  const gridClass = columns === 2 
    ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  
  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-4 space-y-3">
          <div className="flex items-start gap-4">
            <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ 
  title = 'Something went wrong', 
  message = 'Please try refreshing the page.',
  onRetry,
}: { 
  title?: string; 
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">⚠️</span>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
