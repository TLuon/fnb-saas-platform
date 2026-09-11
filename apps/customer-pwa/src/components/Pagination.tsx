import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      <button 
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border border-[#E8DED5] bg-white text-[#6B625B] disabled:opacity-50 hover:bg-[#FAF7F3] transition-colors"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }).map((_, idx) => {
          const page = idx + 1;
          const isActive = page === currentPage;
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                isActive ? 'bg-[#D67D3E] text-white shadow-sm' : 'bg-white border border-[#E8DED5] text-[#6B625B] hover:bg-[#FAF7F3]'
              }`}
            >
              {page}
            </button>
          );
        })}
      </div>

      <button 
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border border-[#E8DED5] bg-white text-[#6B625B] disabled:opacity-50 hover:bg-[#FAF7F3] transition-colors"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
