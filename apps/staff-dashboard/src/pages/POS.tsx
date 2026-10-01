import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient, RealtimeClient, mapApiTableToCanvas, authStore, generateVietQRUrl, VIETCOMBANK_CONFIG } from '@fnb/utils';
import { FloorTableCanvas } from '@fnb/ui-shared';
import { useStore } from 'zustand';
import { getSocketBaseUrl } from '../lib/kds';


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
  order_code?: string;
  order_number?: string;
  type?: string;
  status: string;
  total_amount?: number;
  final_amount?: number;
  subtotal?: number;
  created_at: string;
  items?: any[];
  order_items?: any[];
}

import { useModal } from '../components/ModalProvider';

const POS: React.FC = () => {
  const [toastConfig, setToastConfig] = useState<{id: number, text: string, blinkCount: number, isVisible: boolean} | null>(null);

  useEffect(() => {
    if (!toastConfig) return;

    if (toastConfig.blinkCount >= 3) {
      setToastConfig(null);
      return;
    }

    if (toastConfig.isVisible) {
      const timer = setTimeout(() => {
        setToastConfig(prev => prev ? { ...prev, isVisible: false } : null);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setToastConfig(prev => prev ? { ...prev, isVisible: true, blinkCount: prev.blinkCount + 1 } : null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastConfig]);

  const navigate = useNavigate();
  const { showAlert, showConfirm } = useModal();
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
  // posMainTab removed
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [outOfStockIds, setOutOfStockIds] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);

  // Floor Map states
  const [, setFloors] = useState<{id: string, name: string}[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [, setTables] = useState<FloorTableCanvas[]>([]);
  const [selectedTable, setSelectedTable] = useState<FloorTableCanvas | null>(null);

  const [branchName, setBranchName] = useState('');

  // Takeaway Orders Drawer
  const [isTakeawayDrawerOpen, setIsTakeawayDrawerOpen] = useState(false);
  const [activeTakeawayOrders, setActiveTakeawayOrders] = useState<ActiveOrder[]>([]);

  // Payment Modal States
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethodChoice, setPaymentMethodChoice] = useState<'VIETQR' | 'CASH'>('VIETQR');
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('');
  const [paymentModalData, setPaymentModalData] = useState<{
    orderId: string;
    orderCode: string;
    amount: number;
    isPaid: boolean;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modifiers
  const [modifierModalOpen, setModifierModalOpen] = useState(false);
  const [selectedProductForModifier, setSelectedProductForModifier] = useState<Product | null>(null);
  const [itemNote, setItemNote] = useState('');
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string>>({});


  const profile = useStore(authStore, (state) => state.profile);
  const branchId = profile?.branch_id || localStorage.getItem('branchId') || '22222222-2222-2222-2222-222222222222';

  // Fetch Menu
  useEffect(() => {
    setIsLoadingMenu(true);
    Promise.all([
      apiClient.get('/categories').then((res: any) => res),
      apiClient.get('/products').then((res: any) => res)
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
    const token = authStore.getState().accessToken || localStorage.getItem('access_token') || localStorage.getItem('jwt');
    const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    const socketUrl = import.meta.env.VITE_SOCKET_URL || getSocketBaseUrl(apiUrl);

    const client = new RealtimeClient({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
      supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      socketUrl,
      token: token || undefined,
    });

    client.socket.on('product_out_of_stock', (data: { product_id: string }) => {
      setOutOfStockIds(prev => new Set(prev).add(data.product_id));
    });



    client.socket.on('kds_item_status_changed', (data: any) => {
      const orderCode = data.order_code || `ORD-${(data.order_id || '').slice(0, 6).toUpperCase()}`;
      const productName = data.product_name || 'Một món';

      if (data.kitchen_status === 'READY') {
        setToastConfig({ id: Date.now(), text: `🔔 Món [${productName}] của đơn [${orderCode}] đã chuẩn bị xong, hãy bấm "Giao món" để phục vụ khách!`, blinkCount: 0, isVisible: true });
      } else if (data.kitchen_status === 'SERVED') {
        setToastConfig({ id: Date.now(), text: `🔔 Món [${productName}] của đơn [${orderCode}] đã sẵn sàng & báo POS, vui lòng mang ra cho khách!`, blinkCount: 0, isVisible: true });
      }

      setActiveTableOrder((prev: any) => {
        if (!prev) return prev;
        const newItems = prev.order_items?.map((it: any) =>
          (it.id === data.order_item_id || it.order_item_id === data.order_item_id)
            ? { ...it, kitchen_status: data.kitchen_status }
            : it
        );
        return { ...prev, order_items: newItems };
      });

      setActiveTakeawayOrders((prev: any[]) => prev.map((order: any) => {
        const newItems = (order.order_items || order.items || []).map((it: any) =>
          (it.id === data.order_item_id || it.order_item_id === data.order_item_id)
            ? { ...it, kitchen_status: data.kitchen_status }
            : it
        );
        return { ...order, order_items: newItems, items: newItems };
      }));
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

  // Use search params to auto-select floor and table
  const [searchParams] = useSearchParams();
  const initialFloorId = searchParams.get('floor_id');
  const initialTableId = searchParams.get('table_id');
  const [hasAutoSelectedTable, setHasAutoSelectedTable] = useState(false);

  // Fetch Floors and Branch Name
  useEffect(() => {
    const query = branchId && branchId.includes('-') ? `?branch_id=${branchId}` : '';
    apiClient.get(`/floors${query}`).then((res: any) => {
        const floorList = res.data?.data || res.data || res || [];
        setFloors(floorList);
        if (initialFloorId && floorList.some((f: any) => f.id === initialFloorId)) {
          setSelectedFloor(initialFloorId);
        } else if (floorList.length > 0) {
          setSelectedFloor(floorList[0].id);
        }
      })
      .catch(console.error);

    apiClient.get('/branches').then((res: any) => {
      const branches = res.data?.data || res.data || res || [];
      const currentBranch = branches.find((b: any) => b.id === branchId);
      if (currentBranch) setBranchName(currentBranch.name);
    }).catch(console.error);
  }, [branchId, initialFloorId]);

  // State for active order of current table
  const [activeTableOrder, setActiveTableOrder] = useState<any | null>(null);
  const [activeReservation, setActiveReservation] = useState<any | null>(null);

  const fetchTables = () => {
    if (!selectedFloor) return;
    apiClient.get(`/floors/${selectedFloor}/tables`).then((res: any) => {
      const mappedTables: FloorTableCanvas[] = (res.data?.data || res.data || res || []).map(mapApiTableToCanvas);
      setTables(mappedTables);

      // Auto-select table if passed via URL
      if (initialTableId && !hasAutoSelectedTable) {
        const targetTable = mappedTables.find((t: any) => t.id === initialTableId);
        if (targetTable) {
          setSelectedTable(targetTable);
          setHasAutoSelectedTable(true);
        }
      }
    }).catch(console.error);
  };

  // Fetch Tables for selected Floor
  useEffect(() => {
    fetchTables();
  }, [selectedFloor, initialTableId, hasAutoSelectedTable]);

  // When selectedTable changes, inspect if it has an active order
  useEffect(() => {
    if (selectedTable && selectedTable.current_order_id) {
      setActiveOrderId(selectedTable.current_order_id);
      apiClient.get(`/orders/${selectedTable.current_order_id}`)
        .then((res: any) => {
          const ord = res?.order || res.data?.data?.order || res.data?.order || res.data || res;
          setActiveTableOrder(ord);
        })
        .catch(err => {
          console.error('Failed to load active order for table:', err);
          setActiveTableOrder(null);
        });
    } else {
      setActiveOrderId(null);
      setActiveTableOrder(null);
    }

    // Fetch reservation if table is reserved
    if (selectedTable && (selectedTable.status === 'RESERVED' || selectedTable.status === 'PENDING_LOCK')) {
      apiClient.get(`/reservations?table_id=${selectedTable.id}&limit=5`)
        .then((res: any) => {
          const reservations = Array.isArray(res) ? res : (res.data?.data || res.data || res || []);
          const activeRes = reservations.find((r: any) => r.status === 'PAID' || r.status === 'PENDING');
          setActiveReservation(activeRes || null);
        })
        .catch(err => {
          console.error('Failed to load reservation for table:', err);
          setActiveReservation(null);
        });
    } else {
      setActiveReservation(null);
    }
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

  const existingOrderTotal = Number(activeTableOrder?.final_amount || activeTableOrder?.subtotal || 0);
  const totalAmountToPay = estimatedSubtotal + existingOrderTotal;

  const handleProductClick = (product: Product) => {
    if (!product.is_active || outOfStockIds.has(product.id)) {
      showAlert('Sản phẩm đã hết hoặc ngừng bán', 'warning', 'Thông báo');
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
    if (cart.length === 0 && !activeOrderId) return showAlert('Giỏ hàng trống!', 'warning', 'Chưa có món');
    if (orderType === 'DINE_IN' && !selectedTable) return showAlert('Vui lòng chọn bàn trên sơ đồ!', 'warning', 'Chưa chọn bàn');

    setIsSubmitting(true);
    try {
      let orderId = activeOrderId;
      let orderCode = activeTableOrder?.order_code || '';

      if (!orderId) {
        const orderRes: any = await apiClient.post('/orders', {
          table_id: orderType === 'DINE_IN' ? selectedTable?.id : undefined,
          order_type: orderType,
        });
        const orderData = orderRes.data?.data || orderRes.data || orderRes;
        orderId = orderData.id || orderData.order_id;
        orderCode = orderData.order_code || 'Mới';
        if (orderType === 'DINE_IN') setActiveOrderId(orderId);
      }

      // Add each item to the order
      for (const item of cart) {
        await apiClient.post(`/orders/${orderId}/items`, {
          product_id: item.product.id,
          quantity: item.quantity,
          modifiers: item.modifiers,
          notes: item.note,
        });
      }

      // Submit kitchen
      await apiClient.post(`/orders/${orderId}/submit-kitchen`);

      showAlert(`Đã gửi đơn hàng #${orderCode || orderId?.slice(0, 8)} xuống bếp thành công!`, 'success', 'Gửi Bếp Thành Công');
      setCart([]);
      if (orderType === 'TAKEAWAY') {
        fetchTakeawayOrders();
      } else {
        fetchTables();
        if (orderId) {
          const updatedOrdRes: any = await apiClient.get(`/orders/${orderId}`).catch(() => null);
          if (updatedOrdRes) {
            setActiveTableOrder(updatedOrdRes.data?.data?.order || updatedOrdRes.data?.order || updatedOrdRes.data);
          }
        }
      }
    } catch (err: any) {
      showAlert(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi tạo đơn', 'error', 'Lỗi Tạo Đơn');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPaymentModalForOrder = async (orderId: string, fallbackAmount?: number) => {
    try {
      const res: any = await apiClient.get(`/orders/${orderId}`);
      const ord = res.data?.data?.order || res.data?.order || res.data || res;
      const isPaid = ord.status === 'COMPLETED';
      const orderCode = ord.order_code || ord.order_number || ord.code || (orderId ? 'ORD-' + orderId.slice(0, 6).toUpperCase() : '');

      const items = ord.order_items || ord.items || [];
      let calculatedItemsTotal = 0;
      if (Array.isArray(items) && items.length > 0) {
        calculatedItemsTotal = items.reduce((sum: number, it: any) => sum + (Number(it.quantity || 1) * Number(it.unit_price || it.price || 0)), 0);
      }

      const rawAmount = Number(ord.final_amount || ord.total_amount || ord.subtotal || 0);
      const amount = (rawAmount > 0 ? rawAmount : (calculatedItemsTotal > 0 ? calculatedItemsTotal : (fallbackAmount || 0)));

      setPaymentModalData({
        orderId,
        orderCode,
        amount,
        isPaid,
      });
      setPaymentMethodChoice('VIETQR');
      setCashReceivedInput('');
      setPaymentModalOpen(true);
    } catch (err: any) {
      showAlert(err.response?.data?.message || err.message || 'Không thể lấy thông tin đơn hàng', 'error', 'Lỗi Thanh Toán');
    }
  };

  useEffect(() => {
    if (searchParams.get('action') === 'pay' && activeOrderId && !paymentModalOpen) {
      openPaymentModalForOrder(activeOrderId);
      navigate(`/pos?floor_id=${selectedFloor}&table_id=${initialTableId}`, { replace: true });
    }
  }, [searchParams, activeOrderId, paymentModalOpen, selectedFloor, initialTableId, navigate]);


  const checkoutAndPay = async () => {
    setIsSubmitting(true);
    try {
      let orderId = activeOrderId;

      if (!orderId && cart.length > 0) {
        // Create order, add items, then pay
        const orderRes: any = await apiClient.post('/orders', {
          table_id: orderType === 'DINE_IN' ? selectedTable?.id : undefined,
          order_type: orderType,
        });
        const orderData = orderRes.data?.data || orderRes.data || orderRes;
        orderId = orderData.id || orderData.order_id;
        if (orderType === 'DINE_IN') setActiveOrderId(orderId);

        for (const item of cart) {
          await apiClient.post(`/orders/${orderId}/items`, {
            product_id: item.product.id,
            quantity: item.quantity,
            modifiers: item.modifiers,
            notes: item.note,
          });
        }
        if (orderType === 'TAKEAWAY') {
          await apiClient.post(`/orders/${orderId}/submit-kitchen`);
        }
        setCart([]);
      } else if (orderId && cart.length > 0) {
        // If there are additional cart items on an existing order, append them first
        for (const item of cart) {
          await apiClient.post(`/orders/${orderId}/items`, {
            product_id: item.product.id,
            quantity: item.quantity,
            modifiers: item.modifiers,
            notes: item.note,
          });
        }
        if (orderType === 'TAKEAWAY') {
          await apiClient.post(`/orders/${orderId}/submit-kitchen`);
        }
        setCart([]);
      }

      if (!orderId) {
        showAlert('Không có đơn hàng nào cần thanh toán!', 'info', 'Thông báo');
        return;
      }

      await openPaymentModalForOrder(orderId, totalAmountToPay);
    } catch (err: any) {
      showAlert(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi thanh toán', 'error', 'Lỗi Thanh Toán');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPosPayment = async (method: 'VIETQR' | 'CASH') => {
    if (!paymentModalData) return;
    setIsSubmitting(true);
    try {
      await apiClient.post(`/orders/${paymentModalData.orderId}/pay`, {
        payment_method: method,
      });

      showAlert(
        method === 'CASH' ? 'Đã thanh toán tiền mặt thành công!' : 'Đã xác nhận thanh toán Chuyển khoản (VietQR)!',
        'success',
        'Thanh Toán Hoàn Tất'
      );
      setPaymentModalOpen(false);
      setActiveOrderId(null);
      setCart([]);

      if (orderType === 'TAKEAWAY') {
        fetchTakeawayOrders();
      } else {
        fetchTables();
        setSelectedTable(null);
        setActiveTableOrder(null);
      }
    } catch (err: any) {
      showAlert(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi thanh toán', 'error', 'Lỗi Thanh Toán');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchTakeawayOrders = () => {
    const query = branchId && branchId.includes('-')
      ? `?branch_id=${branchId}&order_type=TAKEAWAY`
      : '?order_type=TAKEAWAY';
    apiClient.get(`/orders${query}`)
      .then((res: any) => {
        const list = res.data?.data || res.data || (Array.isArray(res) ? res : []);
        // Lọc bỏ các đơn COMPLETED và CANCELLED để chỉ giữ lại đơn chưa hoàn thành
        const activeOnly = list.filter((o: any) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
        setActiveTakeawayOrders(activeOnly);
      })
      .catch(console.error);
  };

  const [pendingReservationCount, setPendingReservationCount] = useState(0);
  const fetchPendingReservations = () => {
    apiClient.get('/reservations?status=PENDING')
      .then((res: any) => {
        const list = res.data?.data || res.data || (Array.isArray(res) ? res : []);
        setPendingReservationCount(list.length);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchTakeawayOrders();
    fetchPendingReservations();
    const interval = setInterval(() => {
      fetchTakeawayOrders();
      fetchPendingReservations();
    }, 10000);
    return () => clearInterval(interval);
  }, [branchId]);

  const handleVerifyAndSubmitKitchen = async (orderId: string, orderCode: string, paymentMethod: 'VIETQR' | 'CASH' = 'VIETQR') => {
    try {
      setIsSubmitting(true);
      // 1. Chuyển bếp trước -> order.status đổi thành IN_PROGRESS và bắn event kds_new_ticket xuống Bếp
      await apiClient.post(`/orders/${orderId}/submit-kitchen`);

      // 2. Cập nhật thông tin thanh toán và giữ status IN_PROGRESS
      try {
        await apiClient.post(`/orders/${orderId}/pay`, {
          payment_method: paymentMethod,
          status: 'IN_PROGRESS'
        });
      } catch (payErr) {
        console.warn('Cập nhật thanh toán trước đó:', payErr);
      }

      showAlert(`Đã xác nhận thanh toán (${paymentMethod}) & chuyển đơn #${orderCode} xuống Bếp!`, 'success', 'Duyệt Đơn Thành Công');
      fetchTakeawayOrders();
    } catch (err: any) {
      showAlert(err.response?.data?.message || err.message || 'Lỗi khi duyệt đơn hàng', 'error', 'Lỗi Duyệt Đơn');
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeTakeawayDelivery = async (orderId: string, orderCode: string) => {
    try {
      setIsSubmitting(true);
      await apiClient.post(`/orders/${orderId}/pay`, {
        payment_method: 'VIETQR',
        status: 'COMPLETED'
      });
      showAlert(`Đã giao đơn #${orderCode} thành công!`, 'success', 'Hoàn Tất Giao Đồ');
      fetchTakeawayOrders(); // Tự động xóa khỏi danh sách chờ giao
    } catch (err: any) {
      showAlert(err.response?.data?.message || err.message || 'Lỗi khi giao đồ', 'error', 'Lỗi Giao Đồ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelTakeawayOrder = (orderId: string, orderCode: string) => {
    showConfirm({
      title: 'Xác nhận hủy đơn hàng',
      message: `Bạn có chắc chắn muốn hủy đơn hàng #${orderCode}? Thao tác này sẽ hủy đơn và cập nhật ngay lập tức.`,
      confirmLabel: 'Hủy đơn hàng',
      cancelLabel: 'Quay lại',
      onConfirm: async () => {
        try {
          setIsSubmitting(true);
          await apiClient.post(`/orders/${orderId}/cancel`);
          showAlert(`Đã hủy đơn hàng #${orderCode} thành công!`, 'info', 'Đã Hủy Đơn');
          fetchTakeawayOrders();
        } catch (err: any) {
          showAlert(err.response?.data?.message || err.message || 'Không thể hủy đơn hàng', 'error', 'Lỗi Hủy Đơn');
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };




  return (
    <div className="flex flex-col h-full bg-[#FAF7F3] overflow-hidden rounded-xl border border-gray-200">

      {/* POS Header */}
      <header className="bg-[#543310] text-white p-3 flex justify-between items-center shadow-md z-10 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold font-serif text-[#FED8B1]">F&B POS</h1>
          <span className="bg-white/10 px-3 py-1 rounded-full text-sm font-medium">Chi nhánh: {branchName || 'Đang tải...'}</span>
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
        {/* Main Area: Dedicated View Modes (MENU vs TABLES) */}
        <div className="flex-1 flex flex-col border-r border-[#E8DED5] bg-[#FAF7F3] min-w-0 overflow-hidden">

          {/* Main Top Mode Switcher Bar */}
          <header className="p-3 border-b border-[#E8DED5] bg-white flex justify-between items-center flex-wrap gap-3 shadow-sm z-20 shrink-0">            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                className="px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2 bg-[#543310] text-white shadow"
              >
                <span>🍔</span>
                <span>Thực đơn gọi món</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition ${orderType === 'DINE_IN' ? 'bg-white shadow text-[#543310]' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => {
                    setOrderType('DINE_IN');
                  }}
                >
                  🍽️ Tại bàn
                </button>
                <button
                  className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition ${orderType === 'TAKEAWAY' ? 'bg-white shadow text-[#543310]' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => {
                    setOrderType('TAKEAWAY');
                  }}
                >
                  🥡 Mang đi
                </button>
              </div>

              <button
                onClick={() => {
                  fetchTakeawayOrders();
                  setIsTakeawayDrawerOpen(true);
                }}
                className="flex items-center gap-1.5 bg-orange-50 text-[#D67D3E] px-3.5 py-1.5 rounded-xl font-bold border border-orange-200 hover:bg-orange-100 transition shadow-sm text-xs"
              >
                <span>Đơn Online/Mang đi</span>
                <span className="bg-[#D67D3E] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{activeTakeawayOrders.length}</span>
              </button>

              <button
                onClick={() => {
                  navigate('/floor-map');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold border transition shadow-sm text-xs ${pendingReservationCount > 0 ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 animate-pulse' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
              >
                <span>Bàn chờ cọc</span>
                <span className={`${pendingReservationCount > 0 ? 'bg-red-600' : 'bg-gray-400'} text-white text-[10px] px-2 py-0.5 rounded-full font-bold`}>{pendingReservationCount}</span>
              </button>
            </div>
          </header>

          {/* VIEW MODE 1: 🍔 GỌI MÓN (MENU) */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Filter Sub-header */}
              <div className="p-3 border-b border-[#E8DED5] bg-white flex flex-col gap-2 shrink-0 shadow-sm">
                <div className="flex gap-3 items-center">
                  <input
                    type="text"
                    placeholder="🔍 Tìm món ăn theo tên..."
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#D67D3E] focus:outline-none bg-gray-50 font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {orderType === 'DINE_IN' && (
                    <button
                      onClick={() => navigate('/floor-map')}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${selectedTable ? 'bg-amber-50 text-[#543310] border-amber-300' : 'bg-red-50 text-red-600 border-red-200 animate-pulse'}`}
                    >
                      <span>📍</span>
                      <span>{selectedTable ? `Bàn: ${selectedTable.name}` : 'Chưa chọn bàn'}</span>
                      <span className="text-[10px] underline ml-1">Đổi bàn ➔</span>
                    </button>
                  )}
                </div>

                {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

                {/* Categories Pill Bar */}
                <div className="flex overflow-x-auto gap-2 hide-scrollbar pb-0.5">
                  <button
                    className={`whitespace-nowrap px-3.5 py-1 rounded-full font-bold text-xs transition ${activeCategory === '' ? 'bg-[#543310] text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    onClick={() => setActiveCategory('')}
                  >
                    Tất cả ({products.length})
                  </button>
                  {categories.map(c => (
                    <button
                      key={c.id}
                      className={`whitespace-nowrap px-3.5 py-1 rounded-full font-bold text-xs transition ${activeCategory === c.id ? 'bg-[#D67D3E] text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      onClick={() => setActiveCategory(c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Products Dedicated Scroll Grid */}
              <div className="flex-1 overflow-y-auto p-4 bg-[#FAF7F3]">
                {isLoadingMenu ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {[1,2,3,4,5,6,7,8,9,10].map(i => (
                      <div key={i} className="h-36 bg-gray-200 animate-pulse rounded-2xl"></div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
                    {filteredProducts.map(p => (
                      <div
                        key={p.id}
                        onClick={() => handleProductClick(p)}
                        className={`relative border border-[#E8DED5] rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition cursor-pointer flex flex-col group ${!p.is_active ? 'opacity-50' : 'hover:border-[#D67D3E]'}`}
                      >
                        <div className="h-24 bg-gray-50 flex items-center justify-center text-gray-300 overflow-hidden relative">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                          ) : (
                            <span className="text-3xl">🍽️</span>
                          )}
                        </div>
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <h3 className="font-bold text-[#543310] text-sm mb-1 leading-tight line-clamp-2">{p.name}</h3>
                          <p className="text-[#D67D3E] font-extrabold text-sm">{p.price.toLocaleString('vi-VN')}đ</p>
                        </div>
                        {(!p.is_active || outOfStockIds.has(p.id)) && (
                          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center font-bold text-red-600 text-sm">
                            Hết món
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

      {/* Column 3: Cart (Right) */}
      <div className="w-[280px] lg:w-[340px] flex flex-col bg-white shrink-0 overflow-hidden">
        <header className="p-4 bg-[#543310] text-white flex justify-between items-center shadow-md z-10 shrink-0">
          <h2 className="text-lg font-bold">Giỏ hàng</h2>
          {orderType === 'DINE_IN' ? (
            <button
              onClick={() => navigate('/floor-map')}
              className="bg-white text-[#543310] px-3 py-1 rounded text-sm font-bold hover:bg-gray-100 transition cursor-pointer"
            >
              {selectedTable ? `Bàn: ${selectedTable.name}` : 'Chưa chọn bàn'}
            </button>
          ) : (
            <span className="bg-[#D67D3E] text-white px-3 py-1 rounded text-sm font-bold">Mang đi</span>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF7F3]">
          {activeReservation && (
            <div className="mb-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm shadow-sm">
              <div className="font-bold text-[#1E3A8A] border-b border-blue-200 pb-2 mb-2 flex items-center justify-between">
                <span>Thông tin Đặt bàn</span>
                <span>#{activeReservation.reservation_code}</span>
              </div>
              <div className="space-y-1 text-gray-700">
                <div className="flex justify-between">
                  <span>Khách:</span>
                  <span className="font-bold">{activeReservation.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>SĐT:</span>
                  <span className="font-medium">{activeReservation.customer_phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-[#B42318] font-bold border-t border-blue-100 pt-1 mt-1">
                  <span>Đã cọc:</span>
                  <span>{Number(activeReservation.deposit_amount || 0).toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
            </div>
          )}

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
          {activeTableOrder && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-2 text-xs">
              <div className="flex justify-between items-center font-bold text-[#543310]">
                <span>Đơn hiện tại (#{activeTableOrder.order_code || activeTableOrder.id?.slice(0, 6)})</span>
                <span>{existingOrderTotal.toLocaleString('vi-VN')}đ</span>
              </div>
              {activeTableOrder.order_items && activeTableOrder.order_items.length > 0 && (
                <div className="mt-1 text-gray-500 max-h-32 overflow-y-auto">
                  {activeTableOrder.order_items.map((it: any, i: number) => {
                    const kStatus = it.kitchen_status || 'QUEUED';
                    const statusColor = kStatus === 'QUEUED' ? 'text-orange-500' : kStatus === 'PREPARING' ? 'text-blue-500' : kStatus === 'READY' ? 'text-green-600' : 'text-gray-500';
                    const statusLabel = kStatus === 'QUEUED' ? 'Chờ chế biến' : kStatus === 'PREPARING' ? 'Đang làm' : kStatus === 'READY' ? 'Sẵn sàng' : 'Đã giao';

                    return (
                      <div key={i} className="flex flex-col mb-2 border-b border-amber-100 pb-2">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-semibold text-gray-800">{it.quantity}x {it.product_name}</span>
                          <span className="text-[#D67D3E] font-bold">{(it.quantity * it.unit_price).toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-current ${statusColor}`}>
                            {statusLabel}
                          </span>
                          {kStatus === 'READY' && (
                            <button
                              onClick={async () => {
                                try {
                                  await apiClient.patch(`/orders/${activeTableOrder.id}/items/${it.id}/kitchen-status`, { kitchen_status: 'SERVED' });
                                  setActiveTableOrder((prev: any) => ({ ...prev, order_items: prev.order_items.map((x: any) => x.id === it.id ? { ...x, kitchen_status: 'SERVED' } : x) }));
                                } catch (e) {
                                  showAlert('Không thể đánh dấu', 'error');
                                }
                              }}
                              className="text-[10px] font-bold bg-[#237A57] text-white px-2 py-1 rounded hover:bg-green-700 transition"
                            >
                              Giao món ✓
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <div className="flex justify-between items-center text-gray-600 font-medium text-sm">
            <span>{cart.length > 0 ? 'Món mới chọn' : 'Tạm tính'}</span>
            <span>{estimatedSubtotal.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="flex justify-between items-center text-gray-600 font-medium text-sm border-b pb-2">
            <span>Chiết khấu</span>
            <span>0đ</span>
          </div>
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col flex-1 mr-1">
              <span className="text-[#543310] font-bold text-sm leading-tight">Tổng thanh toán</span>
              <span className="text-[10px] text-gray-400 italic leading-tight mt-0.5">
                {activeTableOrder ? '(Đơn tại bàn + Món mới)' : '(Dự kiến)'}
              </span>
            </div>
            <span className="font-black text-[#D67D3E] text-lg lg:text-xl text-right shrink-0">{totalAmountToPay.toLocaleString('vi-VN')}đ</span>
          </div>

          <div className="flex gap-2 mt-2">
            {orderType === 'DINE_IN' && (
              <button
                onClick={sendToKitchen}
                disabled={(!activeOrderId && cart.length === 0) || isSubmitting || (orderType === 'DINE_IN' && !selectedTable)}
                className="flex-1 bg-white border-2 border-[#543310] text-[#543310] py-3 rounded-xl font-bold text-sm hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                {isSubmitting ? 'Đang gửi...' : 'Lưu Đơn & Gửi Bếp'}
              </button>
            )}
            <button
              onClick={checkoutAndPay}
              disabled={(cart.length === 0 && !activeOrderId) || isSubmitting}
              className="flex-1 bg-[#237A57] text-white py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Thanh Toán'}
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
                activeTakeawayOrders.map(order => {
                  const orderItems = order.order_items || order.items || [];
                  const calculatedItemsTotal = orderItems.reduce((sum: number, it: any) => sum + (Number(it.quantity || 1) * Number(it.unit_price || it.price || 0)), 0);
                  const displayAmount = Number(order.final_amount || order.total_amount || order.subtotal || calculatedItemsTotal || 0);
                  const orderCode = order.order_code || order.order_number || (order.id ? 'ORD-' + order.id.slice(0, 6).toUpperCase() : '');
                  const transferMemo = `DH ${orderCode}`;

                  const isPendingVerification = order.status === 'PENDING';

                  return (
                    <div key={order.id} className="bg-white p-4 rounded-xl border border-[#E8DED5] shadow-sm flex flex-col gap-3">
                      {/* Order Header */}
                      <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                        <div>
                          <span className="font-black text-[#543310] text-lg">#{orderCode}</span>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(order.created_at).toLocaleTimeString('vi-VN')} - {new Date(order.created_at).toLocaleDateString('vi-VN')}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-[#D67D3E] font-mono bg-orange-50 px-2 py-0.5 rounded border border-[#FED8B1] w-fit">
                            <span>Nội dung CK: <strong>{transferMemo}</strong></span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                          isPendingVerification
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}>
                          {isPendingVerification ? 'CHỜ DUYỆT TIỀN' : 'ĐÃ DUYỆT & ĐANG BÁO BẾP'}
                        </span>
                      </div>

                      {/* Items List */}
                      <div className="text-sm text-gray-700 space-y-1 bg-[#FAF7F3] p-2.5 rounded-lg border border-gray-100">
                        {orderItems.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">Không có chi tiết món</p>
                        ) : (
                          orderItems.map((item: any, idx: number) => {
                            const kStatus = item.kitchen_status || 'QUEUED';
                            const statusColor = kStatus === 'QUEUED' ? 'text-orange-500' : kStatus === 'PREPARING' ? 'text-blue-500' : kStatus === 'READY' ? 'text-green-600' : 'text-gray-500';
                            const statusLabel = kStatus === 'QUEUED' ? 'Chờ chế biến' : kStatus === 'PREPARING' ? 'Đang làm' : kStatus === 'READY' ? 'Sẵn sàng' : 'Đã giao';

                            return (
                              <div key={idx} className="flex flex-col border-b border-gray-100 pb-2 mb-2">
                                <div className="flex justify-between items-center text-xs font-medium text-gray-800 mb-0.5">
                                  <span>{item.quantity}x {item.product_name || item.name || 'Món ăn'}</span>
                                  <span className="text-[#D67D3E] font-mono font-bold">
                                    {(Number(item.unit_price || item.price || 0) * Number(item.quantity || 1)).toLocaleString('vi-VN')}đ
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-current ${statusColor}`}>
                                    {statusLabel}
                                  </span>
                                  {kStatus === 'READY' && (
                                    <button
                                      onClick={async () => {
                                        try {
                                          await apiClient.patch(`/orders/${order.id}/items/${item.id}/kitchen-status`, { kitchen_status: 'SERVED' });
                                          setActiveTakeawayOrders((prev: any[]) => prev.map((o: any) => {
                                            if (o.id !== order.id) return o;
                                            const newIt = (o.order_items || o.items).map((x: any) => x.id === item.id ? { ...x, kitchen_status: 'SERVED' } : x);
                                            return { ...o, order_items: newIt, items: newIt };
                                          }));
                                        } catch (e) {
                                          showAlert('Không thể đánh dấu', 'error');
                                        }
                                      }}
                                      className="text-[10px] font-bold bg-[#237A57] text-white px-2 py-1 rounded hover:bg-green-700 transition"
                                    >
                                      Giao món ✓
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer & Actions */}
                      <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 mt-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500 font-bold uppercase">Tổng tiền:</span>
                          <span className="font-bold text-[#D67D3E] text-lg">{displayAmount.toLocaleString('vi-VN')}đ</span>
                        </div>

                        {isPendingVerification ? (
                          <div className="flex flex-col gap-2 mt-1">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleVerifyAndSubmitKitchen(order.id, orderCode, 'VIETQR')}
                                className="flex-1 bg-[#237A57] text-white px-2 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-green-700 transition text-center"
                              >
                                Nhận CK (VietQR) & Gửi Bếp
                              </button>
                              <button
                                onClick={() => handleVerifyAndSubmitKitchen(order.id, orderCode, 'CASH')}
                                className="flex-1 bg-[#D67D3E] text-white px-2 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-orange-700 transition text-center"
                              >
                                Nhận Tiền Mặt & Gửi Bếp
                              </button>
                            </div>
                            <button
                              onClick={() => handleCancelTakeawayOrder(order.id, orderCode)}
                              className="w-full px-3 py-2 border border-red-300 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition"
                              title="Hủy đơn không hợp lệ"
                            >
                              Hủy đơn
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => completeTakeawayDelivery(order.id, orderCode)}
                            className="w-full py-2.5 bg-[#237A57] text-white rounded-lg text-xs font-bold shadow-sm hover:bg-green-700 transition flex items-center justify-center gap-1.5 mt-1"
                          >
                            <span>✓</span>
                            <span>Xác nhận giao đồ & Hoàn tất</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
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

      {/* POS VietQR Payment Modal */}
      {paymentModalOpen && paymentModalData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[#FED8B1]">
            <div className="p-4 border-b bg-[#543310] text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="font-bold text-lg text-[#FED8B1]">Thanh toán Đơn hàng #{paymentModalData.orderCode}</h2>
                <p className="text-xs text-amber-200/80">Chọn hình thức Chuyển khoản QR hoặc Tiền mặt</p>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-white/70 hover:text-white text-2xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 flex-1 overflow-y-auto bg-[#FAF7F3]">
              {paymentModalData.isPaid ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
                  <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">✓</div>
                  <h3 className="font-bold text-green-800 text-lg">Đơn hàng đã được thanh toán!</h3>
                  <p className="text-sm text-green-600">Đơn hàng này đã ở trạng thái hoàn tất.</p>
                </div>
              ) : (
                <>
                  {/* Payment Method Selector: 1. QR, 2. CASH */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-[#EFE8DF] rounded-xl border border-[#DECDBE]">
                    <button
                      type="button"
                      onClick={() => setPaymentMethodChoice('VIETQR')}
                      className={`py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                        paymentMethodChoice === 'VIETQR'
                          ? 'bg-[#543310] text-white shadow'
                          : 'text-[#543310] hover:bg-[#E2D6C6]'
                      }`}
                    >
                      <span className="text-base">📱</span>
                      <span>Chuyển khoản (QR)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethodChoice('CASH')}
                      className={`py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                        paymentMethodChoice === 'CASH'
                          ? 'bg-[#237A57] text-white shadow'
                          : 'text-[#237A57] hover:bg-[#E2D6C6]'
                      }`}
                    >
                      <span className="text-base">💵</span>
                      <span>Tiền mặt (CASH)</span>
                    </button>
                  </div>

                  {paymentMethodChoice === 'VIETQR' ? (
                    <>
                      {/* QR Image Box */}
                      <div className="bg-white p-4 rounded-xl border border-[#E8DED5] flex flex-col items-center shadow-sm">
                        <img
                          src={generateVietQRUrl(paymentModalData.amount, `DH ${paymentModalData.orderCode}`)}
                          alt="Vietcombank VietQR Code"
                          className="w-[220px] h-[220px] object-contain rounded-lg"
                        />
                        <span className="text-[11px] text-gray-500 mt-2 font-mono">Tự động nhúng số tiền & nội dung</span>
                      </div>

                      {/* Account Info Box */}
                      <div className="bg-white border border-[#FED8B1] rounded-xl p-4 space-y-2.5 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Ngân hàng:</span>
                          <span className="font-semibold text-[#543310]">{VIETCOMBANK_CONFIG.bankName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Số tài khoản:</span>
                          <div className="flex items-center gap-1.5 font-bold text-[#543310] font-mono">
                            <span>{VIETCOMBANK_CONFIG.accountNo}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(VIETCOMBANK_CONFIG.accountNo);
                                setCopiedField('acc');
                                setTimeout(() => setCopiedField(null), 2000);
                              }}
                              className="text-gray-400 hover:text-[#D67D3E] text-xs underline"
                            >
                              {copiedField === 'acc' ? '✓ Đã chép' : 'Copy'}
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Chủ tài khoản:</span>
                          <span className="font-bold text-[#543310]">{VIETCOMBANK_CONFIG.accountName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Nội dung CK:</span>
                          <div className="flex items-center gap-1.5 font-bold text-[#D67D3E] font-mono">
                            <span>DH {paymentModalData.orderCode}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`DH ${paymentModalData.orderCode}`);
                                setCopiedField('memo');
                                setTimeout(() => setCopiedField(null), 2000);
                              }}
                              className="text-gray-400 hover:text-[#D67D3E] text-xs underline"
                            >
                              {copiedField === 'memo' ? '✓ Đã chép' : 'Copy'}
                            </button>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-[#FED8B1] flex justify-between items-center font-bold">
                          <span className="text-[#543310]">Tổng thanh toán:</span>
                          <span className="text-[#D67D3E] text-lg">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(paymentModalData.amount)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* CASH Payment View - NO QR Code */}
                      <div className="bg-white border-2 border-[#237A57]/30 rounded-xl p-5 space-y-4 shadow-sm">
                        <div className="text-center pb-3 border-b border-gray-100">
                          <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Số tiền cần thu</span>
                          <div className="text-2xl font-black text-[#237A57] mt-1">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(paymentModalData.amount)}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            Tiền khách đưa (tùy chọn tính tiền thừa):
                          </label>
                          <input
                            type="number"
                            placeholder="Nhập số tiền..."
                            value={cashReceivedInput}
                            onChange={(e) => setCashReceivedInput(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#237A57]/30"
                          />
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <button
                              type="button"
                              onClick={() => setCashReceivedInput(String(paymentModalData.amount))}
                              className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition"
                            >
                              Đủ tiền
                            </button>
                            {[50000, 100000, 200000, 500000].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setCashReceivedInput(String(preset))}
                                className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition"
                              >
                                {(preset / 1000).toLocaleString('vi-VN')}k
                              </button>
                            ))}
                          </div>
                        </div>

                        {Number(cashReceivedInput) > 0 && (
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 font-medium">Tiền thối lại:</span>
                              <span className={`font-bold text-base ${Number(cashReceivedInput) >= paymentModalData.amount ? 'text-emerald-700' : 'text-red-600'}`}>
                                {Number(cashReceivedInput) >= paymentModalData.amount
                                  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(cashReceivedInput) - paymentModalData.amount)
                                  : 'Chưa đủ tiền'}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                          ℹ️ Xác nhận thanh toán tiền mặt sẽ trực tiếp hoàn tất đơn hàng và ghi nhận vào ca làm việc hiện tại.
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex flex-col gap-2 shrink-0">
              {paymentModalData.isPaid ? (
                <button
                  onClick={() => setPaymentModalOpen(false)}
                  className="w-full bg-[#543310] text-white py-2.5 rounded-xl font-bold hover:bg-[#D67D3E] transition"
                >
                  Đóng
                </button>
              ) : (
                <>
                  {paymentMethodChoice === 'VIETQR' ? (
                    <button
                      onClick={() => handleConfirmPosPayment('VIETQR')}
                      disabled={isSubmitting}
                      className="w-full bg-[#543310] text-white py-3 rounded-xl font-bold hover:bg-[#D67D3E] transition disabled:opacity-50 shadow-md text-sm"
                    >
                      {isSubmitting ? 'Đang ghi nhận...' : '✓ Xác nhận đã nhận Chuyển Khoản (VietQR)'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConfirmPosPayment('CASH')}
                      disabled={isSubmitting}
                      className="w-full bg-[#237A57] text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition disabled:opacity-50 shadow-md text-sm"
                    >
                      {isSubmitting ? 'Đang ghi nhận...' : '💵 Xác nhận thu tiền mặt & Hoàn tất'}
                    </button>
                  )}
                  <button
                    onClick={() => setPaymentModalOpen(false)}
                    disabled={isSubmitting}
                    className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-100 transition text-sm"
                  >
                    Đóng
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOAST Notification Container */}
      {toastConfig && toastConfig.isVisible && (
        <div className="fixed top-20 right-8 z-[150] shadow-2xl border-l-4 border-[#D67D3E] bg-white text-[#543310] px-6 py-4 rounded-xl flex items-center gap-3 w-80">
          <div className="text-2xl animate-pulse">🛎️</div>
          <div className="flex-1 font-bold text-sm leading-snug">{toastConfig.text}</div>
          <button onClick={() => setToastConfig(null)} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
      )}
    </div>
  </div>
);
};


export default POS;
