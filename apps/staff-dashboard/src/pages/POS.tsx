import React, { useState, useEffect, useMemo } from 'react';
import { createApiClient } from '@fnb/utils';
import { FloorMapCanvas, FloorTableCanvas } from '@fnb/ui-shared';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category_id: string;
  image_url: string;
  is_active: boolean;
}

interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  note?: string;
  modifiers?: Record<string, string>;
}

const POS: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Floor Map states
  const [floors, setFloors] = useState<{id: string, name: string}[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [tables, setTables] = useState<FloorTableCanvas[]>([]);
  const [selectedTable, setSelectedTable] = useState<FloorTableCanvas | null>(null);

  const branchId = localStorage.getItem('branchId') || 'branch-1';

  const apiClient = useMemo(() => createApiClient({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
    getToken: () => localStorage.getItem('jwt'),
  }), []);

  // Fetch Menu
  useEffect(() => {
    setIsLoadingMenu(true);
    Promise.all([
      apiClient.get(`/api/v1/menu/categories?branch_id=${branchId}`),
      apiClient.get(`/api/v1/menu/products?branch_id=${branchId}`)
    ]).then(([catRes, prodRes]) => {
      setCategories(catRes.data.data || []);
      setProducts(prodRes.data.data || []);
    }).catch(err => {
      console.error(err);
      setError('Không thể tải menu');
    }).finally(() => {
      setIsLoadingMenu(false);
    });
  }, [apiClient, branchId]);

  // Fetch Floors
  useEffect(() => {
    apiClient.get(`/api/v1/floors?branch_id=${branchId}`)
      .then(res => {
        const floorList = res.data.data || [];
        setFloors(floorList);
        if (floorList.length > 0) setSelectedFloor(floorList[0].id);
      })
      .catch(console.error);
  }, [apiClient, branchId]);

  // Fetch Tables for selected Floor
  useEffect(() => {
    if (!selectedFloor) return;
    apiClient.get(`/api/v1/floors/${selectedFloor}/tables`)
      .then(res => {
        const mappedTables = (res.data.data || []).map((t: any) => ({
          id: t.id,
          name: t.name || t.table_code,
          status: t.status || 'AVAILABLE',
          coord_x: t.pos_x,
          coord_y: t.pos_y,
          width: t.width,
          height: t.height,
          shape: t.shape || 'rectangle'
        }));
        setTables(mappedTables);
      })
      .catch(console.error);
  }, [selectedFloor, apiClient]);

  const filteredProducts = products.filter(p => 
    (activeCategory ? p.category_id === activeCategory : true) &&
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const estimatedSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const addToCart = (product: Product) => {
    if (!product.is_active) {
      alert('Sản phẩm đã hết hoặc ngừng bán');
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: `cart_${Date.now()}_${Math.random()}`, product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const sendToKitchen = async () => {
    if (cart.length === 0) return alert('Giỏ hàng trống!');
    if (orderType === 'DINE_IN' && !selectedTable) return alert('Vui lòng chọn bàn!');

    setIsSubmitting(true);
    try {
      const payload = {
        table_id: orderType === 'DINE_IN' ? selectedTable?.id : null,
        type: orderType,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          note: item.note
        }))
      };

      await apiClient.post('/api/v1/orders', payload);
      alert('Đã tạo đơn hàng và gửi lệnh xuống bếp thành công!');
      setCart([]);
      setSelectedTable(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi tạo đơn');
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkoutAndPay = () => {
    // For now just alert, later integrate with payment modal
    alert('Tính năng thanh toán đang được phát triển.');
  };

  return (
    <div className="flex h-screen bg-[#FAF7F3] overflow-hidden">
      
      {/* Column 1: Table Selector (Left) */}
      {orderType === 'DINE_IN' && (
        <div className="w-[300px] flex flex-col border-r border-[#E8DED5] bg-white">
          <header className="p-4 border-b border-[#E8DED5] bg-[#FAF7F3]">
            <h2 className="font-bold text-[#543310] mb-2">Sơ đồ bàn</h2>
            <select 
              className="w-full border border-[#E8DED5] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#D67D3E]"
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
            >
              {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </header>
          <div className="flex-1 overflow-hidden p-2 relative">
            <FloorMapCanvas 
              tables={tables}
              editable={false}
              selectedTableId={selectedTable?.id}
              onTableClick={setSelectedTable}
              onTableSelect={setSelectedTable}
            />
          </div>
        </div>
      )}

      {/* Column 2: Menu & Products (Center) */}
      <div className="flex-1 flex flex-col border-r border-[#E8DED5] bg-white">
        <header className="p-4 border-b border-[#E8DED5] flex flex-col gap-3">
          <div className="flex gap-4 items-center">
            <input 
              type="text" 
              placeholder="Tìm món ăn..." 
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#D67D3E] focus:outline-none bg-gray-50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                className={`px-4 py-1.5 rounded-md font-bold text-sm transition ${orderType === 'DINE_IN' ? 'bg-white shadow text-[#543310]' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setOrderType('DINE_IN')}
              >
                Tại bàn
              </button>
              <button 
                className={`px-4 py-1.5 rounded-md font-bold text-sm transition ${orderType === 'TAKEAWAY' ? 'bg-white shadow text-[#543310]' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setOrderType('TAKEAWAY')}
              >
                Mang đi
              </button>
            </div>
          </div>
          
          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

          {/* Categories */}
          <div className="flex overflow-x-auto gap-2 hide-scrollbar pb-1">
            <button 
              className={`whitespace-nowrap px-4 py-1.5 rounded-full font-bold text-sm transition ${activeCategory === '' ? 'bg-[#543310] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              onClick={() => setActiveCategory('')}
            >
              Tất cả
            </button>
            {categories.map(c => (
              <button 
                key={c.id}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full font-bold text-sm transition ${activeCategory === c.id ? 'bg-[#D67D3E] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setActiveCategory(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </header>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#FAF7F3]">
          {isLoadingMenu ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-xl"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => addToCart(p)}
                  className={`relative border border-[#E8DED5] rounded-xl overflow-hidden bg-white shadow-sm hover:shadow transition cursor-pointer flex flex-col ${!p.is_active ? 'opacity-50' : 'hover:border-[#D67D3E]'}`}
                >
                  <div className="h-20 bg-gray-50 flex items-center justify-center text-gray-300">
                    <span className="text-2xl">🍽️</span>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-[#543310] text-sm mb-1 leading-tight line-clamp-2">{p.name}</h3>
                    <p className="text-[#D67D3E] font-bold text-sm">{p.price.toLocaleString('vi-VN')}đ</p>
                  </div>
                  {!p.is_active && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center font-bold text-red-600">
                      Hết món
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Column 3: Cart (Right) */}
      <div className="w-[360px] flex flex-col bg-white">
        <header className="p-4 bg-[#543310] text-white flex justify-between items-center shadow-md z-10">
          <h2 className="text-lg font-bold">Giỏ hàng</h2>
          {orderType === 'DINE_IN' ? (
            <span className="bg-white text-[#543310] px-3 py-1 rounded text-sm font-bold">
              {selectedTable ? `Bàn: ${selectedTable.name}` : 'Chưa chọn bàn'}
            </span>
          ) : (
            <span className="bg-[#D67D3E] text-white px-3 py-1 rounded text-sm font-bold">Mang đi</span>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF7F3]">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 flex-col">
              <span className="text-4xl mb-2">🛒</span>
              <p className="text-sm">Chưa có món nào</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm border border-[#E8DED5] flex flex-col gap-2">
                <div className="flex justify-between font-bold text-[#543310] text-sm">
                  <span>{item.product.name}</span>
                  <span>{(item.product.price * item.quantity).toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <button onClick={() => removeItem(item.id)} className="text-red-500 text-xs font-medium hover:underline">Xóa</button>
                  <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-1">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-[#543310] hover:bg-gray-100 font-bold">-</button>
                    <span className="font-bold w-4 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-[#543310] hover:bg-gray-100 font-bold">+</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-[#E8DED5] p-4 bg-white shadow-[0_-4px_15px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-600 font-medium text-sm">Tạm tính</span>
            <span className="font-black text-[#D67D3E] text-2xl">{estimatedSubtotal.toLocaleString('vi-VN')}đ</span>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={sendToKitchen}
              disabled={cart.length === 0 || isSubmitting || (orderType === 'DINE_IN' && !selectedTable)}
              className="flex-1 bg-white border-2 border-[#543310] text-[#543310] py-3 rounded-xl font-bold text-sm hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? 'Đang gửi...' : 'Gửi Bếp'}
            </button>
            <button 
              onClick={checkoutAndPay}
              disabled={cart.length === 0 || isSubmitting}
              className="flex-1 bg-[#237A57] text-white py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Thanh Toán
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;
