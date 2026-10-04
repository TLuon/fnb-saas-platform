import React from 'react';

interface FloorTabsProps {
  floors: { id: string; name: string }[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function FloorTabs({ floors, activeId, onSelect }: FloorTabsProps) {
  if (!floors || floors.length === 0) return null;

  return (
    <div className="bg-[#FFFFFF] border-b border-[#E8DED5] px-4 py-3 sticky top-16 z-30">
      <div className="max-w-screen-xl mx-auto flex overflow-x-auto hide-scrollbar gap-4">
        {floors.map(floor => (
          <button
            key={floor.id}
            onClick={() => onSelect(floor.id)}
            className={`whitespace-nowrap px-4 py-2 font-bold text-sm transition-colors border-b-2 ${
              activeId === floor.id 
                ? 'text-[#D67D3E] border-[#D67D3E]' 
                : 'text-[#6B625B] border-transparent hover:text-[#543310]'
            }`}
          >
            {floor.name}
          </button>
        ))}
      </div>
    </div>
  );
}
