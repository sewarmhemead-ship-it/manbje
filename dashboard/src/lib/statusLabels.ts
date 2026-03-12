/**
 * Arabic status labels and colors for badges (Design System).
 * Use with: background = color + 18 (e.g. rgba), color = STATUS_COLORS[key]
 */

export const APPOINTMENT_STATUS: Record<string, string> = {
  scheduled: 'مجدول',
  in_progress: 'جلسة نشطة',
  in_transit: 'في الطريق',
  completed: 'مكتمل',
  cancelled: 'ملغى',
  no_show: 'لم يحضر',
};

export const TRANSPORT_STATUS: Record<string, string> = {
  requested: 'طلب جديد',
  assigned: 'تم الإسناد',
  en_route: 'في الطريق',
  arrived_at_center: 'وصل المركز',
  completed: 'مكتمل',
  cancelled: 'ملغى',
};

export const STATUS_COLORS: Record<string, string> = {
  scheduled: '#22d3ee',
  in_progress: '#34d399',
  in_transit: '#fbbf24',
  en_route: '#fbbf24',
  completed: '#4b5875',
  cancelled: '#f87171',
  no_show: '#f87171',
  requested: '#f87171',
  assigned: '#fbbf24',
  arrived_at_center: '#34d399',
};

export function getStatusLabel(
  status: string,
  type: 'appointment' | 'transport' = 'appointment'
): string {
  const map = type === 'transport' ? TRANSPORT_STATUS : APPOINTMENT_STATUS;
  return map[status] ?? status;
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#4b5875';
}

/** Badge style: background color at 18% opacity, text color */
export function getStatusBadgeStyle(status: string): { background: string; color: string } {
  const color = getStatusColor(status);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return {
    background: `rgba(${r},${g},${b},0.18)`,
    color,
  };
}
