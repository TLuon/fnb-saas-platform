import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { apiClient } from '@fnb/utils';
import { ProductGrid } from '../ProductGrid';

interface GroupMenuPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: any, quantity: number, note: string) => void;
}

export function GroupMenuPicker({ isOpen, onClose, onAddToCart }: GroupMenuPickerProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && products.length === 0) {
      setLoading(true);
      // Fetch mock data for the picker
      apiClient.get('/public/catalog?tenant_subdomain=demo&branch_id=b1')
        .then((res: any) => {
          let allProducts: any[] = [];
          const catalog = Array.isArray(res) ? res : (res?.categories || []);
          catalog.forEach((cat: any) => {
            if (cat.items) {
              allProducts = [...allProducts, ...cat.items];
            } else {
              allProducts.push(cat);
            }
          });
          setProducts(allProducts);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#FAF7F3] animate-slide-up">
      <div className="bg-[#FFFFFF] p-4 flex items-center justify-between border-b border-[#E8DED5] shadow-sm">
        <h2 className="text-lg font-bold font-serif text-[#543310]">Thêm món mới</h2>
        <button onClick={onClose} className="p-2 -mr-2 text-[#6B625B] hover:text-[#543310]">
          <X size={24} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#543310]"></div>
          </div>
        ) : (
          <ProductGrid 
            products={products}
            onProductClick={(p) => {
              // Simplified: directly add 1 unit without modal for now
              // In reality, might open ProductDetailModal on top
              onAddToCart(p, 1, '');
              onClose();
            }}
            onAddToCart={(p) => {
              onAddToCart(p, 1, '');
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}
