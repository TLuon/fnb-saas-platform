import { useEffect, useState } from 'react';
import { useInventoryStore } from '../store/inventoryStore';
import { IngredientTable } from '../components/inventory/IngredientTable';
import { InventoryTransactions } from '../components/inventory/InventoryTransactions';
import { Package, Receipt, FileText } from 'lucide-react';

export default function Inventory() {
  const { ingredients, transactions, loading, fetchIngredients, fetchTransactions } = useInventoryStore();
  const [activeTab, setActiveTab] = useState<'INGREDIENTS' | 'RECIPES' | 'TRANSACTIONS'>('INGREDIENTS');

  useEffect(() => {
    fetchIngredients();
    fetchTransactions();
  }, [fetchIngredients, fetchTransactions]);

  return (
    <div className="space-y-6 animate-fade-in relative min-h-[500px]">
      <div>
        <h2 className="text-4xl font-black font-serif text-[var(--color-brand-primary)]">Quản lý Kho & Định lượng</h2>
        <p className="text-gray-500 mt-2">Kiểm soát nguyên vật liệu và tự động trừ kho theo định lượng (Recipe).</p>
      </div>

      <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex gap-2">
        <button
          onClick={() => setActiveTab('INGREDIENTS')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all flex-1 justify-center ${
            activeTab === 'INGREDIENTS' ? 'bg-[#D67D3E] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Package size={20} />
          Nguyên vật liệu
        </button>
        <button
          onClick={() => setActiveTab('RECIPES')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all flex-1 justify-center ${
            activeTab === 'RECIPES' ? 'bg-[#D67D3E] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <FileText size={20} />
          Định lượng (Recipes)
        </button>
        <button
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all flex-1 justify-center ${
            activeTab === 'TRANSACTIONS' ? 'bg-[#D67D3E] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Receipt size={20} />
          Lịch sử Xuất/Nhập
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'INGREDIENTS' && (
          <IngredientTable ingredients={ingredients} />
        )}
        {activeTab === 'TRANSACTIONS' && (
          <InventoryTransactions transactions={transactions} />
        )}
        {activeTab === 'RECIPES' && (
          <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">Cấu hình Định lượng (Recipes)</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Tính năng này cho phép bạn gắn nguyên vật liệu vào từng sản phẩm (VD: 1 Cà phê sữa = 20g Cà phê hạt + 15ml Sữa đặc). Hệ thống sẽ tự động trừ kho khi có đơn hàng.
            </p>
            <button className="mt-6 px-6 py-3 bg-[var(--color-brand-primary)] text-white font-bold rounded-xl hover:bg-[#3d250c] transition shadow-sm">
              Thiết lập ngay
            </button>
          </div>
        )}
      </div>

      {loading && ingredients.length === 0 && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-primary)]"></div>
        </div>
      )}
    </div>
  );
}
