import React from 'react';
import { Plus } from 'lucide-react';
import { useAuthGuard } from '../hooks/useAuthGuard';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description: string;
    base_price: number;
    image_url: string;
    is_available?: boolean;
    tags?: string[];
  };
  onClick: () => void;
  onAdd: (e: React.MouseEvent) => void;
}

export function ProductCard({ product, onClick, onAdd }: ProductCardProps) {
  const { requireAuth } = useAuthGuard();
  const isAvailable = product.is_available !== false;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    requireAuth(() => {
      onAdd(e);
    });
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-[#FFFFFF] border border-[#E8DED5] rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:border-[#D67D3E] group flex flex-col h-full relative ${!isAvailable ? 'opacity-70' : ''}`}
    >
      <div className="h-40 bg-[#FAF7F3] relative overflow-hidden shrink-0">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#6B625B] bg-gray-100">
            [Hình ảnh]
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {!isAvailable && (
            <span className="px-2 py-1 bg-[#B42318]/90 text-white text-xs font-bold rounded shadow-sm">
              Hết hàng
            </span>
          )}
          {product.tags?.includes('new') && (
            <span className="px-2 py-1 bg-[#FED8B1] text-[#543310] text-xs font-bold rounded shadow-sm">
              Mới
            </span>
          )}
          {product.tags?.includes('popular') && (
            <span className="px-2 py-1 bg-[#D67D3E] text-white text-xs font-bold rounded shadow-sm">
              Phổ biến
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-[#222222] mb-1 line-clamp-2 min-h-[40px]">{product.name}</h3>
        <p className="text-xs text-[#6B625B] line-clamp-2 mb-4 flex-1">
          {product.description}
        </p>
        
        <div className="flex items-center justify-between mt-auto">
          <span className="font-bold text-lg text-[#543310]">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.base_price)}
          </span>
          <button 
            onClick={handleAdd}
            disabled={!isAvailable}
            className="w-10 h-10 rounded-full bg-[#543310] text-white flex items-center justify-center hover:bg-[#D67D3E] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shrink-0"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
