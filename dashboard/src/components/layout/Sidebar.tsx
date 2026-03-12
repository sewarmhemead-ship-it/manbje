import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Truck,
  Wrench,
  FileText,
  Bell,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';

const nav = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard, end: true },
  { to: '/appointments', label: 'المواعيد', icon: Calendar, end: true },
  { to: '/patients', label: 'المرضى', icon: Users, end: false },
  { to: '/transport', label: 'النقل', icon: Truck, end: true },
  { to: '/equipment', label: 'الأجهزة', icon: Wrench, end: true },
  { to: '/reports', label: 'التقارير', icon: FileText, end: true },
  { to: '/notifications', label: 'الإشعارات', icon: Bell, end: true, badgeKey: 'notifications' },
  { to: '/settings', label: 'الإعدادات', icon: Settings, end: true },
];

export function Sidebar() {
  const [failedCount, setFailedCount] = useState(0);
  useEffect(() => {
    apiGet<{ failed: number }>('/notifications/stats').then((s) => setFailedCount(s.failed ?? 0)).catch(() => {});
  }, []);

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r transition-all duration-300 max-lg:w-64 lg:w-64"
      style={{ background: '#0b0f1a', borderColor: 'rgba(255,255,255,0.06)' }}
      aria-label="Sidebar"
    >
      <div className="flex h-16 items-center gap-2 border-b px-6" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <span className="text-lg font-bold text-primary">PT</span>
        </div>
        <span className="text-lg font-semibold tracking-tight" style={{ color: '#dde6f5' }}>مركز العلاج</span>
      </div>
      <nav className="flex-1 space-y-0.5 p-4">
        {nav.map(({ to, label, icon: Icon, end, badgeKey }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                isActive && 'bg-[rgba(34,211,238,0.08)]'
              )
            }
            style={({ isActive }) => ({
              color: isActive ? '#22d3ee' : '#4b5875',
            })}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
            {badgeKey === 'notifications' && failedCount > 0 && (
              <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500/90 px-1.5 text-xs font-bold text-white">
                {failedCount > 99 ? '99+' : failedCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
