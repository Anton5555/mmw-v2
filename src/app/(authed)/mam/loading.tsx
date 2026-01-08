import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto px-4 pb-8 pt-4">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-full max-w-2xl md:block hidden" />
          </div>
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="mb-8 md:p-4 md:bg-card md:rounded-lg md:border">
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-10 w-full md:w-64" />
          <Skeleton className="h-10 w-full md:w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Results Count Skeleton */}
      <div className="mb-6">
        <Skeleton className="h-5 w-48" />
      </div>

      {/* Movie Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 18 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[2/3] w-full rounded-lg" />
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="mt-8 flex items-center justify-center gap-1">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-5 w-24 mx-4" />
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9" />
      </div>
    </div>
  );
}
