import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Truck,
  Wrench,
  FileText,
  Bell,
  Pill,
  Settings,
  DollarSign,
  UserCog,
  Building2,
  Activity,
  HeartPulse,
  X,
  ScrollText,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const NAV_ITEMS: { to: string; labelKey: string; icon: typeof LayoutDashboard; end: boolean; permission: string | null; badgeKey?: string }[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true, permission: null },
  { to: '/doctor-portal', labelKey: 'nav.doctorPortal', icon: Activity, end: true, permission: 'doctor_portal' },
  { to: '/nurse-portal', labelKey: 'nav.nursePortal', icon: HeartPulse, end: true, permission: 'nurse_portal' },
  { to: '/receptionist', labelKey: 'nav.receptionist', icon: Building2, end: true, permission: 'receptionist_portal' },
  { to: '/appointments', labelKey: 'nav.appointments', icon: Calendar, end: true, permission: 'appointments_view' },
  { to: '/patients', labelKey: 'nav.patients', icon: Users, end: false, permission: 'patients_view' },
  { to: '/transport', labelKey: 'nav.transport', icon: Truck, end: true, permission: 'transport_view' },
  { to: '/equipment', labelKey: 'nav.equipment', icon: Wrench, end: true, permission: 'patients_view' },
  { to: '/reports', labelKey: 'nav.reports', icon: FileText, end: true, permission: 'reports_view' },
  { to: '/notifications', labelKey: 'nav.notifications', icon: Bell, end: true, badgeKey: 'notifications', permission: 'notifications_view' },
  { to: '/prescriptions', labelKey: 'nav.prescriptions', icon: Pill, end: true, permission: 'prescriptions_view' },
  { to: '/billing', labelKey: 'nav.billing', icon: DollarSign, end: true, permission: 'billing_view' },
  { to: '/users', labelKey: 'nav.users', icon: UserCog, end: true, permission: 'users_view' },
  { to: '/audit-log', labelKey: 'nav.auditLog', icon: ScrollText, end: true, permission: 'settings_view' },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings, end: true, permission: 'settings_view' },
];

export function Sidebar({
  mobileOpen = false,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
} = {}) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [failedCount, setFailedCount] = useState(0);
  const nav = NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission));
  useEffect(() => {
    apiGet<{ failed: number }>('/notifications/stats').then((s) => setFailedCount(s.failed ?? 0)).catch(() => {});
  }, []);

  const handleNavClick = (to: string, end: boolean) => {
    const path = location.pathname;
    const isCurrent = end && to === '/' ? path === '/' : path === to || (!end && path.startsWith(to));
    if (!isCurrent) navigate(to);
    onMobileClose?.();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="mobile-sidebar-overlay fixed inset-0 z-[35] max-lg:block lg:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r transition-all duration-300 max-lg:fixed max-lg:right-0 max-lg:left-auto max-lg:z-[60] max-lg:shadow-xl',
          !mobileOpen && 'max-lg:pointer-events-none max-lg:translate-x-full'
        )}
        style={{ background: '#0b0f1a', borderColor: 'rgba(255,255,255,0.06)' }}
        aria-label="Sidebar"
      >
      <div className="flex h-16 items-center justify-between gap-2 border-b px-6" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <span className="text-lg font-bold text-primary">PT</span>
          </div>
          <span className="text-lg font-semibold tracking-tight" style={{ color: '#dde6f5' }}>{t('common.appName')}</span>
        </div>
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="lg:hidden rounded-lg p-2 text-[#4b5875] hover:bg-white/5 hover:text-[#dde6f5]"
            aria-label={t('common.closeMenu')}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 p-4 overflow-y-auto">
        {nav.map(({ to, labelKey, icon: Icon, end, badgeKey }) => {
          const path = location.pathname;
          const isActive = end && to === '/' ? path === '/' : path === to || (!end && path.startsWith(to));
          return (
            <button
              key={to}
              type="button"
              onClick={() => handleNavClick(to, end ?? true)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 text-right',
                isActive && 'bg-[rgba(34,211,238,0.08)]'
              )}
              style={{ color: isActive ? '#22d3ee' : '#4b5875' }}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {t(labelKey)}
              {badgeKey === 'notifications' && failedCount > 0 && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500/90 px-1.5 text-xs font-bold text-white">
                  {failedCount > 99 ? '99+' : failedCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
    </>
  );
}
