import { DollarSign, Package, TrendingUp, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import type { Ingredient, InventoryTransaction } from '../../store/inventoryStore';

interface InventoryFinancialSummaryProps {
  ingredients: Ingredient[];
  transactions: InventoryTransaction[];
  revenue: number;
}

export function InventoryFinancialSummary({
  ingredients,
  transactions,
  revenue,
}: InventoryFinancialSummaryProps) {
  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // 1. Calculate Total Capital Spent on Raw Materials (Tổng Chi Nhập Nguyên Liệu)
  // Includes 'IN' transactions + initial stock values of newly added ingredients
  const ingredientsWithInTransactions = new Set(
    transactions.filter((t) => t.type === 'IN').map((t) => t.ingredientId),
  );

  const spendFromInTransactions = transactions
    .filter((t) => t.type === 'IN')
    .reduce((sum, t) => {
      const ing = ingredients.find((i) => i.id === t.ingredientId);
      const cost = ing?.costPerUnit ?? 0;
      return sum + t.quantity * cost;
    }, 0);

  const spendFromInitialStock = ingredients
    .filter((ing) => !ingredientsWithInTransactions.has(ing.id))
    .reduce((sum, ing) => {
      return sum + ing.stock * (ing.costPerUnit ?? 0);
    }, 0);

  const totalMaterialExpenditure = spendFromInTransactions + spendFromInitialStock;

  // Current stock value across all ingredients currently in stock
  const currentStockValue = ingredients.reduce((sum, ing) => {
    return sum + ing.stock * (ing.costPerUnit ?? 0);
  }, 0);

  // Net Profit / Loss comparison against revenue
  const profitOrLoss = revenue - totalMaterialExpenditure;
  const isProfitable = profitOrLoss >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Card 1: Total Spent on Raw Materials */}
      <div className="bg-gradient-to-br from-amber-900 to-[#543310] text-white p-5 rounded-2xl shadow-md relative overflow-hidden flex flex-col justify-between">
        <div className="absolute right-3 top-3 opacity-10">
          <DollarSign size={80} />
        </div>
        <div>
          <div className="flex items-center gap-2 text-amber-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Wallet size={16} />
            <span>Tổng Chi Nhập Nguyên Liệu</span>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight mt-1 text-amber-100">
            {formatVND(totalMaterialExpenditure)}
          </div>
        </div>
        <p className="text-xs text-amber-200/80 mt-3 pt-2 border-t border-amber-800/60">
          Tích lũy từ tất cả đợt nhập hàng & tồn kho
        </p>
      </div>

      {/* Card 2: Current Inventory Asset Value */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Giá Trị Tồn Kho Hiện Tại</span>
            <div className="p-2 bg-amber-50 text-[var(--color-brand-secondary)] rounded-xl">
              <Package size={20} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-gray-800 mt-2">
            {formatVND(currentStockValue)}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-50">
          {ingredients.length} mặt hàng trong kho
        </p>
      </div>

      {/* Card 3: Total Sales Revenue */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Doanh Thu Bán Hàng</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-emerald-600 mt-2">
            {formatVND(revenue)}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-50">
          Tổng doanh thu ghi nhận hệ thống
        </p>
      </div>

      {/* Card 4: Profit or Loss Status */}
      <div className={`p-5 rounded-2xl shadow-sm border flex flex-col justify-between ${
        isProfitable
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          : 'bg-rose-50/70 border-rose-200 text-rose-900'
      }`}>
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">So Sánh Lời / Lỗ</span>
            <div className={`p-2 rounded-xl ${
              isProfitable ? 'bg-emerald-200/60 text-emerald-700' : 'bg-rose-200/60 text-rose-700'
            }`}>
              {isProfitable ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
            </div>
          </div>
          <div className={`text-2xl font-black font-mono tracking-tight mt-2 ${
            isProfitable ? 'text-emerald-700' : 'text-rose-700'
          }`}>
            {isProfitable ? `+${formatVND(profitOrLoss)}` : formatVND(profitOrLoss)}
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-black/5 flex items-center justify-between">
          <span className="text-xs font-bold">Trạng thái:</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
            isProfitable ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}>
            {isProfitable ? 'ĐANG LỜI' : 'ĐANG LỖ (VỐN TRẢI TRƯỚC)'}
          </span>
        </div>
      </div>
    </div>
  );
}
