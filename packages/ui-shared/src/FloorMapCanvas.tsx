import React, { useRef, useEffect, useState, useCallback, MouseEvent as ReactMouseEvent } from 'react';
import { getTableColor, TableStatus } from '@fnb/utils';

export interface FloorTableCanvas {
  id: string;
  name: string;
  status: TableStatus;
  coord_x?: number;
  coord_y?: number;
  width?: number;
  height?: number;
  shape?: 'circle' | 'rectangle' | 'square';
  capacity?: number;
}

export interface FloorMapCanvasProps {
  tables: FloorTableCanvas[];
  editable?: boolean;
  selectedTableId?: string;
  onTableClick?: (table: FloorTableCanvas) => void;
  onTableSelect?: (table: FloorTableCanvas) => void;
  onTableMove?: (table: FloorTableCanvas, newX: number, newY: number) => void;
}

const DEFAULT_SIZE = 80;

export const FloorMapCanvas: React.FC<FloorMapCanvasProps> = ({
  tables,
  editable = false,
  selectedTableId,
  onTableClick,
  onTableSelect,
  onTableMove
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // View transform state
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const offsetRef = useRef(offset);
  const scaleRef = useRef(scale);
  
  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const clickStartRef = useRef({ x: 0, y: 0 });

  // Dragging table state
  const [draggedTableId, setDraggedTableId] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [localTables, setLocalTables] = useState<FloorTableCanvas[]>(tables);

  useEffect(() => {
    if (!draggedTableId) {
      setLocalTables(tables);
    }
  }, [tables, draggedTableId]);

  // Handle ResizeObserver
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    localTables.forEach((table, index) => {
      const x = table.coord_x ?? (index % 4) * 120 + 40;
      const y = table.coord_y ?? Math.floor(index / 4) * 120 + 40;
      const w = table.width ?? DEFAULT_SIZE;
      const h = table.height ?? (table.shape === 'square' ? w : DEFAULT_SIZE);

      ctx.fillStyle = getTableColor(table.status);
      ctx.beginPath();
      
      if (table.shape === 'circle') {
        ctx.arc(x + w/2, y + h/2, w/2, 0, 2 * Math.PI);
      } else {
        ctx.roundRect ? ctx.roundRect(x, y, w, h, 8) : ctx.rect(x, y, w, h);
      }
      
      ctx.fill();
      
      if (table.status === 'PENDING_LOCK' || selectedTableId === table.id) {
        ctx.strokeStyle = '#D67D3E';
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      ctx.fillStyle = (table.status === 'OCCUPIED' || table.status === 'RESERVED') ? '#fff' : '#543310';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(table.name, x + w/2, y + h/2);
    });

    ctx.restore();
  }, [localTables, offset, scale, selectedTableId, canvasSize]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const getCanvasMousePosition = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - offsetRef.current.x) / scaleRef.current,
      y: (clientY - rect.top - offsetRef.current.y) / scaleRef.current,
    };
  };

  const getHitTable = (x: number, y: number) => {
    for (let i = localTables.length - 1; i >= 0; i--) {
      const table = localTables[i];
      const tx = table.coord_x ?? (i % 4) * 120 + 40;
      const ty = table.coord_y ?? Math.floor(i / 4) * 120 + 40;
      const tw = table.width ?? DEFAULT_SIZE;
      const th = table.height ?? (table.shape === 'square' ? tw : DEFAULT_SIZE);
      
      if (table.shape === 'circle') {
        const radius = tw / 2;
        const cx = tx + radius;
        const cy = ty + th / 2;
        const distance = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
        if (distance <= radius) return table;
      } else {
        if (x >= tx && x <= tx + tw && y >= ty && y <= ty + th) return table;
      }
    }
    return null;
  };

  const handlePointerDown = (clientX: number, clientY: number) => {
    clickStartRef.current = { x: clientX, y: clientY };
    const { x, y } = getCanvasMousePosition(clientX, clientY);

    if (editable) {
      const hitTable = getHitTable(x, y);
      if (hitTable) {
        setDraggedTableId(hitTable.id);
        const tx = hitTable.coord_x ?? 0;
        const ty = hitTable.coord_y ?? 0;
        dragOffsetRef.current = { x: x - tx, y: y - ty };
        return;
      }
    }

    setIsPanning(true);
    panStartRef.current = { x: clientX - offset.x, y: clientY - offset.y };
  };

  const handleMouseDown = (e: ReactMouseEvent) => {
    handlePointerDown(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (draggedTableId) {
      const { x, y } = getCanvasMousePosition(clientX, clientY);
      const newX = Math.round((x - dragOffsetRef.current.x) / 10) * 10;
      const newY = Math.round((y - dragOffsetRef.current.y) / 10) * 10;
      
      setLocalTables(prev => prev.map(t => 
        t.id === draggedTableId ? { ...t, coord_x: newX, coord_y: newY } : t
      ));
    } else if (isPanning) {
      setOffset({
        x: clientX - panStartRef.current.x,
        y: clientY - panStartRef.current.y,
      });
    }
  };

  const handleMouseMove = (e: ReactMouseEvent) => {
    handlePointerMove(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handlePointerUp = (clientX: number, clientY: number) => {
    if (draggedTableId) {
      const table = localTables.find(t => t.id === draggedTableId);
      
      const dx = Math.abs(clientX - clickStartRef.current.x);
      const dy = Math.abs(clientY - clickStartRef.current.y);
      
      if (dx < 5 && dy < 5 && table) {
        // It was a click, not a drag
        if (onTableClick) onTableClick(table);
        if (onTableSelect) onTableSelect(table);
      } else if (table && onTableMove) {
        // It was a drag
        onTableMove(table, table.coord_x ?? 0, table.coord_y ?? 0);
      }
      setDraggedTableId(null);
    }
    
    if (isPanning) {
      setIsPanning(false);
      const dx = Math.abs(clientX - clickStartRef.current.x);
      const dy = Math.abs(clientY - clickStartRef.current.y);
      if (dx < 5 && dy < 5) {
        const { x, y } = getCanvasMousePosition(clientX, clientY);
        const hitTable = getHitTable(x, y);
        if (hitTable) {
          if (onTableClick) onTableClick(hitTable);
          if (onTableSelect) onTableSelect(hitTable);
        }
      }
    }
  };

  const handleMouseUp = (e: ReactMouseEvent) => {
    handlePointerUp(e.clientX, e.clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches.length === 1) {
      handlePointerUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomIntensity = 0.1;
      const wheel = e.deltaY < 0 ? 1 : -1;
      let newScale = scaleRef.current * Math.exp(wheel * zoomIntensity);
      newScale = Math.max(0.3, Math.min(newScale, 3));

      // Calculate offset to zoom towards mouse
      const newOffsetX = mouseX - (mouseX - offsetRef.current.x) * (newScale / scaleRef.current);
      const newOffsetY = mouseY - (mouseY - offsetRef.current.y) * (newScale / scaleRef.current);

      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
    };
    
    canvas.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheelNative);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full min-h-[500px] rounded-lg overflow-hidden border border-[var(--color-brand-neutral)] shadow-inner bg-[#FAF7F3] relative ${editable ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="block touch-none"
        role="img"
        aria-label="Sơ đồ bàn tương tác"
      />
      <div className="absolute top-4 right-4 bg-white/90 p-2 rounded-lg text-xs font-medium text-gray-600 backdrop-blur-sm pointer-events-none shadow">
        Cuộn để Zoom - {editable ? 'Kéo bàn để di chuyển' : 'Kéo nền để di chuyển'}
      </div>
    </div>
  );
};

