'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import type { FloorTable } from './FloorMapGrid';
import type { FloorTableCanvas } from './FloorMapCanvas';

const FloorMapCanvas = dynamic(() => import('./FloorMapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400 animate-pulse">Đang tải sơ đồ bàn...</p>
    </div>
  ),
});

interface Props {
  tables: FloorTable[];
  onTableClick: (table: FloorTable) => void;
}

export default function FloorMapDynamic({ tables, onTableClick }: Props) {
  const mappedTables: FloorTableCanvas[] = tables.map((t, index) => ({
    ...t,
    coord_x: (index % 4) * 120 + 40,
    coord_y: Math.floor(index / 4) * 120 + 40,
    width: 80,
    height: 80,
    shape: index % 2 === 0 ? 'circle' : 'rectangle',
  }));

  return (
    <FloorMapCanvas 
      tables={mappedTables} 
      onTableClick={(canvasTable) => {
        onTableClick({
          id: canvasTable.id,
          name: canvasTable.name,
          status: canvasTable.status
        });
      }} 
    />
  );
}
