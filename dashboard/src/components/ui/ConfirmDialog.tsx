import { useEffect } from 'react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

const variantStyles = {
  danger: { button: 'rgba(248,113,113,0.2)', color: '#f87171' },
  warning: { button: 'rgba(251,191,36,0.2)', color: '#fbbf24' },
  default: { button: 'rgba(34,211,238,0.2)', color: '#22d3ee' },
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'تأكيد',
  confirmVariant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const style = variantStyles[confirmVariant];

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="w-full max-w-[360px] rounded-2xl p-5"
        style={{ background: '#101622', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h2 id="confirm-dialog-title" className="text-[14px] font-bold" style={{ color: '#dde6f5' }}>
          {title}
        </h2>
        <p className="mt-2 text-[11px]" style={{ color: '#4b5875' }}>
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: '#4b5875' }}
          >
            تراجع
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: style.button, color: style.color }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
