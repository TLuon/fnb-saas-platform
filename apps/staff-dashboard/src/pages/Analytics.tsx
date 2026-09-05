import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black font-serif text-[var(--color-brand-primary)]">Báo cáo Doanh thu</h2>
          <p className="text-gray-500 mt-2">Tổng quan tình hình kinh doanh hôm nay</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-brand-accent)] opacity-10 rounded-bl-full group-hover:scale-110 transition-transform"></div>
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 flex items-center justify-center bg-[var(--color-brand-accent)]/30 rounded-2xl text-[var(--color-brand-secondary)]"><DollarSign size={24} /></div>
            <div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Doanh thu hôm nay</p>
              <p className="text-3xl font-black font-serif text-[var(--color-brand-primary)] mt-1">14,250K</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-brand-accent)] opacity-10 rounded-bl-full group-hover:scale-110 transition-transform"></div>
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 flex items-center justify-center bg-[var(--color-brand-accent)]/30 rounded-2xl text-[var(--color-brand-secondary)]"><Users size={24} /></div>
            <div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Lượt khách</p>
              <p className="text-3xl font-black font-serif text-[var(--color-brand-primary)] mt-1">214</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-brand-accent)] opacity-10 rounded-bl-full group-hover:scale-110 transition-transform"></div>
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 flex items-center justify-center bg-[var(--color-brand-accent)]/30 rounded-2xl text-[var(--color-brand-secondary)]"><Activity size={24} /></div>
            <div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Đơn hàng</p>
              <p className="text-3xl font-black font-serif text-[var(--color-brand-primary)] mt-1">86</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-brand-accent)] opacity-10 rounded-bl-full group-hover:scale-110 transition-transform"></div>
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 flex items-center justify-center bg-[var(--color-brand-accent)]/30 rounded-2xl text-[var(--color-brand-secondary)]"><TrendingUp size={24} /></div>
            <div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Tỷ lệ lấp đầy</p>
              <p className="text-3xl font-black font-serif text-[var(--color-brand-primary)] mt-1">78%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-[var(--color-brand-primary)] mb-6">Biểu đồ doanh thu tuần</h3>
          <div className="flex items-end justify-between h-48 gap-2">
            {[40, 60, 45, 80, 50, 90, 75].map((val, idx) => (
              <div key={idx} className="w-full bg-[var(--color-brand-neutral)] rounded-t-md relative group">
                <div 
                  className="absolute bottom-0 w-full bg-[var(--color-brand-secondary)] rounded-t-md transition-all duration-500 group-hover:bg-[var(--color-brand-primary)]"
                  style={{ height: `${val}%` }}
                ></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400 font-semibold">
            <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-[var(--color-brand-primary)] mb-6">Top món bán chạy</h3>
          <div className="space-y-4">
            {['Cà phê sữa đá', 'Trà đào cam sả', 'Bánh sừng bò', 'Bạc xỉu'].map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold text-[var(--color-brand-primary)]">{item}</span>
                  <span className="text-[var(--color-brand-secondary)] font-bold">{120 - idx * 20} ly</span>
                </div>
                <div className="w-full bg-[var(--color-brand-neutral)] rounded-full h-2.5">
                  <div className="bg-[var(--color-brand-accent)] h-2.5 rounded-full" style={{ width: `${100 - idx * 15}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
