import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LogOut, Loader2, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPatch } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: { appointmentId?: string; invoiceId?: string; transportRequestId?: string };
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  admin: 'مدير النظام',
  doctor: 'طبيب',
  patient: 'مريض',
  driver: 'سائق',
};

export function TopBar() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    refreshUser().then(() => setMounted(true));
  }, [refreshUser]);

  const loadNotif = useCallback(async () => {
    if (!user) return;
    try {
      const [countRes, listRes] = await Promise.all([
        apiGet<{ count: number }>('/notifications/unread-count'),
        apiGet<Notification[]>('/notifications?limit=10'),
      ]);
      setUnreadCount(countRes?.count ?? 0);
      setNotifications(Array.isArray(listRes) ? listRes : []);
    } catch {
      setUnreadCount(0);
      setNotifications([]);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadNotif();
  }, [user, loadNotif]);

  const markReadAndGo = async (n: Notification) => {
    if (!n.isRead) {
      try {
        await apiPatch(`/notifications/${n.id}/read`, {});
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      } catch {
        // ignore
      }
    }
    setNotifOpen(false);
    if (n.metadata?.appointmentId) navigate(`/appointments`);
    else if (n.metadata?.invoiceId) navigate('/billing');
    else if (n.metadata?.transportRequestId) navigate('/transport');
    else if (n.type === 'payment_received') navigate('/billing');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-xl">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث عام..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn('h-10 pl-9 rounded-xl border-border bg-muted/50')}
        />
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-xl"
              title="الإشعارات"
              onClick={() => setNotifOpen((o) => !o)}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute left-0 top-full z-50 mt-1 w-80 max-h-[320px] overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
                  <div className="border-b border-border px-3 py-2 text-sm font-medium">الإشعارات</div>
                  {notifications.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">لا توجد إشعارات</p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        className={cn(
                          'w-full border-b border-border/50 px-3 py-2 text-right text-sm transition-colors hover:bg-muted/50',
                          !n.isRead && 'bg-primary/5',
                        )}
                        onClick={() => markReadAndGo(n)}
                      >
                        <p className="font-medium">{n.title}</p>
                        <p className="line-clamp-2 text-muted-foreground">{n.message}</p>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
        {!mounted ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : user ? (
          <>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">
                {user.nameAr ?? user.nameEn ?? user.email}
              </p>
              <p className="text-xs text-muted-foreground">
                {roleLabels[user.role] ?? user.role}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="rounded-xl"
              title="تسجيل الخروج"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </>
        ) : null}
      </div>
    </header>
  );
}
