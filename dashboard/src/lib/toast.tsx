import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  subtitle?: string;
  createdAt: number;
}

const TOAST_DURATION = 4000;

const typeConfig = {
  success: {
    icon: '✓',
    border: 'rgba(52,211,153,0.3)',
    iconBg: 'rgba(52,211,153,0.15)',
    barColor: '#34d399',
  },
  error: {
    icon: '✗',
    border: 'rgba(248,113,113,0.3)',
    iconBg: 'rgba(248,113,113,0.15)',
    barColor: '#f87171',
  },
  warning: {
    icon: '⚠️',
    border: 'rgba(251,191,36,0.3)',
    iconBg: 'rgba(251,191,36,0.15)',
    barColor: '#fbbf24',
  },
  info: {
    icon: 'ℹ️',
    border: 'rgba(34,211,238,0.3)',
    iconBg: 'rgba(34,211,238,0.15)',
    barColor: '#22d3ee',
  },
};

type ToastApi = {
  success: (title: string, subtitle?: string) => void;
  error: (title: string, subtitle?: string) => void;
  warning: (title: string, subtitle?: string) => void;
  info: (title: string, subtitle?: string) => void;
  (message: string): void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((type: ToastType, title: string, subtitle?: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, title, subtitle, createdAt: Date.now() }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const api: ToastApi = useCallback(
    (titleOrMessage: string, subtitle?: string) => {
      add('info', titleOrMessage, subtitle);
    },
    [add]
  ) as ToastApi;
  api.success = (title: string, subtitle?: string) => add('success', title, subtitle);
  api.error = (title: string, subtitle?: string) => add('error', title, subtitle);
  api.warning = (title: string, subtitle?: string) => add('warning', title, subtitle);
  api.info = (title: string, subtitle?: string) => add('info', title, subtitle);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2"
        style={{ direction: 'rtl' }}
      >
        {toasts.map((t) => (
          <ToastItemView
            key={t.id}
            item={t}
            onDismiss={() => remove(t.id)}
            duration={TOAST_DURATION}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItemView({
  item,
  onDismiss,
  duration,
}: {
  item: ToastItem;
  onDismiss: () => void;
  duration: number;
}) {
  const config = typeConfig[item.type];
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(p);
      if (p <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [duration, onDismiss]);

  return (
    <div
      className="min-w-[280px] max-w-sm overflow-hidden rounded-xl border shadow-lg"
      style={{
        background: '#0b0f1a',
        borderColor: config.border,
        animation: 'pageEnter 0.25s ease both',
      }}
    >
      <div className="flex items-start gap-3 p-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
          style={{ background: config.iconBg }}
        >
          {config.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold" style={{ color: '#dde6f5' }}>
            {item.title}
          </p>
          {item.subtitle && (
            <p className="mt-0.5 text-xs" style={{ color: '#4b5875' }}>
              {item.subtitle}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded p-1 text-[#4b5875] hover:bg-white/5 hover:text-[#dde6f5]"
          aria-label="إغلاق"
        >
          ×
        </button>
      </div>
      <div
        className="h-0.5 transition-all duration-75"
        style={{
          width: `${progress}%`,
          background: config.barColor,
        }}
      />
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  const noop = ((_msg: string) => {}) as ToastApi;
  noop.success = () => {};
  noop.error = () => {};
  noop.warning = () => {};
  noop.info = () => {};
  return ctx ?? noop;
}
