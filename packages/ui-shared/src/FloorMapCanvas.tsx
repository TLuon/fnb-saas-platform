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
  shape?: 'circle' | 'rectangle' | 'square' | 'door' | 'stairs' | 'plant' | 'window' | 'balcony' | 'wc' | 'counter' | 'aquarium';
  rotation?: number;
  capacity?: number;
  current_order_id?: string | null;
  reservation_time?: string | null;
  reservation_code?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  deposit_amount?: number | null;
}

export interface FloorMapCanvasProps {
  tables: FloorTableCanvas[];
  editable?: boolean;
  selectedTableId?: string;
  minScale?: number;
  maxScale?: number;
  onTableClick?: (table: FloorTableCanvas) => void;
  onTableSelect?: (table: FloorTableCanvas) => void;
  onTableMove?: (table: FloorTableCanvas, newX: number, newY: number) => void;
}

export const isDecorItem = (table: { shape?: string; capacity?: number }) => {
  if (table.capacity === 0) return true;
  const rawShape = (table.shape || '').split(':')[0].toLowerCase();
  const decorShapes = ['door', 'stairs', 'plant', 'window', 'balcony', 'wc', 'counter', 'aquarium'];
  return decorShapes.includes(rawShape);
};

const DEFAULT_SIZE = 80;

