import { Heart, Info } from 'lucide-react';

export function FavoriteItems({ items }: { items: { name: string; timesOrdered: number }[] }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-full">
      <div className="flex items-center gap-2 mb-6">
        <Heart size={20} className="text-red-500 fill-current" />
        <h3 className="text-lg font-bold text-[#543310]">Món yêu thích</h3>
      </div>
      
      {items.length === 0 ? (
        <p className="text-gray-400">Chưa có đủ dữ liệu</p>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <span className="font-bold text-gray-800">{item.name}</span>
              <span className="text-sm font-semibold text-[var(--color-brand-secondary)] bg-[var(--color-brand-accent)]/20 px-3 py-1 rounded-full">
                {item.timesOrdered} lần
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DietaryNotes({ notes }: { notes: string[] }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-full border-l-4 border-l-yellow-400">
      <div className="flex items-center gap-2 mb-4">
        <Info size={20} className="text-yellow-600" />
        <h3 className="text-lg font-bold text-[#543310]">Ghi chú / Dị ứng</h3>
      </div>
      
      {notes.length === 0 ? (
        <p className="text-gray-400">Không có ghi chú</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2 shrink-0"></span>
              <span className="font-semibold text-gray-700">{note}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
