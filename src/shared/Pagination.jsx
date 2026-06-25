import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function usePagination(rows, pageSize = 50) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  return { page, setPage, totalPages, pageRows, hasPrev: page > 1, hasNext: page < totalPages };
}

export default function Pagination({ page, totalPages, setPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button type="button" className="compactButton" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Poprzednia strona">
        <ChevronLeft size={14} aria-hidden="true" />
      </button>
      <span className="paginationInfo">{page} / {totalPages}</span>
      <button type="button" className="compactButton" disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Następna strona">
        <ChevronRight size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
