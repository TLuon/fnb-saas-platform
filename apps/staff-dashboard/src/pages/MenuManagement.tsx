import { useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useMenuStore } from '../store/menuStore';
import type { Product } from '../store/menuStore';

export default function MenuManagement() {
  const {
    products,
    categories,
    fetchMenu,
    toggleProduct,
  } = useMenuStore();

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black font-serif text-[var(--color-brand-primary)]">
            Quản lý Thực đơn
          </h2>

          <p className="text-gray-500 mt-2">
            Cấu hình danh mục và món ăn của quán
          </p>
        </div>

        <button className="bg-[var(--color-brand-primary)] text-[var(--color-brand-neutral)] px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-[var(--color-brand-secondary)] transition shadow-md">
          <Plus size={20} />
          Thêm Món Mới
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-brand-secondary)] text-white">
              <th className="p-4 font-semibold">Tên món</th>
              <th className="p-4 font-semibold">Danh mục</th>
              <th className="p-4 font-semibold text-right">Giá bán</th>
              <th className="p-4 font-semibold text-center">Đang bán</th>
              <th className="p-4 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-gray-400"
                >
                  Chưa có món nào.
                </td>
              </tr>
            ) : (
              products.map((p: Product) => (
                <tr
                  key={p.id}
                  className="border-b border-gray-50 hover:bg-[var(--color-brand-accent)]/20 transition"
                >
                  <td className="p-4 font-medium text-[var(--color-brand-primary)]">
                    {p.name}
                  </td>

                  <td className="p-4 text-sm text-gray-600">
                    <span className="bg-[var(--color-brand-neutral)] border border-gray-200 px-3 py-1 rounded-full">
                      {categories.find(
                        (c) => c.id === p.categoryId,
                      )?.name || 'Khác'}
                    </span>
                  </td>

                  <td className="p-4 text-right font-semibold text-[var(--color-brand-secondary)]">
                    {Number(p.price).toLocaleString('vi-VN')} ₫
                  </td>

                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleProduct(p.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        p.active
                          ? 'bg-[var(--color-brand-primary)]'
                          : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          p.active
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>

                  <td className="p-4 flex justify-end gap-2">
                    <button className="p-2 text-gray-400 hover:text-[var(--color-brand-primary)] transition bg-gray-50 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 shadow-sm">
                      <Edit2 size={16} />
                    </button>

                    <button className="p-2 text-gray-400 hover:text-red-500 transition bg-gray-50 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 shadow-sm">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}