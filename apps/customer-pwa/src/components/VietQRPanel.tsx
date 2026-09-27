import React from 'react';
import { Copy } from 'lucide-react';
import { useToast } from './ToastProvider';
import { generateVietQRUrl, VIETCOMBANK_CONFIG } from '@fnb/utils';

interface VietQRPanelProps {
  amount: number;
  content: string;
  onSimulatePaymentSuccess: () => void;
}

export function VietQRPanel({ amount, content, onSimulatePaymentSuccess }: VietQRPanelProps) {
  const { showInfo } = useToast();

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    showInfo(`Đã copy ${type}`);
  };

  const qrImageUrl = generateVietQRUrl(amount, content);

  return (
    <div className="bg-[#FFFFFF] border border-[#FED8B1] rounded-2xl p-6 shadow-sm max-w-sm w-full mx-auto">
      <h3 className="text-center font-bold text-[#543310] mb-2 text-lg">Quét mã VietQR để thanh toán</h3>
      <p className="text-center text-xs text-[#6B625B] mb-6">Mã QR tự động gồm số tiền & nội dung</p>
      
      <div className="flex justify-center mb-6">
        <div className="p-3 border border-[#E8DED5] rounded-xl bg-[#FAF7F3]">
          <img src={qrImageUrl} alt="Vietcombank VietQR Code" className="w-[200px] h-[200px] object-contain rounded-lg" />
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between items-center bg-[#FAF7F3] p-3 rounded-lg border border-[#E8DED5]">
          <span className="text-[#6B625B]">Ngân hàng:</span>
          <span className="font-bold text-[#543310]">{VIETCOMBANK_CONFIG.bankName}</span>
        </div>

        <div className="flex justify-between items-center bg-[#FAF7F3] p-3 rounded-lg border border-[#E8DED5]">
          <div>
            <div className="text-xs text-[#6B625B]">Số tài khoản</div>
            <div className="font-bold text-[#543310] font-mono">{VIETCOMBANK_CONFIG.accountNo}</div>
          </div>
          <button 
            onClick={() => handleCopy(VIETCOMBANK_CONFIG.accountNo, 'số tài khoản')}
            className="text-[#6B625B] hover:text-[#543310] p-1"
          >
            <Copy size={18} />
          </button>
        </div>

        <div className="flex justify-between items-center bg-[#FAF7F3] p-3 rounded-lg border border-[#E8DED5]">
          <div>
            <div className="text-xs text-[#6B625B]">Chủ tài khoản</div>
            <div className="font-bold text-[#543310]">{VIETCOMBANK_CONFIG.accountName}</div>
          </div>
        </div>

        <div className="flex justify-between items-center bg-[#FAF7F3] p-3 rounded-lg border border-[#E8DED5]">
          <div className="overflow-hidden">
            <div className="text-xs text-[#6B625B]">Nội dung chuyển khoản</div>
            <div className="font-bold text-[#D67D3E] font-mono truncate">{content}</div>
          </div>
          <button 
            onClick={() => handleCopy(content, 'nội dung')}
            className="text-[#6B625B] hover:text-[#543310] shrink-0 p-1"
          >
            <Copy size={18} />
          </button>
        </div>

        <div className="flex justify-between items-center bg-[#FAF7F3] p-3 rounded-lg border border-[#E8DED5]">
          <span className="text-[#6B625B]">Số tiền:</span>
          <span className="font-bold text-[#D67D3E] text-lg">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}
          </span>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-[#6B625B] mb-4">
        Vui lòng giữ nguyên nội dung chuyển khoản để quán xác nhận chính xác.
      </div>

      <button 
        onClick={onSimulatePaymentSuccess}
        className="w-full py-3 bg-[#543310] text-white font-bold rounded-xl hover:bg-[#D67D3E] transition-colors shadow-md"
      >
        Tôi đã chuyển khoản thành công
      </button>
    </div>
  );
}

