interface SegmentTabsProps {
  activeSegment: string;
  onSegmentChange: (segment: string) => void;
}

export function SegmentTabs({ activeSegment, onSegmentChange }: SegmentTabsProps) {
  const tabs = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'VIP', label: 'VIP' },
    { id: 'LOYAL', label: 'Trung thành' },
    { id: 'NEW', label: 'Mới' },
    { id: 'CHURN_RISK', label: 'Nguy cơ rời bỏ' },
  ];

  return (
    <div className="flex items-center gap-6 border-b border-gray-200 overflow-x-auto pb-[1px]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSegmentChange(tab.id)}
          className={`py-3 px-1 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeSegment === tab.id
              ? 'border-[var(--color-brand-secondary)] text-[var(--color-brand-secondary)]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
