import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Truck,
  Wrench,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/appointments', label: 'Appointments', icon: Calendar, end: true },
  { to: '/patients', label: 'Patients', icon: Users, end: false },
  { to: '/transport', label: 'Transport', icon: Truck, end: true },
  { to: '/equipment', label: 'Equipment', icon: Wrench, end: true },
  { to: '/settings', label: 'Settings', icon: Settings, end: true },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-card/50 backdrop-blur-xl transition-all duration-300 max-lg:w-64 lg:w-64" aria-label="Sidebar">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <span className="text-lg font-bold text-primary">PT</span>
        </div>
        <span className="text-lg font-semibold tracking-tight">مركز العلاج</span>
      </div>
      <nav className="flex-1 space-y-0.5 p-4">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
