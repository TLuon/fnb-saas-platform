import { User, Phone, Star } from 'lucide-react';
import type { Customer360 } from '../../store/cdpStore';

interface Customer360HeaderProps {
  customer: Customer360;
}

export function Customer360Header({ customer }: Customer360HeaderProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 bg-[var(--color-brand-accent)] rounded-2xl flex items-center justify-center text-[var(--color-brand-primary)]">
          <User size={40} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-[#543310]">{customer.name}</h2>
          <div className="flex items-center gap-4 mt-2 text-gray-500 font-medium">
            <span className="flex items-center gap-1"><Phone size={16} /> {customer.phone}</span>
            <span className="flex items-center gap-1 text-[var(--color-brand-secondary)]">
              <Star size={16} className="fill-current" /> {customer.tier}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-8 md:px-8">
        <div>
          <p className="text-sm text-gray-500 uppercase font-bold tracking-wide mb-1">Tổng chi tiêu</p>
          <p className="text-3xl font-black text-[var(--color-brand-primary)]">{formatCurrency(customer.totalSpent)}</p>
        </div>
        <div className="w-px h-12 bg-gray-200 hidden md:block"></div>
        <div>
          <p className="text-sm text-gray-500 uppercase font-bold tracking-wide mb-1">Lượt ghé</p>
          <p className="text-3xl font-black text-[var(--color-brand-secondary)]">{customer.visits}</p>
        </div>
      </div>
    </div>
  );
}
