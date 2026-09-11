import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, CheckCircle } from 'lucide-react';
import { useToast } from './ToastProvider';

interface VietQRPanelProps {
  amount: number;
  content: string;
  onSimulatePaymentSuccess: () => void; // for demo
}

export function VietQRPanel({ amount, content, onSimulatePaymentSuccess }: VietQRPanelProps) {
  const { showInfo } = useToast();

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    showInfo(`Đã copy ${type}`);
  };

  // Generate a dummy VietQR string (just for demo purposes)
  const qrValue = `vietqr://example?amount=${amount}&message=${encodeURIComponent(content)}`;

  return (
    <div className="bg-[#FFFFFF] border border-[#FED8B1] rounded-2xl p-6 shadow-sm max-w-sm w-full mx-auto">
      <h3 className="text-center font-bold text-[#543310] mb-6 text-lg">Quét mã QR để thanh toán cọc</h3>
      
      <div className="flex justify-center mb-6">
        <div className="p-4 border-2 border-dashed border-[#E8DED5] rounded-xl bg-white">
          <QRCodeSVG value={qrValue} size={200} />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-sm text-[#6B625B] mb-1">Số tiền</div>
          <div className="flex justify-between items-center bg-[#FAF7F3] p-3 rounded-lg">
            <span className="font-bold text-[#D67D3E] text-lg">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}
            </span>
            <button 
              onClick={() => handleCopy(amount.toString(), 'số tiền')}
              className="text-[#6B625B] hover:text-[#543310]"
            >
              <Copy size={18} />
            </button>
          </div>
        </div>

        <div>
          <div className="text-sm text-[#6B625B] mb-1">Nội dung chuyển khoản</div>
          <div className="flex justify-between items-center bg-[#FAF7F3] p-3 rounded-lg">
            <span className="font-bold text-[#222222] truncate mr-2">{content}</span>
            <button 
              onClick={() => handleCopy(content, 'nội dung')}
              className="text-[#6B625B] hover:text-[#543310] shrink-0"
            >
              <Copy size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-[#6B625B] mb-4">
        Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống ghi nhận tự động.
      </div>

      {/* Demo button */}
      <button 
        onClick={onSimulatePaymentSuccess}
        className="w-full py-3 bg-[#E2F3E5] text-[#237A57] border border-[#8AD199] font-bold rounded-xl hover:bg-[#8AD199] hover:text-white transition-colors"
      >
        [Giả lập] Đã thanh toán xong
      </button>
    </div>
  );
}
