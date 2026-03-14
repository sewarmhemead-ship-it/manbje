import { getStatusLabel, getStatusColor } from '@/lib/statusLabels';

const ACTIVE_STATUSES = new Set(['in_progress', 'en_route', 'assigned', 'scheduled']);

interface StatusBadgeProps {
  status: string;
  type?: 'appointment' | 'transport';
  className?: string;
}

export function StatusBadge({ status, type = 'appointment', className = '' }: StatusBadgeProps) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status, type);
  const isActive = ACTIVE_STATUSES.has(status);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const bg = `rgba(${r},${g},${b},0.1)`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${className}`}
      style={{
        background: bg,
        color,
        fontFamily: "'Space Mono', monospace",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: color,
          animation: isActive ? 'pulse 2s infinite' : undefined,
        }}
        aria-hidden
      />
      {label}
    </span>
  );
}
