import { useEffect, useMemo, useState } from 'react';
import { useInventoryStore, type Ingredient } from '../store/inventoryStore';
import { useAnalyticsStore } from '../store/analyticsStore';
import { IngredientTable } from '../components/inventory/IngredientTable';
import { InventoryTransactions } from '../components/inventory/InventoryTransactions';
import { InventoryFinancialSummary } from '../components/inventory/InventoryFinancialSummary';
import { FileText, Package, Receipt, X } from 'lucide-react';
import { useModal } from '../components/ModalProvider';

type Tab = 'INGREDIENTS' | 'RECIPES' | 'TRANSACTIONS';

type IngredientFormState = {
  name: string;
  sku: string;
  unit: string;
  current_stock: string;
  min_stock_alert: string;
  cost_per_unit: string;
};

const emptyIngredientForm: IngredientFormState = {
  name: '',
  sku: '',
  unit: 'g',
  current_stock: '0',
  min_stock_alert: '',
  cost_per_unit: '',
};

function numberOrUndefined(value: string) {
  if (value.trim() === '') return undefined;
  return Number(value);
}

function IngredientModal({
  ingredient,
  onClose,
}: {
  ingredient: Ingredient | null;
  onClose: () => void;
}) {
  const { createIngredient, updateIngredient, loading } = useInventoryStore();
  const [form, setForm] = useState<IngredientFormState>(() =>
    ingredient
      ? {
          name: ingredient.name,
          sku: ingredient.sku ?? '',
          unit: ingredient.unit,
          current_stock: String(ingredient.stock),
          min_stock_alert: ingredient.minStock === null ? '' : String(ingredient.minStock),
          cost_per_unit: ingredient.costPerUnit === null ? '' : String(ingredient.costPerUnit),
        }
      : emptyIngredientForm,
  );
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.unit.trim()) {
      setError('Tên nguyên vật liệu và đơn vị tính là bắt buộc.');
      return;
    }

    const payload = {
      name: form.name,
      sku: form.sku,
      unit: form.unit,
      current_stock: numberOrUndefined(form.current_stock),
      min_stock_alert: numberOrUndefined(form.min_stock_alert),
      cost_per_unit: numberOrUndefined(form.cost_per_unit),
    };

    try {
      if (ingredient) {
        await updateIngredient(ingredient.id, payload);
      } else {
        await createIngredient(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu nguyên vật liệu');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <form onSubmit={submit} className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h3 className="text-lg font-black text-[#543310]">
            {ingredient ? 'Sửa nguyên vật liệu' : 'Thêm nguyên vật liệu'}
          </h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {error && <div className="sm:col-span-2 rounded-xl bg-red-50 text-red-700 p-3 text-sm font-medium">{error}</div>}

          <label className="sm:col-span-2 text-sm font-bold text-gray-700">
            Tên nguyên vật liệu
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-[#D67D3E]"
              required
            />
          </label>

          <label className="text-sm font-bold text-gray-700">
            SKU
            <input
              value={form.sku}
              onChange={(event) => setForm({ ...form, sku: event.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-[#D67D3E]"
            />
          </label>

          <label className="text-sm font-bold text-gray-700">
            Đơn vị tính
            <input
              value={form.unit}
              onChange={(event) => setForm({ ...form, unit: event.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-[#D67D3E]"
              required
            />
          </label>

          <label className="text-sm font-bold text-gray-700">
            Tồn kho hiện tại
            <input
              type="number"
              min="0"
              step="0.001"
              value={form.current_stock}
              onChange={(event) => setForm({ ...form, current_stock: event.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-[#D67D3E]"
            />
          </label>

          <label className="text-sm font-bold text-gray-700">
            Tồn kho tối thiểu
            <input
              type="number"
              min="0"
              step="0.001"
              value={form.min_stock_alert}
              onChange={(event) => setForm({ ...form, min_stock_alert: event.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-[#D67D3E]"
            />
          </label>

          <label className="sm:col-span-2 text-sm font-bold text-gray-700">
            Giá vốn mỗi đơn vị
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.cost_per_unit}
              onChange={(event) => setForm({ ...form, cost_per_unit: event.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-[#D67D3E]"
            />
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 p-5">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 font-bold text-gray-600">
            Hủy
          </button>
          <button disabled={loading} className="px-5 py-2 rounded-xl bg-[#543310] text-white font-bold disabled:opacity-50">
            {loading ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>
    </div>
  );
}

function RecipePanel() {
  const { products, ingredients, recipes, fetchRecipes, createRecipe, deleteRecipe } = useInventoryStore();
  const [productId, setProductId] = useState('');
  const [ingredientId, setIngredientId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void fetchRecipes(productId || undefined);
  }, [fetchRecipes, productId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!productId || !ingredientId || !amount) {
      setError('Chọn sản phẩm, nguyên vật liệu và nhập định lượng.');
      return;
    }
    try {
      await createRecipe({ product_id: productId, ingredient_id: ingredientId, amount: Number(amount) });
      setIngredientId('');
      setAmount('');
      setError('');
      await fetchRecipes(productId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu định lượng');
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 lg:grid-cols-4 gap-3 items-end">
        {error && <div className="lg:col-span-4 rounded-xl bg-red-50 text-red-700 p-3 text-sm font-medium">{error}</div>}
        <label className="text-sm font-bold text-gray-700">
          Sản phẩm
          <select value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 p-3">
            <option value="">Chọn sản phẩm</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold text-gray-700">
          Nguyên vật liệu
          <select value={ingredientId} onChange={(event) => setIngredientId(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 p-3">
            <option value="">Chọn nguyên vật liệu</option>
            {ingredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold text-gray-700">
          Định lượng
          <input type="number" min="0.001" step="0.001" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 p-3" />
        </label>
        <button className="rounded-xl bg-[#543310] text-white font-bold p-3">Lưu định lượng</button>
      </form>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#D67D3E] text-white">
            <tr>
              <th className="p-4 text-left">Product ID</th>
              <th className="p-4 text-left">Nguyên vật liệu</th>
              <th className="p-4 text-right">Định lượng</th>
              <th className="p-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {recipes.map((recipe) => (
              <tr key={recipe.id}>
                <td className="p-4 font-mono text-xs text-gray-500">{recipe.productId}</td>
                <td className="p-4 font-bold text-gray-800">{recipe.ingredientName}</td>
                <td className="p-4 text-right">{recipe.amount.toLocaleString('vi-VN')} {recipe.ingredientUnit}</td>
                <td className="p-4 text-right">
                  <button onClick={() => void deleteRecipe(recipe.productId, recipe.ingredientId)} className="text-red-600 font-bold text-sm">Xóa</button>
                </td>
              </tr>
            ))}
            {recipes.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-400 font-medium">Chưa có định lượng.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TransactionPanel() {
  const { ingredients, transactions, addTransaction } = useInventoryStore();
  const [ingredientId, setIngredientId] = useState('');
  const [type, setType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ingredientId || !quantity) {
      setError('Chọn nguyên vật liệu và nhập số lượng.');
      return;
    }
    try {
      await addTransaction({ ingredientId, type, quantity: Number(quantity), note });
      setQuantity('');
      setNote('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể ghi phiếu kho');
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 lg:grid-cols-5 gap-3 items-end">
        {error && <div className="lg:col-span-5 rounded-xl bg-red-50 text-red-700 p-3 text-sm font-medium">{error}</div>}
        <label className="text-sm font-bold text-gray-700">
          Nguyên vật liệu
          <select value={ingredientId} onChange={(event) => setIngredientId(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 p-3">
            <option value="">Chọn nguyên vật liệu</option>
            {ingredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold text-gray-700">
          Loại
          <select value={type} onChange={(event) => setType(event.target.value as 'IN' | 'OUT' | 'ADJUSTMENT')} className="mt-1 w-full rounded-xl border border-gray-200 p-3">
            <option value="IN">Nhập kho</option>
            <option value="OUT">Xuất kho</option>
            <option value="ADJUSTMENT">Điều chỉnh tồn</option>
          </select>
        </label>
        <label className="text-sm font-bold text-gray-700">
          Số lượng
          <input type="number" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 p-3" />
        </label>
        <label className="text-sm font-bold text-gray-700">
          Ghi chú
          <input value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 p-3" />
        </label>
        <button className="rounded-xl bg-[#543310] text-white font-bold p-3">Ghi phiếu</button>
      </form>
      <InventoryTransactions transactions={transactions} />
    </div>
  );
}

export default function Inventory() {
  const { showConfirm } = useModal();
  const {
    ingredients,
    transactions,
    loading,
    error,
    fetchIngredients,
    fetchTransactions,
    fetchProducts,
    deleteIngredient,
  } = useInventoryStore();

  const { dashboardData, fetchDashboard } = useAnalyticsStore();

  const [activeTab, setActiveTab] = useState<Tab>('INGREDIENTS');
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);

  useEffect(() => {
    void fetchIngredients();
    void fetchTransactions();
    void fetchProducts();
    void fetchDashboard('all', 'today');
  }, [fetchDashboard, fetchIngredients, fetchProducts, fetchTransactions]);

  const tabButtonClass = useMemo(
    () => (tab: Tab) =>
      `flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all flex-1 justify-center ${
        activeTab === tab ? 'bg-[#D67D3E] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
      }`,
    [activeTab],
  );

  const openAddModal = () => {
    setEditingIngredient(null);
    setIsIngredientModalOpen(true);
  };

  const openEditModal = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setIsIngredientModalOpen(true);
  };

  const confirmDelete = async (ingredient: Ingredient) => {
    showConfirm({
      title: 'Xóa nguyên vật liệu',
      message: `Bạn có chắc chắn muốn xóa nguyên vật liệu "${ingredient.name}"?`,
      confirmLabel: 'Xóa',
      cancelLabel: 'Hủy',
      onConfirm: async () => {
        await deleteIngredient(ingredient.id);
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in relative min-h-[500px]">
      <div>
        <h2 className="text-4xl font-black font-serif text-[var(--color-brand-primary)]">Quản lý Kho & Định lượng</h2>
        <p className="text-gray-500 mt-2">Kiểm soát nguyên vật liệu và tự động trừ kho theo định lượng.</p>
      </div>

      <InventoryFinancialSummary
        ingredients={ingredients}
        transactions={transactions}
        revenue={dashboardData?.revenue ?? 0}
      />

      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-4 text-sm font-bold">{error}</div>}

      <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex gap-2">
        <button onClick={() => setActiveTab('INGREDIENTS')} className={tabButtonClass('INGREDIENTS')}>
          <Package size={20} />
          Nguyên vật liệu
        </button>
        <button onClick={() => setActiveTab('RECIPES')} className={tabButtonClass('RECIPES')}>
          <FileText size={20} />
          Định lượng
        </button>
        <button onClick={() => setActiveTab('TRANSACTIONS')} className={tabButtonClass('TRANSACTIONS')}>
          <Receipt size={20} />
          Lịch sử Xuất/Nhập
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'INGREDIENTS' && (
          <IngredientTable
            ingredients={ingredients}
            onAdd={openAddModal}
            onEdit={openEditModal}
            onDelete={(ingredient) => void confirmDelete(ingredient)}
          />
        )}
        {activeTab === 'RECIPES' && <RecipePanel />}
        {activeTab === 'TRANSACTIONS' && <TransactionPanel />}
      </div>

      {loading && ingredients.length === 0 && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-primary)]"></div>
        </div>
      )}

      {isIngredientModalOpen && (
        <IngredientModal
          ingredient={editingIngredient}
          onClose={() => {
            setIsIngredientModalOpen(false);
            setEditingIngredient(null);
          }}
        />
      )}
    </div>
  );
}
