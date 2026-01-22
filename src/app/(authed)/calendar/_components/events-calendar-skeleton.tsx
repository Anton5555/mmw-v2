import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

export function EventsCalendarSkeleton() {
  return (
    <div className="lg:rounded-lg lg:border bg-card lg:p-6 shadow-xs relative">
      <div className="flex items-center justify-between mb-2 lg:mb-8">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando eventos...</p>
        </div>
      </div>
    </div>
  );
}
