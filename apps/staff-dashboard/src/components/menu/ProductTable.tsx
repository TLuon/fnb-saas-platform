import { Edit2, Trash2 } from 'lucide-react';
import type { Product, Category } from '../../store/menuStore';

interface ProductTableProps {
  products: Product[];
  categories: Category[];
  onToggleProduct: (id: string) => void;
  onEditProduct: (p: Product) => void;
  onDeleteProduct: (p: Product) => void;
}

export function ProductTable({
  products,
  categories,
  onToggleProduct,
  onEditProduct,
  onDeleteProduct
}: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <p className="text-gray-400 font-medium">Không tìm thấy món nào phù hợp.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-[var(--color-brand-secondary)] text-white">
              <th className="p-4 font-semibold whitespace-nowrap">Tên món</th>
              <th className="p-4 font-semibold whitespace-nowrap">Danh mục</th>
              <th className="p-4 font-semibold text-right whitespace-nowrap">Giá bán</th>
              <th className="p-4 font-semibold text-center whitespace-nowrap">Đang bán</th>
              <th className="p-4 font-semibold text-right whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {products.map((p: Product) => {
              const categoryName = categories.find((c) => c.id === p.categoryId)?.name || 'Khác';
              const isActive = p.is_active ?? p.active;

              return (
                <tr
                  key={p.id}
                  className={`transition-colors hover:bg-gray-50 ${!isActive ? 'opacity-60 grayscale' : ''}`}
                >
                  <td className="p-4">
                    <div className="font-bold text-[var(--color-brand-primary)]">
                      {p.name}
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="inline-block bg-[var(--color-brand-neutral)] border border-gray-200 text-gray-600 px-3 py-1 text-sm rounded-full">
                      {categoryName}
                    </span>
                  </td>

                  <td className="p-4 text-right">
                    <div className="font-bold text-[var(--color-brand-secondary)]">
                      {Number(p.price).toLocaleString('vi-VN')} ₫
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex justify-center">
                      <button
                        onClick={() => onToggleProduct(p.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          isActive
                            ? 'bg-[var(--color-brand-success)]'
                            : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isActive
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => onEditProduct(p)}
                        className="p-2 text-gray-400 hover:text-[var(--color-brand-primary)] transition bg-white rounded-lg border border-gray-200 hover:border-[var(--color-brand-primary)] shadow-sm"
                        title="Sửa"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button 
                        onClick={() => onDeleteProduct(p)}
                        className="p-2 text-gray-400 hover:text-[var(--color-brand-error)] transition bg-white rounded-lg border border-gray-200 hover:border-[var(--color-brand-error)] shadow-sm"
                        title="Xóa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
