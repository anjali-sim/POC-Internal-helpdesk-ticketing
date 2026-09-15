import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
      <p className="text-xs text-muted tabular-nums">
        Showing <span className="font-medium text-fg">{first}</span>–
        <span className="font-medium text-fg">{last}</span> of{' '}
        <span className="font-medium text-fg">{total}</span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          leadingIcon={<ChevronLeft className="size-4" />}
        >
          Previous
        </Button>
        <span className="text-xs text-muted tabular-nums">
          {page} / {pageCount}
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          trailingIcon={<ChevronRight className="size-4" />}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
