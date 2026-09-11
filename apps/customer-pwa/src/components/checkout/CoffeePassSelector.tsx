import React from 'react';

interface CoffeePassSelectorProps {
  hasPass: boolean;
  passName?: string;
  onSelect: () => void;
}

export function CoffeePassSelector({ hasPass, passName, onSelect }: CoffeePassSelectorProps) {
  if (!hasPass) return null;

  return (
    <div className="bg-[#FAF7F3] p-3 rounded-lg border border-[#E8DED5] flex justify-between items-center text-sm mt-2">
      <span className="text-[#6B625B]">Gói đang dùng</span>
      <button 
        onClick={onSelect}
        className="font-bold text-[#D67D3E] underline"
      >
        {passName || 'Chọn gói'}
      </button>
    </div>
  );
}
