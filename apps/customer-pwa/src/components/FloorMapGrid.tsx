'use client';

import React from 'react';
import { getTableColor, TableStatus } from '@fnb/utils';

export interface FloorTable {
  id: string;
  name: string;
  status: TableStatus;
}

interface FloorMapGridProps {
  tables: FloorTable[];
  onTableClick: (table: FloorTable) => void;
}

/**
 * CSS Grid fallback cho sơ đồ bàn.
 * Khi F1 bàn giao FloorMapCanvas, chỉ cần thay file này hoặc đổi import
 * trong FloorMapDynamic.tsx.
 */
export default function FloorMapGrid({ tables, onTableClick }: FloorMapGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {tables.map(table => {
        const bgColor = getTableColor(table.status);
        const isWhiteText = table.status === 'OCCUPIED' || table.status === 'RESERVED';
        
        return (
          <div 
            key={table.id}
            onClick={() => onTableClick(table)}
            style={{ backgroundColor: bgColor }}
            className={`
              relative h-36 rounded-3xl shadow-sm border border-white/50 backdrop-blur-md
              flex flex-col items-center justify-center cursor-pointer
              transition-all duration-300 hover:-translate-y-2 hover:shadow-xl
              ${isWhiteText ? 'text-white' : 'text-[var(--color-brand-primary)]'}
              ${table.status === 'PENDING_LOCK' ? 'animate-pulse ring-4 ring-[var(--color-brand-secondary)]/50 ring-offset-2' : ''}
            `}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-3xl pointer-events-none"></div>
            <span className="text-3xl font-black font-serif z-10">{table.name}</span>
            <span className="text-xs font-bold mt-2 opacity-90 uppercase tracking-widest z-10 px-3 py-1 bg-black/10 rounded-full">{table.status}</span>
          </div>
        );
      })}
    </div>
  );
}
