import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastMessage } from '../components/Toast';

const TOAST_LIFETIME_MS = 6000;

export interface ToastApi {
  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, 'id'> & { id?: string }) => void;
  removeToast: (id: string) => void;
}

/**
 * The transient notification queue. Each toast retires itself after a while;
 * the timers are tracked so an unmount does not leave them running against a
 * dead component.
 */
export function useToasts(): ToastApi {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback<ToastApi['pushToast']>(
    (toast) => {
      const id = toast.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);

      const timer = setTimeout(() => {
        timers.current.delete(timer);
        removeToast(id);
      }, TOAST_LIFETIME_MS);
      timers.current.add(timer);
    },
    [removeToast]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  return { toasts, pushToast, removeToast };
}
