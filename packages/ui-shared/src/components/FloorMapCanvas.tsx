import React from 'react';

export interface FloorMapCanvasProps {
  editable?: boolean;
  tables?: any[];
  onTableClick?: (table: any) => void;
}

// Function to map status to color based on F&B specs
const getTableStyle = (status: string) => {
  switch (status) {
    case 'AVAILABLE':
      return { bg: '#E2F3E5', border: '#8AD199', text: '#222222' }; // Xanh lá nhạt
    case 'PENDING_LOCK':
      return { bg: '#FED8B1', border: '#D67D3E', text: '#543310', animate: 'animate-pulse' };
    case 'RESERVED':
      return { bg: '#D67D3E', border: '#B4642C', text: '#FFFFFF' };
    case 'OCCUPIED':
      return { bg: '#543310', border: '#3A2209', text: '#FFFFFF' };
    case 'CLEANING':
      return { bg: '#E8DED5', border: '#C0B3A7', text: '#6B625B' };
    default:
      return { bg: '#FFFFFF', border: '#E8DED5', text: '#6B625B' };
  }
};

export const FloorMapCanvas: React.FC<FloorMapCanvasProps> = ({ 
  editable = false,
  tables = [],
  onTableClick
}) => {
  return (
    <div className="relative w-full h-[600px] bg-[#FAF7F3] border border-[#E8DED5] rounded-xl overflow-auto custom-scrollbar">
      {/* Canvas Area */}
      <div className="relative w-[1200px] h-[800px] bg-grid-pattern">
        {tables.map(table => {
          const style = getTableStyle(table.status);
          const isCircle = table.shape === 'circle';
          
          return (
            <div
              key={table.id}
              onClick={() => onTableClick && onTableClick(table)}
              className={`absolute flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105 shadow-sm ${style.animate || ''}`}
              style={{
                left: `${table.pos_x}px`,
                top: `${table.pos_y}px`,
                width: `${table.width}px`,
                height: `${table.height}px`,
                backgroundColor: style.bg,
                borderColor: style.border,
                borderWidth: '2px',
                borderStyle: 'solid',
                borderRadius: isCircle ? '50%' : '8px',
                color: style.text
              }}
            >
              <span className="font-bold text-sm">{table.code}</span>
              <span className="text-[10px] opacity-80">{table.capacity} chỗ</span>
            </div>
          );
        })}
        
        {tables.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[#6B625B]">
            <p>Sơ đồ tầng trống. (F1 Placeholder)</p>
          </div>
        )}
      </div>
      
      {/* Grid Pattern CSS (Inline for simplicity) */}
      <style dangerouslySetInnerHTML={{__html: `
        .bg-grid-pattern {
          background-size: 20px 20px;
          background-image: linear-gradient(to right, #E8DED5 1px, transparent 1px), linear-gradient(to bottom, #E8DED5 1px, transparent 1px);
          opacity: 0.5;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #FAF7F3;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E8DED5;
          border-radius: 4px;
        }
      `}} />
    </div>
  );
};
