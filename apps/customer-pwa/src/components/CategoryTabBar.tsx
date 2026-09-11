import React from 'react';

interface CategoryTabBarProps {
  categories: { id: string; name: string }[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryTabBar({ categories, selectedId, onSelect }: CategoryTabBarProps) {
  return (
    <div className="sticky top-16 z-40 bg-[#FAF7F3] border-b border-[#E8DED5] px-4 py-3 w-full">
      <div className="max-w-screen-xl mx-auto flex overflow-x-auto hide-scrollbar gap-3 items-center">
        <button
          onClick={() => onSelect(null)}
          className={`shrink-0 px-5 py-2 rounded-full font-bold text-sm transition-colors ${
            selectedId === null
              ? 'bg-[#D67D3E] text-white shadow-md'
              : 'bg-[#FFFFFF] text-[#6B625B] border border-[#E8DED5] hover:border-[#D67D3E] hover:text-[#543310]'
          }`}
        >
          Tất cả
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`shrink-0 px-5 py-2 rounded-full font-bold text-sm transition-colors ${
              selectedId === cat.id
                ? 'bg-[#D67D3E] text-white shadow-md'
                : 'bg-[#FFFFFF] text-[#6B625B] border border-[#E8DED5] hover:border-[#D67D3E] hover:text-[#543310]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
