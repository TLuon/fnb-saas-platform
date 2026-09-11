import React from 'react';

interface OrderNoteFieldProps {
  note: string;
  onChange: (note: string) => void;
}

export function OrderNoteField({ note, onChange }: OrderNoteFieldProps) {
  return (
    <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-[#E8DED5]">
      <h3 className="font-bold text-[#543310] mb-2 text-sm">Ghi chú cho bếp (tuỳ chọn)</h3>
      <textarea
        value={note}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Vd: Ít đường, không đá..."
        className="w-full bg-[#FAF7F3] border border-[#E8DED5] rounded-lg p-3 text-sm text-[#222222] focus:outline-none focus:border-[#D67D3E] focus:ring-1 focus:ring-[#D67D3E] transition-all resize-none h-24 placeholder:text-[#6B625B]"
      />
    </div>
  );
}
