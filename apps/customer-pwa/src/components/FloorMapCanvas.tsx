'use client';

import React, { useRef, useEffect, useState, MouseEvent as ReactMouseEvent } from 'react';
import { getTableColor, TableStatus } from '@fnb/utils';

export interface FloorTableCanvas {
  id: string;
  name: string;
  status: TableStatus;
  coord_x?: number;
  coord_y?: number;
  width?: number;
  height?: number;
  shape?: 'circle' | 'rectangle';
}

interface FloorMapCanvasProps {
  tables: FloorTableCanvas[];
  onTableClick: (table: FloorTableCanvas) => void;
}

export default function FloorMapCanvas({ tables, onTableClick }: FloorMapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // View transform state
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [clickStart, setClickStart] = useState({ x: 0, y: 0 });

  // Default table dimensions if not provided
  const DEFAULT_SIZE = 80;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Adjust canvas resolution
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      canvas.width = rect.width;
      canvas.height = rect.height || 500;
    }

    // Clear and draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    tables.forEach((table, index) => {
      // Fallback layout if coords are missing
      const x = table.coord_x ?? (index % 4) * 120 + 40;
      const y = table.coord_y ?? Math.floor(index / 4) * 120 + 40;
      const w = table.width ?? DEFAULT_SIZE;
      const h = table.height ?? DEFAULT_SIZE;

      ctx.fillStyle = getTableColor(table.status);
      ctx.beginPath();
      
      if (table.shape === 'circle') {
        ctx.arc(x + w/2, y + h/2, w/2, 0, 2 * Math.PI);
      } else {
        ctx.roundRect ? ctx.roundRect(x, y, w, h, 10) : ctx.rect(x, y, w, h);
      }
      
      ctx.fill();
      
      // Draw border if needed
      if (table.status === 'PENDING_LOCK') {
        ctx.strokeStyle = '#D67D3E';
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // Draw text
      ctx.fillStyle = (table.status === 'OCCUPIED' || table.status === 'RESERVED') ? '#fff' : '#543310';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(table.name, x + w/2, y + h/2);
    });

    ctx.restore();
  }, [tables, offset, scale]);

  const getCanvasMousePosition = (e: ReactMouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - offset.x) / scale,
      y: (e.clientY - rect.top - offset.y) / scale,
    };
  };

  const handleMouseDown = (e: ReactMouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    setClickStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: ReactMouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = (e: ReactMouseEvent) => {
    if (isDragging) {
      // Check if it was a tiny drag (click)
      const dx = Math.abs(e.clientX - clickStart.x);
      const dy = Math.abs(e.clientY - clickStart.y);
      if (dx < 5 && dy < 5) {
        // It's a click
        handleClick(e);
      }
    }
    setIsDragging(false);
  };

  const handleClick = (e: ReactMouseEvent) => {
    const { x, y } = getCanvasMousePosition(e);
    
    // Reverse array to hit top-most elements first
    for (let i = tables.length - 1; i >= 0; i--) {
      const table = tables[i];
      const tx = table.coord_x ?? (i % 4) * 120 + 40;
      const ty = table.coord_y ?? Math.floor(i / 4) * 120 + 40;
      const tw = table.width ?? DEFAULT_SIZE;
      const th = table.height ?? DEFAULT_SIZE;
      
      if (table.shape === 'circle') {
        const radius = tw / 2;
        const cx = tx + radius;
        const cy = ty + th / 2;
        const distance = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
        
        if (distance <= radius) {
          if (table.status === 'AVAILABLE') {
            onTableClick(table);
          }
          break; // Only click one table
        }
      } else {
        if (x >= tx && x <= tx + tw && y >= ty && y <= ty + th) {
          if (table.status === 'AVAILABLE') {
            onTableClick(table);
          }
          break; // Only click one table
        }
      }
    }
  };

  return (
    <div className="w-full h-[500px] rounded-3xl overflow-hidden border border-gray-200 shadow-inner bg-[var(--color-brand-neutral)] relative cursor-default">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDragging(false)}
        className="block"
      />
    </div>
  );
}
