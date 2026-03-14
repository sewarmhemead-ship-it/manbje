interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div
      className="rounded-2xl border border-dashed p-10 text-center"
      style={{
        background: '#0b0f1a',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <span className="text-[32px] opacity-40" aria-hidden>
        {icon}
      </span>
      <p className="mt-3 text-[13px] font-bold" style={{ color: '#dde6f5' }}>
        {title}
      </p>
      {subtitle && (
        <p className="mt-1 text-[11px]" style={{ color: '#4b5875' }}>
          {subtitle}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
          style={{ background: '#22d3ee', color: '#06080e' }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
