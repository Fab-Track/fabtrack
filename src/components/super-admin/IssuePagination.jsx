import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function IssuePagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1 mt-4 flex-wrap">
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Prev
      </Button>

      {start > 1 && (
        <>
          <PageButton page={1} active={page === 1} onClick={onPageChange} />
          {start > 2 && <span className="px-1 text-muted-foreground text-sm">…</span>}
        </>
      )}

      {pages.map((p) => (
        <PageButton key={p} page={p} active={page === p} onClick={onPageChange} />
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-muted-foreground text-sm">…</span>}
          <PageButton page={totalPages} active={page === totalPages} onClick={onPageChange} />
        </>
      )}

      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next <ChevronRight className="w-3.5 h-3.5" />
      </Button>

      <span className="text-xs text-muted-foreground ml-2">
        Page {page} of {totalPages}
      </span>
    </div>
  );
}

function PageButton({ page, active, onClick }) {
  return (
    <Button
      size="icon"
      variant={active ? 'default' : 'outline'}
      className="h-8 w-8 text-xs shrink-0"
      onClick={() => onClick(page)}
    >
      {page}
    </Button>
  );
}