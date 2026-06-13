'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Styling ──────────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<ToastType, { bar: string; text: string; bg: string; border: string }> = {
  success: {
    bar:    'bg-emerald-500',
    text:   'text-emerald-700',
    bg:     'bg-emerald-50',
    border: 'border-emerald-200',
  },
  error: {
    bar:    'bg-red-500',
    text:   'text-red-700',
    bg:     'bg-red-50',
    border: 'border-red-200',
  },
  info: {
    bar:    'bg-navy-500',
    text:   'text-navy-900',
    bg:     'bg-white',
    border: 'border-navy-200',
  },
};

const TYPE_LABEL: Record<ToastType, string> = {
  success: 'Success',
  error:   'Error',
  info:    'Info',
};

// ─── Single Toast Item ────────────────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const styles = TYPE_STYLES[toast.type];
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), 4000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`relative flex items-start gap-3 border px-4 py-3 shadow-md min-w-[280px] max-w-xs ${styles.bg} ${styles.border}`}
      style={{ borderRadius: 0 }}
    >
      {/* Accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.bar}`} />

      <div className="flex-1 pl-2">
        <p className={`font-bold mb-0.5 ${styles.text}`} style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
          {TYPE_LABEL[toast.type]}
        </p>
        <p className="text-gray-700" style={{ fontSize: 13 }}>
          {toast.message}
        </p>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5 shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Portal-style fixed container */}
      <div
        aria-label="Notifications"
        className="fixed top-4 right-4 z-50 flex flex-col gap-3"
        style={{ pointerEvents: toasts.length ? 'auto' : 'none' }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }

  const { addToast } = ctx;

  return {
    success: useCallback((msg: string) => addToast(msg, 'success'), [addToast]),
    error:   useCallback((msg: string) => addToast(msg, 'error'),   [addToast]),
    info:    useCallback((msg: string) => addToast(msg, 'info'),     [addToast]),
    toast:   addToast,
  };
}
