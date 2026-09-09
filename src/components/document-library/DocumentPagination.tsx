import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface DocumentPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number | 'all';
  totalItems: number;
  filteredCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number | 'all') => void;
}

export const DocumentPagination: React.FC<DocumentPaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  filteredCount,
  onPageChange,
  onPageSizeChange,
}) => {
  if (filteredCount === 0) return null;

  const startItem = pageSize === 'all' ? 1 : (currentPage - 1) * pageSize + 1;
  const endItem = pageSize === 'all' ? filteredCount : Math.min(currentPage * pageSize, filteredCount);

  // Generate page numbers to show around current page
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    pages.push(1);

    if (currentPage > 3) {
      pages.push('...');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('...');
    }

    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-xs text-slate-600">
      {/* Items Counter & Per Page */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          Showing <strong className="text-slate-900">{startItem}–{endItem}</strong> of{' '}
          <strong className="text-slate-900">{filteredCount}</strong> records
          {filteredCount < totalItems && (
            <span className="text-slate-400 ml-1">
              (filtered from {totalItems} total)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
          <span className="text-slate-500">Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const val = e.target.value;
              onPageSizeChange(val === 'all' ? 'all' : Number(val));
            }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            id="page-size-selector"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value="all">All ({filteredCount})</option>
          </select>
        </div>
      </div>

      {/* Page Navigation Buttons */}
      {pageSize !== 'all' && totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
            title="First Page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1 mx-1">
            {getPageNumbers().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`dots-${idx}`} className="px-1 text-slate-400">
                    ...
                  </span>
                );
              }
              const pageNum = p as number;
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`min-w-[28px] h-7 px-2 rounded-lg font-medium text-xs transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white font-bold shadow-xs'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
            title="Last Page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
