'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AlertCircleIcon, ArrowUpRightIcon, CheckCircleIcon, CloseIcon, InfoIcon } from '@/components/Icons';

export type ToastVariant = 'pending' | 'success' | 'error';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Optional external link (e.g. the Basescan transaction page). */
  href?: string;
}

interface ToastRecord extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 5000;

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider.');
  }
  return context;
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastRecord;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss]);

  const variant = item.variant ?? 'pending';

  const shell =
    variant === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : variant === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-800'
        : 'border-blue-200 bg-blue-50 text-[#0a4d94]';
  const detailColor =
    variant === 'success' ? 'text-emerald-700' : variant === 'error' ? 'text-rose-700' : 'text-slate-600';
  const dismissColor =
    variant === 'success'
      ? 'text-emerald-600 hover:text-emerald-900'
      : variant === 'error'
        ? 'text-rose-600 hover:text-rose-900'
        : 'text-[#0a4d94] hover:text-slate-900';

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex w-full items-start gap-2.5 rounded-lg border p-3.5 text-xs shadow-lg ${shell}`}
    >
      {variant === 'success' ? (
        <CheckCircleIcon size={16} className="mt-0.5 shrink-0 text-emerald-600" />
      ) : variant === 'error' ? (
        <AlertCircleIcon size={16} className="mt-0.5 shrink-0 text-rose-600" />
      ) : (
        <InfoIcon size={16} className="mt-0.5 shrink-0" />
      )}
      {item.href ? (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          <p className="font-semibold">{item.title}</p>
          {item.description && (
            <p className={`mt-0.5 break-words leading-relaxed ${detailColor}`}>
              {item.description}
            </p>
          )}
          <span className="mt-1 inline-flex items-center gap-1 font-semibold underline underline-offset-2">
            View on Basescan
            <ArrowUpRightIcon size={10} />
          </span>
        </a>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{item.title}</p>
          {item.description && (
            <p className={`mt-0.5 break-words leading-relaxed ${detailColor}`}>
              {item.description}
            </p>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        className={`shrink-0 rounded p-0.5 transition-colors ${dismissColor}`}
      >
        <CloseIcon size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    setToasts((current) => [
      ...current.slice(-2),
      { ...options, variant: options.variant ?? 'pending', id: Date.now() + Math.random() },
    ]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-label="Notifications"
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
