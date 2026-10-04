'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showError: (msg: string) => void;
  showInfo: (msg: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const showError = useCallback((msg: string) => addToast(msg, 'error'), [addToast]);
  const showInfo = useCallback((msg: string) => addToast(msg, 'info'), [addToast]);

  return (
    <ToastContext.Provider value={{ showError, showInfo }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 transition-all">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-[#FAF7F3] font-medium animate-fade-in-up ${
              t.type === 'error' ? 'bg-[#D67D3E]' : 'bg-[#543310]'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
