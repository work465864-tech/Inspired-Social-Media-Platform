'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../Button';

export type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  label?: string;
  className?: string;
};

export function Pagination({
  className,
  label = 'Pagination',
  onPageChange,
  page,
  pageCount,
}: PaginationProps) {
  if (pageCount <= 1) {
    return null;
  }

  const currentPage = Math.max(1, Math.min(page, pageCount));
  const visibleCount = Math.min(5, pageCount);
  const start = Math.max(
    1,
    Math.min(
      currentPage - Math.floor(visibleCount / 2),
      pageCount - visibleCount + 1,
    ),
  );
  const pages = Array.from(
    { length: visibleCount },
    (_, index) => start + index,
  );

  return (
    <nav
      aria-label={label}
      className={`flex flex-wrap items-center justify-center gap-1.5 ${className ?? ''}`}
    >
      <Button
        aria-label="Previous page"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        size="icon"
        variant="ghost"
      >
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
      </Button>
      {pages.map((pageNumber) => (
        <Button
          aria-current={pageNumber === currentPage ? 'page' : undefined}
          aria-label={`Page ${pageNumber}`}
          key={pageNumber}
          onClick={() => onPageChange(pageNumber)}
          size="icon"
          variant={pageNumber === currentPage ? 'primary' : 'ghost'}
        >
          {pageNumber}
        </Button>
      ))}
      <Button
        aria-label="Next page"
        disabled={currentPage >= pageCount}
        onClick={() => onPageChange(currentPage + 1)}
        size="icon"
        variant="ghost"
      >
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </Button>
    </nav>
  );
}
