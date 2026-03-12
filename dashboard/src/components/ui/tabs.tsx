import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Tabs({
  value,
  onValueChange,
  tabs,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  tabs: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn('flex gap-1 rounded-xl bg-[#0b0f1a] p-1', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onValueChange(t.value)}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-all',
            value === t.value
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ value, current, children }: { value: string; current: string; children: ReactNode }) {
  if (value !== current) return null;
  return <div className="mt-6">{children}</div>;
}
