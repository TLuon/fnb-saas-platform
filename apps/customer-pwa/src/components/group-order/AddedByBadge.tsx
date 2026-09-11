import React from 'react';

interface AddedByBadgeProps {
  name: string;
}

export function AddedByBadge({ name }: AddedByBadgeProps) {
  return (
    <span className="inline-block px-2 py-0.5 mt-1 bg-[#FED8B1] text-[#543310] text-[10px] font-bold rounded-full uppercase tracking-wider">
      Bởi {name}
    </span>
  );
}
