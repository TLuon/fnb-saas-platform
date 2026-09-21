import React, { useState, useEffect } from 'react';
import { apiClient, RealtimeClient } from '@fnb/utils';
import { FloorMapCanvas, FloorTableCanvas } from '@fnb/ui-shared';
import { authStore } from '@fnb/utils';
import { useStore } from 'zustand';

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

interface ActiveOrder {
  id: string;
  order_code: string;
  type: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: any[];
}

const POS: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('pos_cart');
    return saved ? JSON.parse(saved) : [];
  });
  
  useEffect(() => {
    localStorage.setItem('pos_cart', JSON.stringify(cart));
  }, [cart]);

  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [outOfStockIds, setOutOfStockIds] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);

  // Floor Map states
  const [floors, setFloors] = useState<{id: string, name: string}[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [tables, setTables] = useState<FloorTableCanvas[]>([]);
  const [selectedTable, setSelectedTable] = useState<FloorTableCanvas | null>(null);

  // Takeaway Orders Drawer
  const [isTakeawayDrawerOpen, setIsTakeawayDrawerOpen] = useState(false);
  const [activeTakeawayOrders, setActiveTakeawayOrders] = useState<ActiveOrder[]>([]);

  // Modifiers
  const [modifierModalOpen, setModifierModalOpen] = useState(false);
  const [selectedProductForModifier, setSelectedProductForModifier] = useState<Product | null>(null);
  const [itemNote, setItemNote] = useState('');
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string>>({});

  const profile = useStore(authStore, (state) => state.profile);
  const branchId = localStorage.getItem('branchId') || 'branch-1';



  // Fetch Menu
  useEffect(() => {
    setIsLoadingMenu(true);
    Promise.all([
      apiClient.get(`/api/v1/menu/categories?branch_id=${branchId}`).then((res: any) => res),
      apiClient.get(`/api/v1/menu/products?branch_id=${branchId}`).then((res: any) => res)
    ]).then(([catRes, prodRes]) => {
      setCategories(catRes.data?.data || catRes.data || catRes || []);
      setProducts(prodRes.data?.data || prodRes.data || prodRes || []);
    }).catch(err => {
      console.error(err);
      setError('Không thể tải menu');
    }).finally(() => {
      setIsLoadingMenu(false);
    });

    // Setup realtime listener for inventory
    const token = localStorage.getItem('jwt');
    const client = new RealtimeClient({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
      supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      socketUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
      token: token || undefined,
    });

    client.socket.on('product_out_of_stock', (data: { product_id: string }) => {
      setOutOfStockIds(prev => new Set(prev).add(data.product_id));
    });

    client.socket.on('connect', () => {
      setIsConnected(true);
      client.socket.emit('join_branch', { branch_id: branchId });
    });

    client.socket.on('disconnect', () => {
      setIsConnected(false);
    });

    client.connect();

    return () => {
      client.disconnect();
    };
  }, [branchId]);

  // Fetch Floors
  useEffect(() => {
    apiClient.get(`/api/v1/floors?branch_id=${branchId}`).then((res: any) => {
        const floorList = res.data?.data || res.data || res || [];
        setFloors(floorList);
        if (floorList.length > 0) setSelectedFloor(floorList[0].id);
      })
      .catch(console.error);
  }, [branchId]);

  // Fetch Tables for selected Floor
  useEffect(() => {
    if (!selectedFloor) return;
    apiClient.get(`/api/v1/floors/${selectedFloor}/tables`).then((res: any) => {
        const mappedTables = (res.data?.data || res.data || res || []).map((t: any) => ({
          id: t.id,
          name: t.name || t.table_code,
          status: t.status || 'AVAILABLE',
          coord_x: t.pos_x,
          coord_y: t.pos_y,
          width: t.width,
          height: t.height,
          shape: t.shape || 'rectangle',
          capacity: t.capacity || 4
        }));
        setTables(mappedTables);
      })
      .catch(console.error);
  }, [selectedFloor]);

  useEffect(() => {
    setActiveOrderId(null);
  }, [selectedTable]);

  const filteredProducts = products.filter(p => 
    (activeCategory ? p.category_id === activeCategory : true) &&
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const estimatedSubtotal = cart.reduce((sum, item) => {
    let itemTotal = item.product.price;
    if (item.modifiers?.size?.includes('+')) {
      const match = item.modifiers.size.match(/\+(\d+[\.,]?\d*)/);
      if (match) itemTotal += parseInt(match[1].replace(/[^\d]/g, ''));
    }
    return sum + itemTotal * item.quantity;
  }, 0);

  const handleProductClick = (product: Product) => {
    if (!product.is_active || outOfStockIds.has(product.id)) {
      alert('Sản phẩm đã hết hoặc ngừng bán');
      return;
    }
    setSelectedProductForModifier(product);
    setItemNote('');
    setSelectedModifiers({});
    setModifierModalOpen(true);
  };

  const confirmAddToCart = () => {
    if (!selectedProductForModifier) return;
    setCart(prev => {
      const existing = prev.find(item => 
        item.product.id === selectedProductForModifier.id && 
        item.note === itemNote && 
        JSON.stringify(item.modifiers) === JSON.stringify(selectedModifiers)
      );
      if (existing) {
        return prev.map(item => item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { 
        id: `cart_${Date.now()}_${Math.random()}`, 
        product: selectedProductForModifier, 
        quantity: 1,
        note: itemNote,
        modifiers: selectedModifiers
      }];
    });
    setModifierModalOpen(false);
    setSelectedProductForModifier(null);
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
          note: item.note,
          modifiers: item.modifiers
        }))
      };

      let res;
      if (orderType === 'DINE_IN' && activeOrderId) {
        res = await apiClient.post(`/api/v1/orders/${activeOrderId}/items`, { items: payload.items });
        alert(`Đã thêm món vào đơn hàng hiện tại và gửi lệnh xuống bếp!`);
      } else {
        res = await apiClient.post('/api/v1/orders', payload);
        if (orderType === 'DINE_IN') {
          const newOrderId = (res as any).data?.data?.id || (res as any).id;
          if (newOrderId) setActiveOrderId(newOrderId);
        }
        alert(`Đã tạo đơn hàng #${(res as any).data?.data?.order_code || (res as any).order_code || 'Mới'} và gửi lệnh xuống bếp!`);
      }
      
      setCart([]);
      if (orderType === 'TAKEAWAY') {
        fetchTakeawayOrders();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi tạo đơn');
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkoutAndPay = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      alert('Đã thanh toán thành công!');
      setCart([]);
      setActiveOrderId(null);
      setIsSubmitting(false);
    }, 1000);
  };

  const fetchTakeawayOrders = () => {
    apiClient.get(`/api/v1/orders/active?branch_id=${branchId}&type=TAKEAWAY`)
      .then((res: any) => {
        setActiveTakeawayOrders(res.data?.data || res.data || res || []);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchTakeawayOrders();
  }, [branchId]);

  const completeOrder = async (orderId: string) => {
    try {
      await apiClient.patch(`/api/v1/orders/${orderId}/status`, { status: 'COMPLETED' });
      fetchTakeawayOrders();
      alert('Đã xác nhận giao đồ thành công!');
    } catch (e) {
      alert('Lỗi khi hoàn tất đơn');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#FAF7F3] overflow-hidden">
      
      {/* POS Header */}
      <header className="bg-[#543310] text-white p-3 flex justify-between items-center shadow-md z-10 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold font-serif text-[#FED8B1]">F&B POS</h1>
          <span className="bg-white/10 px-3 py-1 rounded-full text-sm font-medium">Chi nhánh: {branchId}</span>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-2 border-r border-white/20 pr-4">
            <span>👤 {profile?.full_name || profile?.email || 'Staff'}</span>
          </div>
          <div className={`flex items-center gap-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            {isConnected ? 'Đã kết nối' : 'Mất kết nối'}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
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
            <button 
              onClick={() => setIsTakeawayDrawerOpen(true)}
              className="ml-auto flex items-center gap-2 bg-orange-50 text-[#D67D3E] px-4 py-2 rounded-lg font-bold hover:bg-orange-100 transition"
            >
              <span>Đơn Online/Mang đi</span>
              <span className="bg-[#D67D3E] text-white text-xs px-2 py-0.5 rounded-full">{activeTakeawayOrders.length}</span>
            </button>
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
                  onClick={() => handleProductClick(p)}
                  className={`relative border border-[#E8DED5] rounded-xl overflow-hidden bg-white shadow-sm hover:shadow transition cursor-pointer flex flex-col ${!p.is_active ? 'opacity-50' : 'hover:border-[#D67D3E]'}`}
                >
                  <div className="h-20 bg-gray-50 flex items-center justify-center text-gray-300">
                    <span className="text-2xl">🍽️</span>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-[#543310] text-sm mb-1 leading-tight line-clamp-2">{p.name}</h3>
                    <p className="text-[#D67D3E] font-bold text-sm">{p.price.toLocaleString('vi-VN')}đ</p>
                  </div>
                  {(!p.is_active || outOfStockIds.has(p.id)) && (
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
                  <span className="font-bold">{(item.product.price * item.quantity).toLocaleString('vi-VN')}đ</span>
                </div>
                {item.modifiers && Object.keys(item.modifiers).length > 0 && (
                  <div className="text-xs text-gray-500 font-medium">
                    {Object.values(item.modifiers).join(', ')}
                  </div>
                )}
                {item.note && (
                  <div className="text-xs text-[#D67D3E] font-bold italic">
                    Ghi chú: {item.note}
                  </div>
                )}
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

        <div className="border-t border-[#E8DED5] p-4 bg-white shadow-[0_-4px_15px_rgba(0,0,0,0.02)] space-y-2">
          <div className="flex justify-between items-center text-gray-600 font-medium text-sm">
            <span>Tạm tính</span>
            <span>{estimatedSubtotal.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="flex justify-between items-center text-gray-600 font-medium text-sm border-b pb-2">
            <span>Chiết khấu</span>
            <span>0đ</span>
          </div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-col">
              <span className="text-[#543310] font-bold">Tổng thanh toán</span>
              <span className="text-xs text-gray-400 italic">(Dự kiến)</span>
            </div>
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

      {/* Takeaway Orders Drawer */}
      {isTakeawayDrawerOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end transition-opacity">
          <div className="w-[400px] bg-[#FAF7F3] h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div className="p-4 bg-[#543310] text-white flex justify-between items-center">
              <h2 className="font-bold text-lg">Đơn Online/Mang đi chờ giao</h2>
              <button onClick={() => setIsTakeawayDrawerOpen(false)} className="text-white hover:text-gray-300 font-bold text-xl">&times;</button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {activeTakeawayOrders.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">
                  <p>Không có đơn Mang đi nào đang hoạt động</p>
                </div>
              ) : (
                activeTakeawayOrders.map(order => (
                  <div key={order.id} className="bg-white p-4 rounded-xl border border-[#E8DED5] shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                      <div>
                        <span className="font-black text-[#543310] text-lg">#{order.order_code || order.id.slice(0,5)}</span>
                        <p className="text-xs text-gray-500 mt-0.5">{new Date(order.created_at).toLocaleTimeString('vi-VN')} - {new Date(order.created_at).toLocaleDateString('vi-VN')}</p>
                      </div>
                      <span className="bg-orange-100 text-[#D67D3E] px-2 py-1 rounded text-xs font-bold uppercase">{order.status}</span>
                    </div>
                    <div className="text-sm text-gray-700 space-y-1">
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between">
                          <span>{item.quantity}x {item.product_name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-1">
                      <span className="font-bold text-[#D67D3E] text-lg">{order.total_amount?.toLocaleString('vi-VN')}đ</span>
                      <button 
                        onClick={() => completeOrder(order.id)}
                        className="bg-[#237A57] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-green-700 transition"
                      >
                        Xác nhận giao đồ
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modifier Modal */}
      {modifierModalOpen && selectedProductForModifier && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
          <div className="bg-white w-[400px] rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-[#FAF7F3] flex justify-between items-center">
              <h2 className="font-bold text-[#543310] text-lg">{selectedProductForModifier.name}</h2>
              <button onClick={() => setModifierModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <div className="p-4 space-y-6 flex-1 overflow-y-auto">
              {/* Giả lập list size */}
              <div>
                <h3 className="font-bold text-sm text-gray-700 mb-2">Chọn Size</h3>
                <div className="flex gap-2">
                  {['Size M', 'Size L (+10.000đ)'].map(s => (
                    <button 
                      key={s}
                      onClick={() => setSelectedModifiers(prev => ({...prev, size: s}))}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${selectedModifiers.size === s ? 'border-[#D67D3E] bg-orange-50 text-[#D67D3E]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Giả lập list đường/đá */}
              <div>
                <h3 className="font-bold text-sm text-gray-700 mb-2">Lượng đá</h3>
                <div className="flex gap-2">
                  {['Bình thường', 'Ít đá', 'Không đá'].map(s => (
                    <button 
                      key={s}
                      onClick={() => setSelectedModifiers(prev => ({...prev, ice: s}))}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${selectedModifiers.ice === s ? 'border-[#D67D3E] bg-orange-50 text-[#D67D3E]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-sm text-gray-700 mb-2">Ghi chú cho Bếp</h3>
                <input 
                  type="text" 
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  placeholder="VD: Không hành, ít cay..." 
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D67D3E] focus:ring-1 focus:ring-[#D67D3E]"
                />
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex gap-2">
              <button 
                onClick={() => setModifierModalOpen(false)}
                className="flex-1 bg-white border border-gray-200 py-2 rounded-lg font-bold text-gray-600 hover:bg-gray-100 transition"
              >
                Hủy
              </button>
              <button 
                onClick={confirmAddToCart}
                className="flex-1 bg-[#D67D3E] text-white py-2 rounded-lg font-bold hover:bg-orange-700 transition shadow-sm"
              >
                Thêm vào giỏ
              </button>
            </div>
          </div>
        </div>
      )}
      
      </div>
    </div>
  );
};

export default POS;
