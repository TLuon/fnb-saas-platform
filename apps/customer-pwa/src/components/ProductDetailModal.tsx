import React, { useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { useAuthGuard } from '../hooks/useAuthGuard';

interface ProductDetailModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: any, quantity: number, note: string) => void;
}

export function ProductDetailModal({ product, isOpen, onClose, onAddToCart }: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const { requireAuth } = useAuthGuard();

  if (!isOpen || !product) return null;

  const handleClose = () => {
    setQuantity(1);
    setNote('');
    onClose();
  };

  const handleAdd = () => {
    onAddToCart(product, quantity, note);
    handleClose();
  };


  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 transition-opacity">
      <div 
        className="bg-[#FFFFFF] w-full sm:w-[500px] sm:max-h-[90vh] sm:rounded-2xl rounded-t-2xl flex flex-col overflow-hidden animate-slide-up sm:animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header / Image */}
        <div className="relative h-64 bg-[#FAF7F3] shrink-0">
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60 z-10"
          >
            <X size={20} />
          </button>
          <img 
            src={
              (product.image_url && product.image_url !== 'null' && product.image_url !== 'undefined' && product.image_url !== '')
                ? (product.image_url.startsWith('http') ? product.image_url : `http://localhost:3001${product.image_url}`)
                : `https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=400&q=80`
            } 
            alt={product.name} 
            className="w-full h-full object-cover" 
          />
        </div>

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#543310] mb-2">{product.name}</h2>
            <p className="text-[#6B625B] text-sm leading-relaxed mb-4">{product.description}</p>
            <div className="text-xl font-bold text-[#D67D3E]">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.base_price)}
            </div>
          </div>

          <hr className="border-[#E8DED5] mb-6" />

          {/* Dummy Modifiers for UI demonstration */}
          <div className="mb-6">
            <h3 className="font-bold text-[#222222] mb-3">Tuỳ chọn thêm (Giả lập)</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="radio" name="size" className="text-[#D67D3E] focus:ring-[#D67D3E]" defaultChecked />
                <span className="text-sm text-[#222222] flex-1">Size M</span>
                <span className="text-sm text-[#6B625B]">+0đ</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="radio" name="size" className="text-[#D67D3E] focus:ring-[#D67D3E]" />
                <span className="text-sm text-[#222222] flex-1">Size L</span>
                <span className="text-sm text-[#6B625B]">+10.000đ</span>
              </label>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-bold text-[#222222] mb-3">Ghi chú cho quán</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ít đá, nhiều đường..."
              className="w-full p-3 border border-[#E8DED5] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D67D3E] focus:border-[#D67D3E] text-sm"
              rows={2}
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[#E8DED5] bg-white flex items-center gap-4">
          <div className="flex items-center border border-[#E8DED5] rounded-xl h-12 overflow-hidden shrink-0">
            <button 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-12 h-full flex items-center justify-center text-[#543310] hover:bg-[#FAF7F3]"
            >
              <Minus size={18} />
            </button>
            <span className="w-10 text-center font-bold text-[#222222]">{quantity}</span>
            <button 
              onClick={() => setQuantity(quantity + 1)}
              className="w-12 h-full flex items-center justify-center text-[#543310] hover:bg-[#FAF7F3]"
            >
              <Plus size={18} />
            </button>
          </div>
          
          <button 
            onClick={handleAdd}
            className="flex-1 h-12 bg-[#543310] text-white rounded-xl font-bold flex items-center justify-center hover:bg-[#D67D3E] transition-colors"
          >
            Thêm
          </button>
        </div>

      </div>
    </div>
  );
}
