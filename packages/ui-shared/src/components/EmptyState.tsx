import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Danh sách rỗng',
  message = 'Chưa có dữ liệu nào để hiển thị.',
  icon = <Inbox className="w-16 h-16 text-[#6B625B] mb-4" />,
  action,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 bg-[#FFFFFF] rounded-lg border border-[#E8DED5] text-center ${className}`}>
      {icon}
      <h3 className="text-xl font-semibold text-[#222222] mb-2">{title}</h3>
      <p className="text-[#6B625B] mb-6">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
