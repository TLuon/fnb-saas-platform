import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertState {
  isOpen: boolean;
  title?: string;
  message: string;
  type: AlertType;
  onClose?: () => void;
}

interface ConfirmState {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ModalContextType {
  showAlert: (message: string, type?: AlertType, title?: string, onClose?: () => void) => void;
  showConfirm: (options: {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  const showAlert = useCallback(
    (message: string, type: AlertType = 'info', title?: string, onClose?: () => void) => {
      setAlertState({
        isOpen: true,
        title,
        message,
        type,
        onClose,
      });
    },
    []
  );

  const showConfirm = useCallback(
    (options: {
      title?: string;
      message: string;
      confirmLabel?: string;
      cancelLabel?: string;
      onConfirm: () => void;
      onCancel?: () => void;
    }) => {
      setConfirmState({
        isOpen: true,
        title: options.title || 'Xác nhận thao tác',
        message: options.message,
        confirmLabel: options.confirmLabel || 'Xác nhận',
        cancelLabel: options.cancelLabel || 'Hủy bỏ',
        onConfirm: options.onConfirm,
        onCancel: options.onCancel,
      });
    },
    []
  );

  const handleCloseAlert = () => {
    if (alertState.onClose) alertState.onClose();
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirmAction = () => {
    const fn = confirmState.onConfirm;
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
    if (fn) fn();
  };

  const handleCancelConfirm = () => {
    if (confirmState.onCancel) confirmState.onCancel();
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* Centered Custom Alert Modal */}
      {alertState.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#E8DED5] shadow-2xl p-6 w-full max-w-md text-center transform transition-all scale-100">
            <div className="flex justify-center mb-4">
              {alertState.type === 'success' && (
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                  <CheckCircle2 size={32} />
                </div>
              )}
              {alertState.type === 'error' && (
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                  <XCircle size={32} />
                </div>
              )}
              {alertState.type === 'warning' && (
                <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                  <AlertTriangle size={32} />
                </div>
              )}
              {alertState.type === 'info' && (
                <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center text-[#D67D3E]">
                  <Info size={32} />
                </div>
              )}
            </div>

            {alertState.title && (
              <h3 className="text-xl font-bold text-[#543310] mb-2">{alertState.title}</h3>
            )}
            <p className="text-sm font-medium text-[#6B625B] leading-relaxed mb-6">
              {alertState.message}
            </p>

            <button
              type="button"
              onClick={handleCloseAlert}
              className="w-full py-3 px-6 text-sm font-bold text-white bg-[#543310] hover:bg-[#D67D3E] rounded-xl shadow-md transition"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* Centered Custom Confirm Modal */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#E8DED5] shadow-2xl p-6 w-full max-w-md text-center transform transition-all scale-100">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center text-[#D67D3E]">
                <AlertTriangle size={32} />
              </div>
            </div>

            <h3 className="text-xl font-bold text-[#543310] mb-2">{confirmState.title}</h3>
            <p className="text-sm font-medium text-[#6B625B] leading-relaxed mb-6">
              {confirmState.message}
            </p>

            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={handleCancelConfirm}
                className="flex-1 py-2.5 px-4 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                {confirmState.cancelLabel}
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className="flex-1 py-2.5 px-4 text-sm font-bold text-white bg-[#D67D3E] hover:bg-[#b86428] rounded-xl shadow-md transition"
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
