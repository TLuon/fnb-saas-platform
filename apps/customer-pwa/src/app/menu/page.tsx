'use client';
import React, { useEffect, useState } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useToast } from '../../components/ToastProvider';
import { useRouter } from 'next/navigation';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  categoryId?: string;
  is_active?: boolean;
}

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore(state => state.addItem);
  const cartItemsCount = useCartStore(state => state.items.reduce((acc, i) => acc + i.quantity, 0));
  const { showInfo, showError } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function fetchMenuData() {
      try {
        setLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

        // Retrieve token from cookie or localStorage
        let token = '';
        if (typeof document !== 'undefined') {
          const match = document.cookie.match(/(?:^|;\s*)jwt=([^;]*)/);
          token = match ? decodeURIComponent(match[1]) : (localStorage.getItem('access_token') || '');
        }

        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const [catRes, prodRes] = await Promise.all([
          fetch(`${baseUrl}/categories`, { headers }),
          fetch(`${baseUrl}/products`, { headers })
        ]);

        if (!catRes.ok || !prodRes.ok) {
          throw new Error('Không thể tải thực đơn từ máy chủ');
        }

        const rawCategories = await catRes.json();
        const rawProducts = await prodRes.json();

        const catData = Array.isArray(rawCategories) ? rawCategories : (rawCategories?.data ?? []);
        const prodData = Array.isArray(rawProducts) ? rawProducts : (rawProducts?.data ?? []);

        const categoryMap: Record<string, string> = {};
        catData.forEach((c: any) => {
          categoryMap[c.id] = c.name;
        });

        const items: MenuItem[] = prodData
          .filter((p: any) => p.is_active !== false)
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price || 0),
            category: categoryMap[p.category_id || p.categoryId] || 'Khác',
            categoryId: p.category_id || p.categoryId,
            is_active: p.is_active,
          }));
        setMenuItems(items);
      } catch (err: any) {
        console.error('Lỗi khi nạp menu', err);
        showError(err.message || 'Không thể nạp dữ liệu thực đơn');
      } finally {
        setLoading(false);
      }
    }

    fetchMenuData();
  }, [showError]);

  const handleAdd = (item: MenuItem) => {
    addItem({ ...item, quantity: 1 });
    showInfo(`Đã thêm ${item.name} vào giỏ`);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F3] p-4 pb-24">
      <h1 className="text-2xl font-bold text-[#543310] mb-6 border-b-2 border-[#D67D3E] inline-block pb-1">Thực Đơn</h1>
      
      {loading ? (
        <div className="text-center py-12 text-gray-500 font-medium">
          Đang tải thực đơn từ hệ thống...
        </div>
      ) : menuItems.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          Hiện chưa có món ăn nào đang mở bán.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {menuItems.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center transition hover:border-[#FED8B1]">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#FAF7F3] text-[#D67D3E] mb-1 inline-block">
                  {item.category}
                </span>
                <h3 className="font-bold text-[#543310]">{item.name}</h3>
                <p className="text-[#D67D3E] font-medium">{item.price.toLocaleString()} ₫</p>
              </div>
              <button
                onClick={() => handleAdd(item)}
                className="bg-[#543310] text-[#FAF7F3] px-4 py-2 rounded-lg font-medium hover:bg-opacity-90 transition"
              >
                Thêm
              </button>
            </div>
          ))}
        </div>
      )}

      {cartItemsCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex justify-between items-center z-50">
          <span className="font-bold text-[#543310]">Giỏ hàng: {cartItemsCount} món</span>
          <button 
            onClick={() => router.push('/cart')}
            className="bg-[#D67D3E] text-white px-6 py-2 rounded-xl font-bold hover:bg-opacity-90 transition"
          >
            Xem giỏ hàng
          </button>
        </div>
      )}
    </div>
  );
}
