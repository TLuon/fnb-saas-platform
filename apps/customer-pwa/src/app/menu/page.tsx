'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useCartStore } from '../../stores/cartStore';
import { PublicHeader } from '../../components/PublicHeader';
import { MenuSearchBar } from '../../components/MenuSearchBar';
import { CategoryTabBar } from '../../components/CategoryTabBar';
import { ProductGrid } from '../../components/ProductGrid';
import { ProductDetailModal } from '../../components/ProductDetailModal';
import { CartSummaryBar } from '../../components/CartSummaryBar';
import { apiClient } from '@fnb/utils';
import { useToast } from '../../components/ToastProvider';
import { LoadingSkeleton, EmptyState } from '@fnb/ui-shared';
import { io } from 'socket.io-client';

export default function MenuPage() {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [outOfStockIds, setOutOfStockIds] = useState<Set<string>>(new Set());
  
  const addItem = useCartStore(state => state.addItem);
  const cartCount = useCartStore(state => state.getTotalItems());
  const cartTotal = useCartStore(state => state.getSubtotal());
  
  const { showInfo, showError } = useToast();

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      setError(false);
      // GET /api/v1/public/catalog
      const payload: any = await apiClient.get('/public/catalog?tenant_subdomain=demo&branch_id=b1');
      
      let data = [];
      if (Array.isArray(payload)) {
        data = payload;
      } else if (payload?.categories) {
        data = payload.categories;
      }
      setCatalog(data);
    } catch (err) {
      console.error('Failed to fetch catalog', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();

    // WebSocket Realtime for out_of_stock
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    const socket = io(wsUrl);

    socket.on('product_out_of_stock', (data: { productId: string }) => {
      setOutOfStockIds(prev => {
        const newSet = new Set(prev);
        newSet.add(data.productId);
        return newSet;
      });
      showError('Một món ăn trong thực đơn vừa hết hàng!');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Compute derived state for categories and products
  const { categories, filteredProducts } = useMemo(() => {
    let cats: {id: string, name: string}[] = [];
    let allProducts: any[] = [];
    
    // Normalize data if it is grouped by categories
    catalog.forEach(cat => {
      if (cat.items) {
        cats.push({ id: cat.id, name: cat.name });
        // Inject category_id into items if missing
        const itemsWithCat = cat.items.map((i: any) => ({ ...i, category_id: cat.id }));
        allProducts = [...allProducts, ...itemsWithCat];
      } else {
        // Flat list
        allProducts.push(cat);
      }
    });

    // Filter by Category
    let result = allProducts;
    if (selectedCategoryId) {
      result = result.filter(p => p.category_id === selectedCategoryId);
    }

    // Filter by Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q));
    }

    // Apply out of stock realtime status
    result = result.map(p => ({
      ...p,
      is_available: outOfStockIds.has(p.id) ? false : (p.is_available !== false)
    }));

    return { categories: cats, filteredProducts: result };
  }, [catalog, selectedCategoryId, searchQuery, outOfStockIds]);

  const handleAddToCart = (product: any, quantity: number, note: string) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.base_price,
      quantity,
      note,
      imageUrl: product.image_url,
      modifiers: '' // mock modifiers
    });
    showInfo(`Đã thêm ${quantity} x ${product.name} vào giỏ hàng`);
  };

  return (
    <main className="min-h-screen bg-[#FAF7F3] flex flex-col pb-24">
      <PublicHeader />
      
      <div className="bg-[#FFFFFF] border-b border-[#E8DED5]">
        <MenuSearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {categories.length > 0 && (
        <CategoryTabBar 
          categories={categories} 
          selectedId={selectedCategoryId} 
          onSelect={setSelectedCategoryId} 
        />
      )}

      {loading ? (
        <div className="p-4 grid grid-cols-2 gap-4 max-w-screen-xl mx-auto w-full">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white p-4 rounded-xl border border-[#E8DED5]">
              <LoadingSkeleton className="w-full h-[150px] rounded-lg mb-4" />
              <LoadingSkeleton className="w-[70%] h-[20px] mb-2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="max-w-screen-xl mx-auto p-4 w-full">
          <EmptyState 
            title="Có lỗi xảy ra" 
            message="Không thể tải thực đơn. Vui lòng thử lại sau."
            action={
              <button onClick={fetchCatalog} className="mt-4 px-6 py-2 bg-[#543310] text-white rounded font-bold hover:bg-[#D67D3E]">
                Thử lại
              </button>
            }
          />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="max-w-screen-xl mx-auto p-4 w-full">
          <EmptyState 
            title="Không tìm thấy món" 
            message="Không có món ăn nào phù hợp với tìm kiếm của bạn."
          />
        </div>
      ) : (
        <ProductGrid 
          products={filteredProducts} 
          onProductClick={setSelectedProduct} 
          onAddToCart={(p) => setSelectedProduct(p)} // Open modal to add with modifiers
        />
      )}

      <ProductDetailModal 
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />
      
      <CartSummaryBar itemCount={cartCount} totalPrice={cartTotal} />
    </main>
  );
}
