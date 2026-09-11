import { Edit2, Trash2, Tag } from 'lucide-react';
import type { Category } from '../../store/menuStore';

interface CategorySidebarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onEditCategory: (c: Category) => void;
  onDeleteCategory: (c: Category) => void;
}

export function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onEditCategory,
  onDeleteCategory
}: CategorySidebarProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 h-full">
      <h3 className="font-bold text-gray-800 mb-4 px-2">Danh mục</h3>
      
      <div className="space-y-1">
        <button
          onClick={() => onSelectCategory(null)}
          className={`w-full text-left px-3 py-2 rounded-xl transition-colors flex items-center gap-2 ${
            selectedCategoryId === null 
              ? 'bg-[var(--color-brand-accent)]/20 text-[var(--color-brand-primary)] font-bold' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Tag size={16} className={selectedCategoryId === null ? 'text-[var(--color-brand-secondary)]' : 'text-gray-400'} />
          Tất cả món
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <div 
              key={cat.id}
              className={`group flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                isSelected 
                  ? 'bg-[var(--color-brand-accent)]/20 text-[var(--color-brand-primary)] font-bold' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => onSelectCategory(cat.id)}
            >
              <div className="flex items-center gap-2 truncate">
                <Tag size={16} className={isSelected ? 'text-[var(--color-brand-secondary)]' : 'text-gray-400'} />
                <span className="truncate">{cat.name}</span>
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); onEditCategory(cat); }}
                  className="p-1.5 text-gray-400 hover:text-[var(--color-brand-primary)] hover:bg-white rounded-lg transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteCategory(cat); }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