export const FloorMapCanvas: React.FC<FloorMapCanvasProps> = ({
  tables,
  editable = false,
  selectedTableId,
  minScale,
  maxScale,
  onTableClick,
  onTableSelect,
  onTableMove
}) => {
  const effectiveMinScale = minScale ?? (editable ? 0.05 : 0.5);
  const effectiveMaxScale = maxScale ?? (editable ? 10.0 : 3.0);
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

  // Auto-fit & center calculation for non-editable operational views
  useEffect(() => {
    if (editable || localTables.length === 0 || canvasSize.width === 0 || canvasSize.height === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    localTables.forEach((t, index) => {
      const x = t.coord_x ?? (index % 4) * 120 + 40;
      const y = t.coord_y ?? Math.floor(index / 4) * 120 + 40;
      const rawShape = (t.shape || '').toLowerCase();
      const baseShape = rawShape.split(':')[0];
      const w = t.width ?? DEFAULT_SIZE;
      const h = t.height ?? (baseShape === 'square' ? w : DEFAULT_SIZE);

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    });

    if (minX === Infinity) return;

    const mapWidth = maxX - minX;
    const mapHeight = maxY - minY;
    const padding = 40;

    const fitScaleX = canvasSize.width / (mapWidth + padding * 2);
    const fitScaleY = canvasSize.height / (mapHeight + padding * 2);
    const fitScale = Math.min(fitScaleX, fitScaleY, effectiveMaxScale);

    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;
    const canvasCenterX = canvasSize.width / 2;
    const canvasCenterY = canvasSize.height / 2;

    const fitOffsetX = canvasCenterX - contentCenterX * fitScale;
    const fitOffsetY = canvasCenterY - contentCenterY * fitScale;

    setScale(fitScale);
    setOffset({ x: fitOffsetX, y: fitOffsetY });
  }, [editable, localTables, canvasSize]);

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
      
      const rawShape = (table.shape || '').toLowerCase();
      let baseShape = rawShape;
      let rot = table.rotation || 0;
      if (rawShape.includes(':')) {
        const parts = rawShape.split(':');
        baseShape = parts[0];
        if (!rot) rot = parseInt(parts[1], 10) || 0;
      }

      const h = table.height ?? (baseShape === 'square' ? w : DEFAULT_SIZE);
      const isDecor = isDecorItem(table);

      ctx.save();
      
      // Translate to object center & rotate
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.translate(cx, cy);
      if (rot !== 0) {
        ctx.rotate((rot * Math.PI) / 180);
      }

      // Drawing bounds relative to center
      const rx = -w / 2;
      const ry = -h / 2;

      if (isDecor) {
        if (baseShape === 'door') {
          ctx.fillStyle = '#F5E6D3';
          ctx.strokeStyle = '#8C5A2B';
          ctx.lineWidth = 3;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(rx, ry, w, h, 6); else ctx.rect(rx, ry, w, h);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#543310';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`🚪 ${table.name || 'Cửa ra vào'}`, 0, 0);
        } else if (table.shape === 'stairs') {
          ctx.fillStyle = '#E2E8F0';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 3;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(rx, ry, w, h, 6); else ctx.rect(rx, ry, w, h);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = '#94A3B8';
          ctx.lineWidth = 1.5;
          const steps = 4;
          for (let s = 1; s < steps; s++) {
            ctx.beginPath();
            ctx.moveTo(rx + (w / steps) * s, ry);
            ctx.lineTo(rx + (w / steps) * s, ry + h);
            ctx.stroke();
          }

          ctx.fillStyle = '#1E293B';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`🪜 ${table.name || 'Cầu thang'}`, 0, 0);
        } else if (table.shape === 'plant') {
          ctx.fillStyle = '#DCFCE7';
          ctx.strokeStyle = '#16A34A';
          ctx.lineWidth = 3;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(rx, ry, w, h, 8); else ctx.rect(rx, ry, w, h);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#14532D';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`🌿 ${table.name || 'Bồn hoa'}`, 0, 0);
        } else if (table.shape === 'window') {
          ctx.fillStyle = '#E0F2FE';
          ctx.strokeStyle = '#0284C7';
          ctx.lineWidth = 3;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(rx, ry, w, h, 6); else ctx.rect(rx, ry, w, h);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#0369A1';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`🪟 ${table.name || 'View đẹp'}`, 0, 0);
        } else if (table.shape === 'balcony') {
          ctx.fillStyle = '#FEF3C7';
          ctx.strokeStyle = '#D97706';
          ctx.lineWidth = 3;
          if (ctx.setLineDash) ctx.setLineDash([6, 3]);
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(rx, ry, w, h, 6); else ctx.rect(rx, ry, w, h);
          ctx.fill();
          ctx.stroke();
          if (ctx.setLineDash) ctx.setLineDash([]);

          ctx.fillStyle = '#78350F';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`☕ ${table.name || 'Ban công'}`, 0, 0);
        } else if (table.shape === 'wc') {
          ctx.fillStyle = '#E0E7FF';
          ctx.strokeStyle = '#4338CA';
          ctx.lineWidth = 3;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(rx, ry, w, h, 8); else ctx.rect(rx, ry, w, h);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#3730A3';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`🚻 ${table.name || 'Nhà vệ sinh'}`, 0, 0);
        } else if (table.shape === 'counter') {
          ctx.fillStyle = '#FDE68A';
          ctx.strokeStyle = '#B45309';
          ctx.lineWidth = 3;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(rx, ry, w, h, 10); else ctx.rect(rx, ry, w, h);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#78350F';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`🍹 ${table.name || 'Quầy Order'}`, 0, 0);
        } else if (table.shape === 'aquarium') {
          ctx.fillStyle = '#CCFBF1';
          ctx.strokeStyle = '#0D9488';
          ctx.lineWidth = 3;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(rx, ry, w, h, 8); else ctx.rect(rx, ry, w, h);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#115E59';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`🐠 ${table.name || 'Bể cá'}`, 0, 0);
        }

        if (selectedTableId === table.id) {
          ctx.strokeStyle = '#D67D3E';
          ctx.lineWidth = 4;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(rx - 2, ry - 2, w + 4, h + 4, 6); else ctx.rect(rx - 2, ry - 2, w + 4, h + 4);
          ctx.stroke();
        }
      } else {
        // Standard table rendering
        ctx.fillStyle = getTableColor(table.status);
        ctx.beginPath();
        
        if (table.shape === 'circle') {
          ctx.arc(0, 0, w / 2, 0, 2 * Math.PI);
        } else {
          if (ctx.roundRect) ctx.roundRect(rx, ry, w, h, 8); else ctx.rect(rx, ry, w, h);
        }
        
        ctx.fill();
        
        if (table.status === 'PENDING_LOCK' || selectedTableId === table.id) {
          ctx.strokeStyle = '#D67D3E';
          ctx.lineWidth = 4;
          if (table.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, w / 2 + 2, 0, 2 * Math.PI);
            ctx.stroke();
          } else {
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(rx - 2, ry - 2, w + 4, h + 4, 8); else ctx.rect(rx - 2, ry - 2, w + 4, h + 4);
            ctx.stroke();
          }
        }

        ctx.fillStyle = (table.status === 'OCCUPIED' || table.status === 'RESERVED') ? '#fff' : '#543310';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(table.name, 0, 0);

        if (table.status === 'RESERVED' && table.reservation_time) {
          const reserveTime = new Date(table.reservation_time).getTime();
          const cancelTime = reserveTime + 60 * 60 * 1000;
          const now = Date.now();
          
          ctx.font = 'bold 12px sans-serif';
          if (cancelTime > now) {
            const diff = Math.floor((cancelTime - now) / 1000);
            const mins = Math.floor(diff / 60);
            const secs = diff % 60;
            ctx.fillStyle = mins < 15 ? '#B42318' : '#D67D3E';
            ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, 0, ry + h + 16);
          } else {
            ctx.fillStyle = '#B42318';
            ctx.fillText('Hết hạn', 0, ry + h + 16);
          }
        } else if ((table.status === 'OCCUPIED' || table.status === 'CLEANING') && table.current_order_id) {
          ctx.font = 'bold 12px sans-serif';
          ctx.fillStyle = '#D67D3E';
          ctx.fillText(`#${table.current_order_id.slice(0, 6).toUpperCase()}`, 0, ry + h + 16);
        }
      }

      ctx.restore();
    });

    ctx.restore();
  }, [localTables, offset, scale, selectedTableId, canvasSize]);

  useEffect(() => {
    drawCanvas();
    const interval = setInterval(drawCanvas, 1000);
    return () => clearInterval(interval);
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
      const isDecor = isDecorItem(table);
      if (!editable && isDecor) continue;

      const tx = table.coord_x ?? (i % 4) * 120 + 40;
      const ty = table.coord_y ?? Math.floor(i / 4) * 120 + 40;
      const tw = table.width ?? DEFAULT_SIZE;
      const th = table.height ?? (table.shape === 'square' ? tw : DEFAULT_SIZE);
      const rot = table.rotation || 0;
      
      const cx = tx + tw / 2;
      const cy = ty + th / 2;
      const dx = x - cx;
      const dy = y - cy;
      const rad = (-rot * Math.PI) / 180;
      const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
      const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

      if (table.shape === 'circle') {
        const radius = tw / 2;
        const distance = Math.sqrt(localX * localX + localY * localY);
        if (distance <= radius) return table;
      } else {
        if (localX >= -tw / 2 && localX <= tw / 2 && localY >= -th / 2 && localY <= th / 2) return table;
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
    if (!editable) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [editable]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !editable) return;
    
    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomIntensity = 0.1;
      const wheel = e.deltaY < 0 ? 1 : -1;
      let newScale = scaleRef.current * Math.exp(wheel * zoomIntensity);
      newScale = Math.max(effectiveMinScale, Math.min(newScale, effectiveMaxScale));

      // Calculate offset to zoom towards mouse
      const newOffsetX = mouseX - (mouseX - offsetRef.current.x) * (newScale / scaleRef.current);
      const newOffsetY = mouseY - (mouseY - offsetRef.current.y) * (newScale / scaleRef.current);

      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
    };
    
    canvas.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheelNative);
  }, [editable, effectiveMinScale, effectiveMaxScale]);

  const handleZoomIn = () => {
    if (!editable) return;
    const newScale = Math.min(effectiveMaxScale, scale * 1.2);
    setScale(newScale);
  };

  const handleZoomOut = () => {
    if (!editable) return;
    const newScale = Math.max(effectiveMinScale, scale / 1.2);
    setScale(newScale);
  };

  const handleResetZoom = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full min-h-[380px] rounded-lg overflow-hidden border border-[var(--color-brand-neutral)] shadow-inner bg-[#FAF7F3] relative ${editable ? 'cursor-default' : 'cursor-default'}`}
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

      {/* Top right helper badge (ONLY in FloorEditor) */}
      {editable && (
        <div className="absolute top-3 right-3 bg-white/95 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 backdrop-blur-md pointer-events-none shadow-md z-[100] border border-gray-200">
          Cuộn để Zoom ({Math.round(scale * 100)}%) - Zoom tự do (Kéo bàn để di chuyển)
        </div>
      )}

      {/* Zoom Control Buttons (ONLY in FloorEditor) */}
      {editable && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white px-2 py-1.5 rounded-xl shadow-md border border-gray-200 backdrop-blur-md z-[100]">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg text-lg border border-gray-300 transition"
            title="Phóng to"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg text-lg border border-gray-300 transition"
            title="Thu nhỏ"
          >
            -
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-3 h-8 flex items-center justify-center font-bold text-xs text-[#D67D3E] bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition"
            title="Về tỉ lệ chuẩn 100%"
          >
            Reset ({Math.round(scale * 100)}%)
          </button>
        </div>
      )}
    </div>
  );
};

