import { AlertTriangle, Edit, PackageCheck, Trash2 } from 'lucide-react';
import type { Ingredient } from '../../store/inventoryStore';

interface IngredientTableProps {
  ingredients: Ingredient[];
  onAdd: () => void;
  onEdit: (ingredient: Ingredient) => void;
  onDelete: (ingredient: Ingredient) => void;
}

export function IngredientTable({ ingredients, onAdd, onEdit, onDelete }: IngredientTableProps) {
  const formatCurrency = (value: number | null) => {
    if (value === null) return '--';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h3 className="font-bold text-gray-700">Danh sách Nguyên vật liệu</h3>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-[var(--color-brand-primary)] text-white font-bold rounded-xl text-sm hover:bg-[#3d250c] transition"
        >
          + Thêm mới
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#D67D3E] text-white text-sm uppercase tracking-wide">
              <th className="p-4 font-semibold">Tên nguyên liệu</th>
              <th className="p-4 font-semibold">Đơn vị tính</th>
              <th className="p-4 font-semibold text-right">Giá gốc (Cost)</th>
              <th className="p-4 font-semibold text-right">Tồn kho tối thiểu</th>
              <th className="p-4 font-semibold text-right">Tồn kho hiện tại</th>
              <th className="p-4 font-semibold text-center">Trạng thái</th>
              <th className="p-4 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {ingredients.map((ing) => {
              const isLowStock = ing.minStock !== null && ing.stock < ing.minStock;
              
              return (
                <tr key={ing.id} className={`hover:bg-gray-50 transition-colors ${isLowStock ? 'bg-red-50/30' : ''}`}>
                  <td className="p-4 font-bold text-gray-800">
                    <div className="flex items-center gap-2">
                      {ing.name}
                    </div>
                    {ing.sku && <div className="text-xs text-gray-400 mt-1">SKU: {ing.sku}</div>}
                  </td>
                  <td className="p-4 text-gray-600 font-medium">{ing.unit}</td>
                  <td className="p-4 text-right text-gray-600">{formatCurrency(ing.costPerUnit)}/{ing.unit}</td>
                  <td className="p-4 text-right text-gray-500 font-medium">
                    {ing.minStock === null ? '--' : `${ing.minStock.toLocaleString('vi-VN')} ${ing.unit}`}
                  </td>
                  <td className={`p-4 text-right font-bold text-lg ${isLowStock ? 'text-[#B42318]' : 'text-gray-800'}`}>
                    {ing.stock.toLocaleString('vi-VN')} <span className="text-sm font-medium text-gray-500">{ing.unit}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center">
                      {isLowStock ? (
                        <span className="flex items-center gap-1 bg-red-100 text-[#B42318] px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap">
                          <AlertTriangle size={14} /> Sắp hết hàng
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bg-green-100 text-[#237A57] px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap">
                          <PackageCheck size={14} /> Đủ hàng
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(ing)}
                        className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                        title="Sửa nguyên vật liệu"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(ing)}
                        className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        title="Xóa nguyên vật liệu"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {ingredients.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400 font-medium">
                  Chưa có nguyên vật liệu nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
