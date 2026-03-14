import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, LogOut, Loader2 } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/lib/toast';

const BG = '#06080e';
const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';
const ACCENT = '#f87171';
const CYAN = '#22d3ee';
const GREEN = '#34d399';
const AMBER = '#fbbf24';
const RED = '#f87171';
const MUTED = '#4b5875';
const TEXT = '#dde6f5';

const CENTER_PHONE = import.meta.env.VITE_CENTER_PHONE ?? '+966500000000';
const CENTER_NAME = 'مركز العلاج الفيزيائي — المدخل الرئيسي';

type TabKey = 'current' | 'today' | 'history';

interface Trip {
  id: string;
  patientId?: string;
  status: string;
  pickupAddress?: string;
  pickupTime?: string;
  createdAt?: string;
  patient?: { nameAr?: string; user?: { nameAr?: string }; phone?: string; address?: string };
  vehicle?: { plateNumber?: string };
  driver?: { id: string; user?: { nameAr?: string }; vehicle?: { plateNumber?: string } };
  mobilityNeed?: string | null;
}

interface DriverProfile {
  id: string;
  isAvailable: boolean;
  vehicle?: { plateNumber?: string } | null;
  user?: { nameAr?: string };
}

const STATUS_LABEL: Record<string, string> = {
  requested: 'مطلوب',
  assigned: 'مسند',
  en_route: 'في الطريق',
  arrived_at_pickup: 'وصل للمريض',
  arrived_at_center: 'وصل المركز',
  completed: 'مكتمل',
  cancelled: 'ملغى',
};

const MOBILITY_LABEL: Record<string, { emoji: string; text: string }> = {
  wheelchair: { emoji: '🦽', text: 'كرسي متحرك' },
  stretcher: { emoji: '🛏️', text: 'نقالة' },
  walking: { emoji: '🦯', text: 'عكاز' },
};

function maskPhone(phone: string | undefined): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '+966 ···';
  return `+966 ${digits.slice(-4).padStart(2, '·').padStart(5, '·')}`;
}

