import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useT } from '../i18n/I18nProvider';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  icon?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, removeToast }) => {
  const t = useT();

  return (
    // A live region, so a milestone or a sync failure is announced rather than
    // only shown. `polite` waits for a pause instead of interrupting.
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none items-center w-full max-w-sm px-4"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto w-full bg-[#1C1916]/95 backdrop-blur-md border border-[#C9963F]/30 p-3 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex items-center gap-3"
            onClick={() => {
              removeToast(toast.id);
            }}
          >
            {toast.icon && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#C9963F]/10 flex items-center justify-center text-[#C9963F]">
                <span className="material-symbols-outlined" aria-hidden="true">{toast.icon}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-[#F4EFE6] font-mono-ibm font-bold text-[13px] tracking-wide uppercase truncate">
                {toast.title}
              </h4>
              {toast.description && (
                <p className="text-[#A79C8C] text-[12px] truncate mt-0.5">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              aria-label={t.common.close}
              className="flex-shrink-0 text-[#A79C8C] hover:text-[#F4EFE6] transition-colors p-1"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
