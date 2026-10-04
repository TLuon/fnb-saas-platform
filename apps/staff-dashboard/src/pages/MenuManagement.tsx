import { useEffect, useState, useMemo } from 'react';
import { useMenuStore } from '../store/menuStore';
import type { Product, Category } from '../store/menuStore';
import { MenuToolbar } from '../components/menu/MenuToolbar';
import { CategorySidebar } from '../components/menu/CategorySidebar';
import { ProductTable } from '../components/menu/ProductTable';
import { ProductFormModal } from '../components/menu/ProductFormModal';
import { CategoryFormModal } from '../components/menu/CategoryFormModal';
import { DeleteConfirmModal } from '../components/menu/DeleteConfirmModal';

export default function MenuManagement() {
  const {
    products,
    categories,
    fetchMenu,
    toggleProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    addProduct,
    updateProduct,
    deleteProduct
  } = useMenuStore();

  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Modals state
  const [isProductModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: 'PRODUCT' | 'CATEGORY' | null;
    item: any | null;
  }>({ isOpen: false, type: null, item: null });

  useEffect(() => {
    const initFetch = async () => {
      await fetchMenu();
      setLoading(false);
    };
    initFetch();
  }, [fetchMenu]);

  // Derived filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Category Filter
      if (selectedCategoryId && p.categoryId !== selectedCategoryId) return false;
      // 2. Status Filter
      const isActive = p.is_active ?? p.active;
      if (statusFilter === 'ACTIVE' && !isActive) return false;
      if (statusFilter === 'INACTIVE' && isActive) return false;
      // 3. Search Term
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [products, selectedCategoryId, statusFilter, searchTerm]);

  // Handlers
  const handleToggleProduct = async (id: string) => {
    await toggleProduct(id);
  };

  const handleProductSubmit = async (data: Omit<Product, 'id'>) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, data);
    } else {
      await addProduct(data);
    }
  };

  const handleCategorySubmit = async (data: { name: string; kitchen_station: 'BAR' | 'KITCHEN' }) => {
    if (editingCategory) {
      await updateCategory(editingCategory.id, data);
    } else {
      await addCategory(data);
    }
  };

  const handleDeleteConfirm = async () => {
    const { type, item } = deleteModalState;
    if (type === 'PRODUCT') {
      await deleteProduct(item.id);
    } else if (type === 'CATEGORY') {
      await deleteCategory(item.id);
      if (selectedCategoryId === item.id) setSelectedCategoryId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h2 className="text-4xl font-black font-serif text-[var(--color-brand-primary)]">
          Quản lý Thực đơn
        </h2>
        <p className="text-gray-500 mt-2">
          Cấu hình danh mục và món ăn của quán
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="w-full lg:w-64 flex-shrink-0">
          <CategorySidebar 
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            onEditCategory={(c) => { setEditingCategory(c); setCategoryModalOpen(true); }}
            onDeleteCategory={(c) => { setDeleteModalState({ isOpen: true, type: 'CATEGORY', item: c }); }}
          />
        </div>

        <div className="flex-1 w-full space-y-4">
          <MenuToolbar 
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onAddCategory={() => { setEditingCategory(null); setCategoryModalOpen(true); }}
            onAddProduct={() => { setEditingProduct(null); setProductModalOpen(true); }}
          />

          <ProductTable 
            products={filteredProducts}
            categories={categories}
            onToggleProduct={handleToggleProduct}
            onEditProduct={(p) => { setEditingProduct(p); setProductModalOpen(true); }}
            onDeleteProduct={(p) => { setDeleteModalState({ isOpen: true, type: 'PRODUCT', item: p }); }}
          />
        </div>
      </div>

      <ProductFormModal 
        isOpen={isProductModalOpen}
        onClose={() => setProductModalOpen(false)}
        onSubmit={handleProductSubmit}
        categories={categories}
        initialData={editingProduct}
      />

      <CategoryFormModal 
        isOpen={isCategoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSubmit={handleCategorySubmit}
        initialData={editingCategory}
      />

      <DeleteConfirmModal 
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, type: null, item: null })}
        onConfirm={handleDeleteConfirm}
        title={deleteModalState.type === 'PRODUCT' ? 'Xóa món ăn' : 'Xóa danh mục'}
        message={
          deleteModalState.type === 'PRODUCT' 
            ? `Bạn có chắc chắn muốn xóa món "${deleteModalState.item?.name}" không? Thao tác này không thể hoàn tác.`
            : `Bạn có chắc chắn muốn xóa danh mục "${deleteModalState.item?.name}" không? Việc xóa danh mục sẽ thất bại nếu danh mục vẫn còn món ăn bên trong.`
        }
      />
    </div>
  );
}