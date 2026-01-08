'use client';

import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMamMoviesParams } from '@/lib/hooks/useMamMoviesParams';
import { useTransition } from 'react';

interface MamPaginationProps {
  currentPage: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
}

export function MamPagination({
  currentPage,
  totalPages,
  hasPrevPage,
  hasNextPage,
}: MamPaginationProps) {
  const { setParams } = useMamMoviesParams();
  const [isPending, startTransition] = useTransition();

  const handlePageChange = (newPage: number) => {
    startTransition(() => {
      setParams({ page: newPage });
    });
  };

  if (totalPages <= 1) return null;

  return (
    <div className="mt-8 flex items-center justify-center gap-1">
      {/* First Page Button */}
      {currentPage > 1 && (
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => handlePageChange(1)}
          disabled={isPending}
          aria-label="Primera página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Previous Page Button */}
      {hasPrevPage && (
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={isPending}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Page Info */}
      <div className="flex items-center gap-1 px-4">
        <span className="text-sm text-muted-foreground">Página</span>
        <span className="text-sm font-medium">{currentPage}</span>
        <span className="text-sm text-muted-foreground">de {totalPages}</span>
      </div>

      {/* Next Page Button */}
      {hasNextPage && (
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={isPending}
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Last Page Button */}
      {currentPage < totalPages && (
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => handlePageChange(totalPages)}
          disabled={isPending}
          aria-label="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
