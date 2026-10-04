import { useState } from 'react';
import { Copy, Check, AlertTriangle, X } from 'lucide-react';

interface TemporaryCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffName: string;
  temporaryPassword?: string;
}

export function TemporaryCredentialModal({ isOpen, onClose, staffName, temporaryPassword }: TemporaryCredentialModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (temporaryPassword) {
      try {
        await navigator.clipboard.writeText(temporaryPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl border-t-4 border-[#D67D3E]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#FED8B1]/30">
          <div className="flex items-center gap-2 text-[#543310]">
            <AlertTriangle size={20} className="text-[#D67D3E]" />
            <h2 className="font-bold text-lg">
              Tạo tài khoản thành công!
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-[var(--color-brand-primary)] transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-700 mb-4 text-sm">
            Tài khoản cho nhân viên <strong className="text-[#543310]">{staffName}</strong> đã được tạo. Dưới đây là mật khẩu tạm thời.
          </p>

          <div className="bg-[#FED8B1]/20 border border-[#FED8B1] rounded-xl p-4 text-center mb-4">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Mật khẩu tạm thời</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl font-mono font-bold text-[#543310] select-all">
                {temporaryPassword || '******'}
              </span>
              {temporaryPassword && (
                <button 
                  onClick={handleCopy}
                  className="p-2 bg-white rounded-lg border border-[#FED8B1] text-[#D67D3E] hover:bg-[#FED8B1] hover:text-[#543310] transition-colors shadow-sm"
                  title="Copy mật khẩu"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              )}
            </div>
          </div>

          <div className="bg-red-50 p-3 rounded-xl border border-red-100 mb-6">
            <p className="text-sm text-red-800 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span><strong>Cảnh báo:</strong> Mật khẩu này chỉ được hiển thị <strong>MỘT LẦN DUY NHẤT</strong>. Hãy copy và gửi cho nhân viên trước khi đóng hộp thoại này.</span>
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="w-full px-5 py-2.5 bg-[#543310] text-white font-bold rounded-xl hover:bg-[#3d250c] transition-colors shadow-sm"
            >
              Tôi đã lưu mật khẩu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