export function DriverPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>('current');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const prevActiveCountRef = useRef(0);

  const load = useCallback(() => {
    apiGet<Trip[]>('/transport/requests')
      .then((data) => setTrips(Array.isArray(data) ? data : []))
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  }, []);

  const loadDriverProfile = useCallback(() => {
    apiGet<DriverProfile>('/transport/drivers/me')
      .then(setDriverProfile)
      .catch(() => setDriverProfile(null));
  }, []);

  useEffect(() => {
    load();
    loadDriverProfile();
  }, [load, loadDriverProfile]);

  useEffect(() => {
    const t = setInterval(() => {
      load();
      if (driverProfile) loadDriverProfile();
    }, 30_000);
    return () => clearInterval(t);
  }, [load, loadDriverProfile, driverProfile]);

  const activeTrips = trips.filter((t) => t.status === 'assigned' || t.status === 'en_route' || t.status === 'arrived_at_pickup');
  const currentTrip = activeTrips[0] ?? null;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTrips = trips.filter((t) => (t.createdAt ?? '').toString().startsWith(todayStr));
  const todayCompleted = todayTrips.filter((t) => t.status === 'completed' || t.status === 'arrived_at_center').length;
  const todayUpcoming = todayTrips.filter((t) => ['assigned', 'en_route', 'arrived_at_pickup'].includes(t.status)).length;

  useEffect(() => {
    if (prevActiveCountRef.current === 0 && activeTrips.length > 0) {
      setTab('current');
      toast('رحلة جديدة مسندة إليك!');
    }
    prevActiveCountRef.current = activeTrips.length;
  }, [activeTrips.length, toast]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiPatch(`/transport/requests/${id}/status`, { status });
      if (status === 'arrived_at_center') toast('تم تسجيل الوصول — شكراً!');
      else toast('تم تحديث الحالة');
      load();
    } catch {
      toast('فشل التحديث');
    }
  };

  const setAvailability = async (isAvailable: boolean) => {
    if (!driverProfile) return;
    try {
      await apiPatch(`/transport/drivers/${driverProfile.id}/availability`, { isAvailable });
      setDriverProfile((p) => (p ? { ...p, isAvailable } : null));
      loadDriverProfile();
    } catch {
      toast('فشل تحديث الحالة');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openMaps = (address: string) => {
    const q = encodeURIComponent(address);
    window.open(`https://maps.google.com/?q=${q}`, '_blank');
  };

  const openTel = (phone: string) => {
    const tel = phone.replace(/\D/g, '');
    window.open(`tel:${tel ? '+' + tel : ''}`, '_self');
  };

  return (
    <div className="min-h-screen" style={{ background: BG, fontFamily: 'Cairo, sans-serif', fontSize: 13 }}>
      <div className="mx-auto max-w-[480px] min-h-screen flex flex-col">
        {/* Header — no sidebar */}
        <header
          className="sticky top-0 z-20 flex flex-col gap-3 border-b px-4 py-3"
          style={{ background: SURFACE, borderColor: BORDER }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-7 w-7" style={{ color: ACCENT }} />
              <span className="font-bold text-[#dde6f5]">بوابة السائق</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#dde6f5]">{user?.nameAr ?? user?.email}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-[48px] items-center gap-1 rounded-xl border px-3 py-2 text-sm text-[#dde6f5] hover:bg-white/5"
                style={{ borderColor: BORDER }}
              >
                <LogOut className="h-4 w-4" /> خروج
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {driverProfile?.vehicle?.plateNumber && (
                <span
                  className="rounded-lg border px-2 py-1 font-mono text-xs"
                  style={{ borderColor: BORDER, color: MUTED, fontFamily: "'Space Mono', monospace" }}
                >
                  {driverProfile.vehicle.plateNumber}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setAvailability(!driverProfile?.isAvailable)}
              className="min-h-[44px] rounded-xl border px-4 py-2 text-sm font-medium"
              style={{
                borderColor: driverProfile?.isAvailable ? GREEN : RED,
                background: driverProfile?.isAvailable ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                color: driverProfile?.isAvailable ? GREEN : RED,
              }}
            >
              {driverProfile?.isAvailable ? 'متاح للرحلات 🟢' : 'غير متاح 🔴'}
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 border-b px-2 py-2" style={{ borderColor: BORDER, background: SURFACE }}>
          {[
            { key: 'current' as TabKey, label: 'الرحلة الجارية', icon: '🚐' },
            { key: 'today' as TabKey, label: 'رحلاتي اليوم', icon: '📋' },
            { key: 'history' as TabKey, label: 'السجل', icon: '📊' },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="min-h-[48px] flex-1 rounded-xl text-sm font-medium transition-all"
              style={{
                background: tab === key ? ACCENT : 'transparent',
                color: tab === key ? '#000' : MUTED,
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        <main className="flex-1 p-4">
          {tab === 'current' && (
            <TabCurrentTrip
              currentTrip={currentTrip}
              loading={loading}
              onUpdateStatus={updateStatus}
              onOpenMaps={openMaps}
              onOpenTel={openTel}
              centerPhone={CENTER_PHONE}
            />
          )}
          {tab === 'today' && (
            <TabTodayTrips
              todayTrips={todayTrips}
              loading={loading}
              todayCompleted={todayCompleted}
              todayUpcoming={todayUpcoming}
              expandedId={expandedId}
              onToggleExpand={setExpandedId}
            />
          )}
          {(tab === 'today' || tab === 'history') && activeTrips.length > 0 && (
          <div
            className="mx-4 mb-2 rounded-xl border px-4 py-3 text-center text-sm font-medium"
            style={{ background: 'rgba(248,113,113,0.15)', borderColor: RED, color: RED }}
          >
            رحلة جديدة مسندة إليك! — انتقل لتبويب الرحلة الجارية
          </div>
        )}
          {tab === 'history' && (
            <TabHistory
              trips={trips}
              loading={loading}
              filter={historyFilter}
              onFilterChange={setHistoryFilter}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function TabCurrentTrip({
  currentTrip,
  loading,
  onUpdateStatus,
  onOpenMaps,
  onOpenTel,
  centerPhone,
}: {
  currentTrip: Trip | null;
  loading: boolean;
  onUpdateStatus: (id: string, status: string) => void;
  onOpenMaps: (address: string) => void;
  onOpenTel: (phone: string) => void;
  centerPhone: string;
}) {
  if (loading && !currentTrip) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }
  if (!currentTrip) {
    return (
      <div className="rounded-2xl border p-8 text-center" style={{ background: SURFACE, borderColor: BORDER }}>
        <p className="text-lg font-medium" style={{ color: GREEN }}>✓ لا رحلات نشطة الآن</p>
        <p className="mt-2 text-sm" style={{ color: MUTED }}>ستظهر رحلتك القادمة هنا تلقائياً</p>
      </div>
    );
  }

  const patientName = currentTrip.patient?.nameAr ?? currentTrip.patient?.user?.nameAr ?? '—';
  const mobility = currentTrip.mobilityNeed ? MOBILITY_LABEL[currentTrip.mobilityNeed] : null;
  const pickupAddress = currentTrip.pickupAddress ?? '—';
  const phone = currentTrip.patient?.phone ?? '';
  const plate = currentTrip.vehicle?.plateNumber ?? '—';
  const pickupTimeStr = currentTrip.pickupTime
    ? new Date(currentTrip.pickupTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    : '—';
  const status = currentTrip.status;
  const tripShortId = currentTrip.id.slice(0, 6).toUpperCase();

  return (
    <div className="space-y-4">
      <p className="font-mono text-sm font-bold" style={{ color: ACCENT, fontFamily: "'Space Mono', monospace" }}>
        TRP#{tripShortId}
      </p>

      <div className="rounded-2xl border p-4" style={{ background: SURFACE, borderColor: BORDER }}>
        <p className="text-xl font-bold" style={{ color: TEXT }}>{patientName}</p>
        {mobility && (
          <span className="mt-2 inline-block rounded-lg bg-amber-500/20 px-2 py-1 text-sm text-amber-400">
            {mobility.emoji} {mobility.text}
          </span>
        )}
      </div>

      <div className="rounded-2xl border p-4" style={{ background: SURFACE, borderColor: BORDER }}>
        <p className="text-sm" style={{ color: MUTED }}>📍 عنوان الاستلام: {pickupAddress}</p>
        <p className="mt-2 text-sm" style={{ color: MUTED }}>🏥 الوجهة: {CENTER_NAME}</p>
        <button
          type="button"
          onClick={() => onOpenMaps(pickupAddress)}
          className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-xl border font-medium"
          style={{ borderColor: ACCENT, color: ACCENT }}
        >
          فتح خرائط Google
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border p-3" style={{ background: SURFACE, borderColor: BORDER }}>
          <p className="text-[10px]" style={{ color: MUTED }}>وقت الاستلام</p>
          <p className="font-mono text-sm" style={{ fontFamily: "'Space Mono', monospace", color: TEXT }}>{pickupTimeStr}</p>
        </div>
        <div className="rounded-xl border p-3" style={{ background: SURFACE, borderColor: BORDER }}>
          <p className="text-[10px]" style={{ color: MUTED }}>موعد المريض</p>
          <p className="font-mono text-sm" style={{ fontFamily: "'Space Mono', monospace", color: TEXT }}>{pickupTimeStr}</p>
        </div>
        <div className="rounded-xl border p-3" style={{ background: SURFACE, borderColor: BORDER }}>
          <p className="text-[10px]" style={{ color: MUTED }}>رقم التواصل</p>
          <p className="font-mono text-sm" style={{ fontFamily: "'Space Mono', monospace", color: TEXT }}>{maskPhone(phone)}</p>
          <button type="button" onClick={() => onOpenTel(phone)} className="mt-1 text-xs text-cyan-400 hover:underline">اتصال</button>
        </div>
        <div className="rounded-xl border p-3" style={{ background: SURFACE, borderColor: BORDER }}>
          <p className="text-[10px]" style={{ color: MUTED }}>رقم المركبة</p>
          <p className="font-mono text-sm" style={{ fontFamily: "'Space Mono', monospace", color: TEXT }}>{plate}</p>
        </div>
      </div>

      <div className="space-y-2">
        {status === 'assigned' && (
          <button
            type="button"
            onClick={() => onUpdateStatus(currentTrip.id, 'en_route')}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl font-bold"
            style={{ background: CYAN, color: '#000' }}
          >
            بدأت الرحلة — في الطريق
          </button>
        )}
        {status === 'en_route' && (
          <button
            type="button"
            onClick={() => onUpdateStatus(currentTrip.id, 'arrived_at_pickup')}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl font-bold"
            style={{ background: AMBER, color: '#000' }}
          >
            وصلت للمريض
          </button>
        )}
        {status === 'arrived_at_pickup' && (
          <button
            type="button"
            onClick={() => onUpdateStatus(currentTrip.id, 'arrived_at_center')}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl font-bold"
            style={{ background: GREEN, color: '#000' }}
          >
            وصلنا للمركز ✓
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => window.open(`tel:${centerPhone.replace(/\D/g, '')}`, '_self')}
        className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-white/20 text-sm text-[#dde6f5] hover:bg-white/5"
      >
        التواصل مع المركز
      </button>
    </div>
  );
}

function TabTodayTrips({
  todayTrips,
  loading,
  todayCompleted,
  todayUpcoming,
  expandedId,
  onToggleExpand,
}: {
  todayTrips: Trip[];
  loading: boolean;
  todayCompleted: number;
  todayUpcoming: number;
  expandedId: string | null;
  onToggleExpand: (id: string | null) => void;
}) {
  if (loading && todayTrips.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  const statusColor = (s: string) => {
    if (s === 'assigned') return AMBER;
    if (s === 'en_route') return CYAN;
    if (s === 'arrived_at_pickup') return '#3b82f6';
    if (s === 'arrived_at_center' || s === 'completed') return GREEN;
    if (s === 'cancelled') return RED;
    return MUTED;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border p-3" style={{ background: SURFACE, borderColor: BORDER, borderTop: `3px solid ${ACCENT}` }}>
          <p className="text-[10px]" style={{ color: MUTED }}>رحلاتي اليوم</p>
          <p className="font-mono text-xl font-bold" style={{ color: TEXT, fontFamily: "'Space Mono', monospace" }}>{todayTrips.length}</p>
        </div>
        <div className="rounded-xl border p-3" style={{ background: SURFACE, borderColor: BORDER, borderTop: `3px solid ${GREEN}` }}>
          <p className="text-[10px]" style={{ color: MUTED }}>مكتملة</p>
          <p className="font-mono text-xl font-bold" style={{ color: TEXT, fontFamily: "'Space Mono', monospace" }}>{todayCompleted}</p>
        </div>
        <div className="rounded-xl border p-3" style={{ background: SURFACE, borderColor: BORDER, borderTop: `3px solid ${AMBER}` }}>
          <p className="text-[10px]" style={{ color: MUTED }}>قادمة</p>
          <p className="font-mono text-xl font-bold" style={{ color: TEXT, fontFamily: "'Space Mono', monospace" }}>{todayUpcoming}</p>
        </div>
      </div>

      {todayTrips.length === 0 ? (
        <div className="rounded-2xl border py-12 text-center" style={{ background: SURFACE, borderColor: BORDER }}>
          <p style={{ color: MUTED }}>لا رحلات مسندة اليوم</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {todayTrips.map((t) => {
            const name = t.patient?.nameAr ?? t.patient?.user?.nameAr ?? '—';
            const mobility = t.mobilityNeed ? MOBILITY_LABEL[t.mobilityNeed]?.emoji ?? '' : '';
            const timeStr = t.pickupTime
              ? new Date(t.pickupTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
              : t.createdAt
                ? new Date(t.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
                : '—';
            const isExpanded = expandedId === t.id;
            const isEnRoute = t.status === 'en_route';
            const isAssigned = t.status === 'assigned';
            return (
              <li
                key={t.id}
                className="rounded-2xl border overflow-hidden"
                style={{ background: SURFACE, borderColor: BORDER }}
              >
                <button
                  type="button"
                  className="w-full px-4 py-3 text-right"
                  onClick={() => onToggleExpand(isExpanded ? null : t.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm" style={{ color: statusColor(t.status), fontFamily: "'Space Mono', monospace" }}>{timeStr}</span>
                    <span className="rounded px-2 py-0.5 text-xs" style={{ background: `${statusColor(t.status)}20`, color: statusColor(t.status) }}>
                      {isEnRoute && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
                      {isAssigned && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />}
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                  </div>
                  <p className="mt-1 font-medium" style={{ color: TEXT }}>{name} {mobility}</p>
                  <p className="text-xs" style={{ color: MUTED }}>{t.pickupAddress ?? '—'}</p>
                </button>
                {isExpanded && (
                  <div className="border-t px-4 py-3" style={{ borderColor: BORDER }}>
                    <p className="text-sm" style={{ color: MUTED }}>العنوان الكامل: {t.pickupAddress ?? '—'}</p>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(t.pickupAddress ?? '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 flex min-h-[44px] items-center justify-center rounded-xl border text-sm font-medium"
                      style={{ borderColor: ACCENT, color: ACCENT }}
                    >
                      فتح الخرائط
                    </a>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TabHistory({
  trips,
  loading,
  filter,
  onFilterChange,
}: {
  trips: Trip[];
  loading: boolean;
  filter: 'all' | 'completed' | 'cancelled';
  onFilterChange: (f: 'all' | 'completed' | 'cancelled') => void;
}) {
  const byMonth = trips.reduce<Record<string, Trip[]>>((acc, t) => {
    const created = t.createdAt ?? '';
    const month = created.slice(0, 7);
    if (!acc[month]) acc[month] = [];
    acc[month].push(t);
    return acc;
  }, {});
  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const thisMonthTrips = byMonth[thisMonthKey] ?? [];
  const completedThisMonth = thisMonthTrips.filter((t) => t.status === 'completed' || t.status === 'arrived_at_center').length;
  const totalThisMonth = thisMonthTrips.length;
  const completionRate = totalThisMonth ? Math.round((completedThisMonth / totalThisMonth) * 100) : 0;
  const delaysOrCancelled = thisMonthTrips.filter((t) => t.status === 'cancelled').length;
  const workingDays = Math.max(1, new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate());
  const avgPerDay = totalThisMonth ? (totalThisMonth / Math.min(new Date().getDate(), workingDays)).toFixed(1) : '0';
  const uniquePatients = new Set(thisMonthTrips.map((t) => t.patientId ?? t.patient?.nameAr).filter(Boolean)).size;

  const filtered = trips.filter((t) => {
    if (filter === 'completed') return t.status === 'completed' || t.status === 'arrived_at_center';
    if (filter === 'cancelled') return t.status === 'cancelled';
    return true;
  });
  const recent = filtered.slice(0, 20);

  const rateColor = completionRate >= 90 ? GREEN : completionRate >= 70 ? AMBER : RED;

  if (loading && trips.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border p-3" style={{ background: SURFACE, borderColor: BORDER, borderTop: `3px solid ${ACCENT}` }}>
          <p className="text-[10px]" style={{ color: MUTED }}>رحلة هذا الشهر</p>
          <p className="font-mono text-xl font-bold" style={{ color: TEXT, fontFamily: "'Space Mono', monospace" }}>{totalThisMonth}</p>
        </div>
        <div className="rounded-xl border p-3" style={{ background: SURFACE, borderColor: BORDER, borderTop: `3px solid ${rateColor}` }}>
          <p className="text-[10px]" style={{ color: MUTED }}>معدل الإكمال %</p>
          <p className="font-mono text-xl font-bold" style={{ color: rateColor, fontFamily: "'Space Mono', monospace" }}>{completionRate}%</p>
        </div>
        <div className="rounded-xl border p-3" style={{ background: SURFACE, borderColor: BORDER, borderTop: `3px solid ${MUTED}` }}>
          <p className="text-[10px]" style={{ color: MUTED }}>تأخيرات</p>
          <p className="font-mono text-xl font-bold" style={{ color: TEXT, fontFamily: "'Space Mono', monospace" }}>{delaysOrCancelled}</p>
        </div>
      </div>

      <div className="rounded-2xl border p-4" style={{ background: SURFACE, borderColor: BORDER }}>
        <p className="text-sm font-medium" style={{ color: TEXT }}>ملخص الأداء</p>
        <p className="mt-2 text-sm" style={{ color: MUTED }}>معدل الإكمال: <span style={{ color: rateColor }}>{completionRate}%</span></p>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>متوسط رحلات يومياً: {avgPerDay}</p>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>مجموع المرضى المخدومين: {uniquePatients}</p>
      </div>

      <div className="flex gap-2">
        {(['all', 'completed', 'cancelled'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFilterChange(f)}
            className="min-h-[44px] rounded-xl border px-3 py-2 text-sm"
            style={{
              borderColor: filter === f ? ACCENT : BORDER,
              background: filter === f ? `${ACCENT}20` : SURFACE,
              color: filter === f ? ACCENT : MUTED,
            }}
          >
            {f === 'all' ? 'الكل' : f === 'completed' ? 'مكتمل' : 'ملغى'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium" style={{ color: MUTED }}>آخر الرحلات</p>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: MUTED }}>لا توجد رحلات</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((t) => {
              const name = t.patient?.nameAr ?? t.patient?.user?.nameAr ?? '—';
              const dateStr = t.createdAt ? new Date(t.createdAt).toLocaleDateString('ar-SA') : '—';
              const route = `${t.pickupAddress ?? '—'} → ${CENTER_NAME}`;
              return (
                <li key={t.id} className="rounded-xl border p-3" style={{ background: SURFACE, borderColor: BORDER }}>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: MUTED }}>{dateStr}</span>
                    <span className="rounded px-2 py-0.5 text-xs" style={{
                      background: t.status === 'cancelled' ? `${RED}20` : t.status === 'completed' || t.status === 'arrived_at_center' ? `${GREEN}20` : `${MUTED}20`,
                      color: t.status === 'cancelled' ? RED : t.status === 'completed' || t.status === 'arrived_at_center' ? GREEN : MUTED,
                    }}>
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                  </div>
                  <p className="mt-1 font-medium" style={{ color: TEXT }}>{name}</p>
                  <p className="mt-0.5 truncate text-xs" style={{ color: MUTED }}>{route}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
