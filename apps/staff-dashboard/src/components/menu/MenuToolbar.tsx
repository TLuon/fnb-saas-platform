import { Search, Plus } from 'lucide-react';

interface MenuToolbarProps {
  onAddCategory: () => void;
  onAddProduct: () => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  statusFilter: 'ALL' | 'ACTIVE' | 'INACTIVE';
  setStatusFilter: (v: 'ALL' | 'ACTIVE' | 'INACTIVE') => void;
}

export function MenuToolbar({
  onAddCategory,
  onAddProduct,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter
}: MenuToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 w-full md:w-auto flex-1">
        <div className="relative flex-1 max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm món ăn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-secondary)] focus:border-transparent outline-none transition-all"
          />
        </div>

        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-[var(--color-brand-secondary)] focus:border-transparent outline-none bg-white cursor-pointer"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang bán</option>
          <option value="INACTIVE">Ngừng bán</option>
        </select>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto">
        <button 
          onClick={onAddCategory}
          className="flex-1 md:flex-none px-4 py-2 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
        >
          Thêm danh mục
        </button>
        <button 
          data-testid="add-product-btn"
          onClick={onAddProduct}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-brand-primary)] text-white font-semibold rounded-xl hover:bg-[var(--color-brand-secondary)] transition-colors shadow-sm"
        >
          <Plus size={18} />
          Thêm món mới
        </button>
      </div>
    </div>
  );
}
