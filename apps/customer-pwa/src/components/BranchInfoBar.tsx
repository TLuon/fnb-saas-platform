import React from 'react';
import { MapPin, Clock, Info } from 'lucide-react';

interface BranchInfoBarProps {
  branchName?: string;
  address?: string;
  openTime?: string;
  closeTime?: string;
  isOpen?: boolean;
}

export function BranchInfoBar({ 
  branchName = 'Chi nhánh Quận 1',
  address = '123 Nguyễn Thị Minh Khai, P. Bến Thành, Q.1',
  openTime = '08:00',
  closeTime = '22:00',
  isOpen: overrideIsOpen
}: BranchInfoBarProps) {
  const [isOpen, setIsOpen] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (typeof overrideIsOpen === 'boolean') {
      setIsOpen(overrideIsOpen);
      return;
    }

    const checkOpenStatus = () => {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();

      const [openH, openM] = openTime.split(':').map(Number);
      const [closeH, closeM] = closeTime.split(':').map(Number);

      const startMins = (openH ?? 8) * 60 + (openM ?? 0);
      const endMins = (closeH ?? 22) * 60 + (closeM ?? 0);

      setIsOpen(currentMins >= startMins && currentMins < endMins);
    };

    checkOpenStatus();
    const timer = setInterval(checkOpenStatus, 30000);
    return () => clearInterval(timer);
  }, [openTime, closeTime, overrideIsOpen]);

  return (
    <div className="bg-[#FAF7F3] border-b border-[#E8DED5] py-2 px-4 text-sm">
      <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-0">
        
        <div className="flex items-center gap-2 text-[#222222]">
          <MapPin size={16} className="text-[#D67D3E]" />
          <span className="font-bold">{branchName}</span>
          <span className="hidden md:inline text-[#6B625B]"> - {address}</span>
        </div>

        <div className="flex items-center gap-4 text-[#6B625B]">
          <div className="flex items-center gap-1.5">
            <Clock size={16} className="text-[#D67D3E]" />
            <span>{openTime} - {closeTime}</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Info size={16} className={isOpen ? 'text-green-600' : 'text-[#B42318]'} />
            <span className={isOpen ? 'text-green-700' : 'text-[#B42318]'}>
              {isOpen ? 'Đang mở cửa' : 'Đã đóng cửa'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

