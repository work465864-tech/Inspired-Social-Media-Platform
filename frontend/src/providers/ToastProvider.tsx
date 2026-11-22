'use client';

import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type ToastVariant = 'error' | 'info' | 'success';

type ToastInput = {
  description?: string;
  title: string;
  variant: ToastVariant;
};

type ToastRecord = ToastInput & {
  id: number;
};

type ToastContextValue = (toast: ToastInput) => void;

const ToastContext = createContext<ToastContextValue | null>(null);
let nextToastId = 0;

const toastStyles: Record<ToastVariant, string> = {
  error: 'border-red-500/30 text-red-700 dark:text-red-200',
  info: 'border-primary/30 text-foreground',
  success: 'border-accent/30 text-foreground',
};

const toastIcons = {
  error: TriangleAlert,
  info: Info,
  success: CircleCheck,
};

type ToastItemProps = {
  onDismiss: (id: number) => void;
  toast: ToastRecord;
};

function ToastItem({ onDismiss, toast }: ToastItemProps) {
  const Icon = toastIcons[toast.variant];

  useEffect(() => {
    const timeout = window.setTimeout(() => onDismiss(toast.id), 5000);
    return () => window.clearTimeout(timeout);
  }, [onDismiss, toast.id]);

  return (
    <div
      className={`flex items-start gap-3 rounded-card border bg-surface/95 p-4 shadow-soft backdrop-blur-xl ${toastStyles[toast.variant]}`}
      role={toast.variant === 'error' ? 'alert' : 'status'}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-sm leading-5 text-muted">
            {toast.description}
          </p>
        )}
      </div>
      <button
        aria-label="Dismiss notification"
        className="rounded-full p-1 text-muted transition-colors hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-white/10"
        onClick={() => onDismiss(toast.id)}
        type="button"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}

type ToastProviderProps = {
  children: ReactNode;
};

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);
  const showToast = useCallback((toast: ToastInput) => {
    const record = { ...toast, id: ++nextToastId };
    setToasts((current) => [...current.slice(-3), record]);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] mx-auto grid w-[min(24rem,calc(100vw-2rem))] gap-3 px-1">
        {toasts.map((toast) => (
          <div className="pointer-events-auto" key={toast.id}>
            <ToastItem onDismiss={dismiss} toast={toast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const showToast = useContext(ToastContext);
  if (!showToast) {
    throw new Error('useToast must be used within a ToastProvider.');
  }
  return showToast;
}
