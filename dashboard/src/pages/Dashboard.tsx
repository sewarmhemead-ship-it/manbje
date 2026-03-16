import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Truck,
  Activity,
  DollarSign,
  UserPlus,
  CalendarPlus,
  Car,
  FileImage,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/api';
import type { Appointment } from '@/lib/api';
import { getTransportRequests } from '@/lib/api-dashboard';
import { MOCK_APPOINTMENTS, MOCK_DASHBOARD_STATS, isDemoMode } from '@/lib/mock-data';
import { SkeletonKPI, SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/components/ui/StatusBadge';

const BG = '#06080e';
const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';
const CYAN = '#22d3ee';
const GREEN = '#34d399';
const AMBER = '#fbbf24';
const RED = '#f87171';
const PURPLE = '#a78bfa';
const MUTED = '#4b5875';
const TEXT = '#dde6f5';

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};
const todayEnd = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};
const yesterdayStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};
const yesterdayEnd = () => {
  const d = new Date();
  d.setDate(d.getDate());
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

interface ReportStatsDay {
  totalAppointments?: number;
  attendanceRate?: number;
  activePatients?: number;
  completedSessions?: number;
  transportTotal?: number;
  transportCompleted?: number;
  transportCancelled?: number;
  avgRecovery?: number | null;
  last7Days?: { date: string; completed: number; in_progress: number; cancelled: number; scheduled?: number }[];
}

export function Dashboard() {
  const { t } = useTranslation();
  const { user, isRole } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isRole('admin');
  const isDoctor = isRole('doctor');
  const isReceptionist = isRole('receptionist');
  const isNurse = isRole('nurse');
  const alertsRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    inTransit: 0,
    activeSessions: 0,
    weeklyRevenue: 0,
  });
  const [liveAppointments, setLiveAppointments] = useState<Appointment[]>([]);
  const [lastUpdateSeconds, setLastUpdateSeconds] = useState(0);

  // Admin-only state
  const [adminStatsToday, setAdminStatsToday] = useState<ReportStatsDay | null>(null);
  const [adminStatsYesterday, setAdminStatsYesterday] = useState<ReportStatsDay | null>(null);
  const [adminStatsLastMonth, setAdminStatsLastMonth] = useState<ReportStatsDay | null>(null);
  const [adminPatientsCount, setAdminPatientsCount] = useState(0);
  const [adminPatientsNewThisMonth, setAdminPatientsNewThisMonth] = useState(0);
  const [adminAppointmentsToday, setAdminAppointmentsToday] = useState<Appointment[]>([]);
  const [adminTransportRequests, setAdminTransportRequests] = useState<{ id: string; status: string; createdAt?: string; patient?: { nameAr?: string } }[]>([]);
  const [adminOverdueInvoices, setAdminOverdueInvoices] = useState<{ id: string; patient?: { nameAr?: string }; dueDate?: string; status?: string }[]>([]);
  const [adminPrescriptionStats, setAdminPrescriptionStats] = useState<{ interactionWarnings?: number } | null>(null);
  const [adminDoctorsPresent, setAdminDoctorsPresent] = useState({ active: 0, total: 0 });
  const [adminRooms, setAdminRooms] = useState({ occupied: 0, total: 0 });
  const [adminVehicles, setAdminVehicles] = useState({ active: 0, total: 0 });
  const [adminLast7DaysCounts, setAdminLast7DaysCounts] = useState<number[]>([]);
  const [adminSessionsByDay, setAdminSessionsByDay] = useState<{ date: string; count: number }[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminNewPatientsToday, setAdminNewPatientsToday] = useState(0);
  const [clock, setClock] = useState(() => new Date());

  const load = useCallback(async () => {
    if (isDemoMode()) {
      setStats(MOCK_DASHBOARD_STATS);
      setLiveAppointments(MOCK_APPOINTMENTS as Appointment[]);
      setLoading(false);
      return;
    }
    setLoadError(false);
    try {
      const doctorId = isAdmin ? undefined : user?.id;
      const start = todayStart();
      const end = todayEnd();
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEndStr = weekEnd.toISOString().slice(0, 10);
      const [appointmentsRes, transportRes, billingStatsRes] = await Promise.all([
        doctorId
          ? apiGet<Appointment[]>(
              `/appointments/doctor/${doctorId}?startDate=${start}&endDate=${end}`
            )
          : apiGet<Appointment[]>(`/appointments?startDate=${start}&endDate=${end}`).catch(() => []),
        getTransportRequests(),
        isAdmin
          ? apiGet<{ totalRevenue: number; totalPaid: number; totalPending: number }>(
              `/billing/stats?startDate=${start}&endDate=${weekEndStr}`
            ).catch(() => ({ totalRevenue: 0, totalPaid: 0, totalPending: 0 }))
          : Promise.resolve({ totalRevenue: 0, totalPaid: 0, totalPending: 0 }),
      ]);
      const appointments = Array.isArray(appointmentsRes) ? appointmentsRes : [];
      const inTransit = Array.isArray(transportRes)
        ? transportRes.filter(
            (r: unknown) =>
              (r as { status?: string }).status === 'en_route' ||
              (r as { status?: string }).status === 'assigned'
          ).length
        : 0;
      const activeSessions = appointments.filter(
        (a) => a.status === 'in_progress'
      ).length;
      const weeklyRevenue = (billingStatsRes as { totalPaid?: number })?.totalPaid ?? 0;
      setStats({
        todayAppointments: appointments.length,
        inTransit,
        activeSessions,
        weeklyRevenue,
      });
      setLiveAppointments(appointments);
    } catch {
      setLiveAppointments([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role, isAdmin]);

  const loadAdminData = useCallback(async () => {
    if (!isAdmin || isDemoMode()) return;
    setAdminLoading(true);
    const start = todayStart();
    const end = todayEnd();
    const yStart = yesterdayStart();
    const yEnd = yesterdayEnd();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartStr = monthStart.toISOString().slice(0, 10);
    const lastMonthEnd = new Date(monthStart);
    lastMonthEnd.setDate(0);
    const lastMonthStart = new Date(lastMonthEnd);
    lastMonthStart.setDate(1);
    const lastMonthStartStr = lastMonthStart.toISOString().slice(0, 10);
    const lastMonthEndStr = lastMonthEnd.toISOString().slice(0, 10);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
    const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().slice(0, 10);
    try {
      const [
        statsTodayRes,
        statsYesterdayRes,
        statsLastMonthRes,
        statsLast7Res,
        sessionsByDayRes,
        patientsRes,
        appointmentsRes,
        transportRes,
        overdueRes,
        prescriptionStatsRes,
        usersRes,
        roomsRes,
        vehiclesRes,
      ] = await Promise.all([
        apiGet<ReportStatsDay>(`/reports/stats?startDate=${start}&endDate=${end}`).catch(() => null),
        apiGet<ReportStatsDay>(`/reports/stats?startDate=${yStart}&endDate=${yEnd}`).catch(() => null),
        apiGet<ReportStatsDay>(`/reports/stats?startDate=${lastMonthStartStr}&endDate=${lastMonthEndStr}`).catch(() => null),
        apiGet<ReportStatsDay>(`/reports/stats?startDate=${sevenDaysAgoStr}&endDate=${end}`).catch(() => null),
        apiGet<{ date: string; count: number }[]>(`/reports/sessions-by-day?startDate=${fourteenDaysAgoStr}&endDate=${end}`).catch(() => []),
        apiGet<{ id: string; createdAt?: string }[]>(`/patients`).catch(() => []),
        apiGet<Appointment[]>(`/appointments?startDate=${start}&endDate=${end}`).catch(() => []),
        apiGet<{ id: string; status: string; createdAt?: string; patient?: { nameAr?: string } }[]>(`/transport/requests`).catch(() => []),
        apiGet<{ id: string; patient?: { nameAr?: string }; dueDate?: string; status?: string }[]>(`/billing/invoices?status=overdue`).catch(() => []),
        apiGet<{ interactionWarnings?: number }>(`/prescriptions/stats`).catch(() => ({ interactionWarnings: 0 })),
        apiGet<{ id: string; isActive?: boolean }[]>(`/users?role=doctor`).catch(() => []),
        apiGet<{ id: string }[]>(`/rooms`).catch(() => []),
        apiGet<{ id: string; status?: string }[]>(`/transport/vehicles`).catch(() => []),
      ]);
      setAdminStatsToday(statsTodayRes ?? null);
      setAdminStatsYesterday(statsYesterdayRes ?? null);
      setAdminStatsLastMonth(statsLastMonthRes ?? null);
      const patients = Array.isArray(patientsRes) ? patientsRes : [];
      setAdminPatientsCount(patients.length);
      const todayStr = start;
      setAdminPatientsNewThisMonth(
        patients.filter((p) => {
          const created = p.createdAt ? p.createdAt.slice(0, 10) : '';
          return created >= monthStartStr && created <= end;
        }).length
      );
      setAdminNewPatientsToday(patients.filter((p) => p.createdAt && p.createdAt.startsWith(todayStr)).length);
      const appts = Array.isArray(appointmentsRes) ? appointmentsRes : [];
      setAdminAppointmentsToday(appts);
      const transport = Array.isArray(transportRes) ? transportRes : [];
      setAdminTransportRequests(transport);
      setAdminOverdueInvoices(Array.isArray(overdueRes) ? overdueRes : []);
      setAdminPrescriptionStats(prescriptionStatsRes ?? null);
      const users = Array.isArray(usersRes) ? usersRes : [];
      setAdminDoctorsPresent({
        total: users.length,
        active: users.filter((u: { isActive?: boolean }) => u.isActive !== false).length,
      });
      const rooms = Array.isArray(roomsRes) ? roomsRes : [];
      const inProgressRoomIds = new Set(
        appts.filter((a) => a.status === 'in_progress').map((a) => a.roomId).filter(Boolean) as string[]
      );
      setAdminRooms({ total: rooms.length, occupied: inProgressRoomIds.size });
      const vehicles = Array.isArray(vehiclesRes) ? vehiclesRes : [];
      const enRouteCount = transport.filter((r) => r.status === 'en_route' || r.status === 'assigned').length;
      setAdminVehicles({ total: vehicles.length, active: Math.min(enRouteCount, vehicles.length) });
      if (statsLast7Res?.last7Days?.length) {
        setAdminLast7DaysCounts(
          statsLast7Res.last7Days.map(
            (d) => (d.completed ?? 0) + (d.in_progress ?? 0) + (d.cancelled ?? 0) + (d.scheduled ?? 0)
          )
        );
      } else {
        setAdminLast7DaysCounts([]);
      }
      setAdminSessionsByDay(Array.isArray(sessionsByDayRes) ? sessionsByDayRes : []);
    } catch {
      // keep previous state
    } finally {
      setAdminLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isAdmin) loadAdminData();
  }, [isAdmin, loadAdminData]);

  useEffect(() => {
    const interval = setInterval(() => {
      load();
      if (isAdmin) {
        loadAdminData();
        setLastUpdateSeconds(0);
      }
    }, isAdmin ? 60_000 : 30_000);
    return () => clearInterval(interval);
  }, [load, isAdmin, loadAdminData]);

  useEffect(() => {
    const t = setInterval(() => setLastUpdateSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const min = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(min);
  }, []);

  const scrollToAlerts = () => alertsRef.current?.scrollIntoView({ behavior: 'smooth' });

  if (loading && !isAdmin && !loadError) {
    return (
      <div className="space-y-6" style={{ background: BG }}>
        <SkeletonKPI count={4} />
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (loadError && !isAdmin) {
    return (
      <div className="space-y-6" style={{ background: BG }}>
        <h1 className="text-3xl font-bold tracking-tight" style={textMain}>{t('dashboard.title')}</h1>
        <ErrorState
          title={t('dashboard.errorLoading')}
          onRetry={() => { setLoading(true); load(); }}
          retryLabel={t('dashboard.retry')}
        />
      </div>
    );
  }

  const cardStyle = { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16 };
  const textMuted = { color: MUTED };
  const textMain = { color: TEXT };

  if (isAdmin) {
    const todayStats = adminStatsToday as { totalAppointments?: number; attendanceRate?: number; transportTotal?: number; avgRecovery?: number | null } | null;
    const yesterdayStats = adminStatsYesterday as { totalAppointments?: number; attendanceRate?: number } | null;
    const lastMonthStats = adminStatsLastMonth as { totalAppointments?: number; attendanceRate?: number; avgRecovery?: number | null } | null;
    const totalToday = todayStats?.totalAppointments ?? 0;
    const totalYesterday = yesterdayStats?.totalAppointments ?? 0;
    const diffAppts = totalToday - totalYesterday;
    const attendanceToday = todayStats?.attendanceRate ?? 0;
    const attendanceLastMonth = lastMonthStats?.attendanceRate ?? 0;
    const attendanceTrend = attendanceLastMonth ? Math.round(((attendanceToday - attendanceLastMonth) / attendanceLastMonth) * 100) : 0;
    const enRouteCount = adminTransportRequests.filter((r) => r.status === 'en_route' || r.status === 'assigned').length;
    const pendingTransport = adminTransportRequests.filter((r) => r.status === 'pending').length;
    const newTodayCount = adminNewPatientsToday;
    const alertCount =
      adminOverdueInvoices.length +
      (pendingTransport > 0 ? 1 : 0) +
      (newTodayCount > 0 ? 1 : 0) +
      ((adminPrescriptionStats?.interactionWarnings ?? 0) > 0 ? 1 : 0);
    const avgRecovery = todayStats?.avgRecovery ?? null;
    const avgRecoveryLastMonth = lastMonthStats?.avgRecovery ?? null;
    const recoveryTrend = avgRecovery != null && avgRecoveryLastMonth != null && avgRecoveryLastMonth > 0
      ? Math.round(((avgRecovery - avgRecoveryLastMonth) / avgRecoveryLastMonth) * 100)
      : 0;
    const sparkData = adminLast7DaysCounts.length >= 7 ? adminLast7DaysCounts : [0, 0, 0, 0, 0, 0, 0];

return (
    <div className="page-enter space-y-6 transition-opacity duration-300" style={{ background: BG, minHeight: '100vh' }}>
        {/* Live Header — Admin only */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-4 py-3" style={{ background: SURFACE, borderColor: BORDER }}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm font-medium" style={{ color: TEXT }}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              مباشر
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-lg font-medium" style={{ color: TEXT }}>👑 لوحة المدير</span>
            <span className="font-mono text-sm" style={{ color: MUTED, fontFamily: "'Space Mono', monospace" }}>
              {clock.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {' — '}
              {clock.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </header>
        <p className="text-xs" style={textMuted}>
          آخر تحديث: منذ {lastUpdateSeconds} ثانية
          <button type="button" onClick={() => { load(); loadAdminData(); setLastUpdateSeconds(0); }} className="mr-2 inline-flex items-center gap-1 rounded p-1 hover:bg-white/5" title="تحديث">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </p>

        {/* KPI Cards — 3×2 grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AdminKPICard
            label="موعد اليوم"
            value={totalToday}
            trend={diffAppts !== 0 ? `${diffAppts > 0 ? '↑' : '↓'} ${Math.abs(diffAppts)} عن أمس` : '← لا تغيير'}
            trendUp={diffAppts > 0}
            trendNeutral={diffAppts === 0}
            accent={CYAN}
            icon="📅"
            sparkData={sparkData}
          />
          <AdminKPICard
            label="معدل الحضور"
            value={`${attendanceToday}%`}
            trend={attendanceTrend !== 0 ? `عن الشهر الماضي: ${attendanceTrend > 0 ? '↑' : '↓'} ${Math.abs(attendanceTrend)}%` : undefined}
            trendUp={attendanceTrend > 0}
            accent={GREEN}
            icon="✅"
            sparkData={[]}
          />
          <AdminKPICard
            label="رحلات النقل"
            value={todayStats?.transportTotal ?? 0}
            subStat={enRouteCount > 0 ? `${enRouteCount} جارية الآن` : undefined}
            accent={AMBER}
            icon="🚐"
            sparkData={[]}
          />
          <AdminKPICard
            label="إجمالي المرضى"
            value={adminPatientsCount}
            trend={adminPatientsNewThisMonth > 0 ? `+${adminPatientsNewThisMonth} جديد هذا الشهر` : undefined}
            trendUp={true}
            accent={PURPLE}
            icon="👥"
            sparkData={[]}
          />
          <AdminKPICard
            label="متوسط التعافي"
            value={avgRecovery != null ? `${avgRecovery}%` : '—'}
            trend={recoveryTrend !== 0 ? `عن الشهر الماضي: ${recoveryTrend > 0 ? '↑' : '↓'} ${Math.abs(recoveryTrend)}%` : undefined}
            trendUp={recoveryTrend > 0}
            accent={avgRecovery == null ? MUTED : avgRecovery > 70 ? GREEN : avgRecovery >= 40 ? AMBER : RED}
            icon="📈"
            sparkData={[]}
          />
          <div
            role="button"
            tabIndex={0}
            onClick={scrollToAlerts}
            onKeyDown={(e) => e.key === 'Enter' && scrollToAlerts()}
            className="cursor-pointer overflow-hidden rounded-xl border p-4 transition-all duration-200 hover:border-cyan-500/30"
            style={{ ...cardStyle, borderTop: `2px solid ${alertCount > 0 ? RED : MUTED}` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium" style={textMuted}>تنبيهات</span>
              {alertCount > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
              )}
            </div>
            <p className="mt-1 text-2xl font-bold font-mono" style={{ color: alertCount > 0 ? RED : TEXT, fontFamily: "'Space Mono', monospace" }}>
              {alertCount}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'موعد جديد', icon: '📅', path: '/appointments', query: '?new=1' },
            { label: 'إضافة مريض', icon: '👤', path: '/patients', query: '?new=1' },
            { label: 'طلب نقل', icon: '🚐', path: '/transport', query: '' },
            { label: 'التقارير', icon: '📊', path: '/reports', query: '' },
          ].map(({ label, icon, path, query }) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path + query)}
              className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all duration-200 hover:border-cyan-500/50"
              style={{ background: SURFACE, borderColor: BORDER }}
            >
              <span className="text-xl">{icon}</span>
              <span className="text-[9px] font-medium" style={textMuted}>{label}</span>
            </button>
          ))}
        </div>

        {/* Sessions by day chart */}
        <Card style={cardStyle}>
          <CardHeader>
            <CardTitle className="text-sm font-medium" style={textMain}>{t('dashboard.sessionsChart')}</CardTitle>
          </CardHeader>
          <CardContent>
            <SessionsByDayChart data={adminSessionsByDay} accent={CYAN} />
          </CardContent>
        </Card>

        {/* Main 2-column */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left — مواعيد الآن */}
          <Card style={cardStyle}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium" style={textMain}>{t('dashboard.appointmentsNow')}</CardTitle>
              <button type="button" onClick={() => navigate('/appointments')} className="text-xs text-cyan-400 hover:underline">
                {t('dashboard.viewAll')}
              </button>
            </CardHeader>
            <CardContent>
              {adminLoading && adminAppointmentsToday.length === 0 ? (
                <div className="space-y-2 py-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : (
                (() => {
                  const sorted = [...(adminAppointmentsToday || [])].sort(
                    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                  ).slice(0, 5);
                  return sorted.length === 0 ? (
                    <EmptyState icon="📅" title={t('dashboard.noAppointmentsToday')} />
                  ) : (
                    <ul className="space-y-2">
                      {sorted.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center gap-3 rounded-lg border py-2 px-3"
                          style={{ borderColor: BORDER }}
                        >
                          <Avatar name={a.patient?.nameAr ?? '؟'} size={36} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium" style={textMain}>{a.patient?.nameAr ?? a.patientId}</p>
                            <p className="font-mono text-xs" style={{ color: MUTED, fontFamily: "'Space Mono', monospace" }}>
                              {new Date(a.startTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                              {' · '}
                              {a.doctor?.nameAr ?? '—'}
                            </p>
                          </div>
                          <StatusBadge status={a.status} type="appointment" className="shrink-0" />
                        </li>
                      ))}
                    </ul>
                  );
                })()
              )}
            </CardContent>
          </Card>

          {/* Right — تنبيهات المدير */}
          <div ref={alertsRef}>
            <Card style={cardStyle}>
              <CardHeader>
                <CardTitle className="text-sm font-medium" style={textMain}>تنبيهات المدير</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminAlerts
                overdueInvoices={adminOverdueInvoices}
                pendingTransportCount={pendingTransport}
                newPatientsTodayCount={newTodayCount}
                interactionWarnings={adminPrescriptionStats?.interactionWarnings ?? 0}
                onNavigateTransport={() => navigate('/transport')}
                onNavigatePrescriptions={() => navigate('/prescriptions')}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Stats Bar */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border p-3" style={{ background: SURFACE, borderColor: BORDER }}>
            <p className="text-[10px] font-medium" style={textMuted}>أطباء حاضرون</p>
            <p className="mt-1 font-mono text-lg font-bold" style={{ color: TEXT, fontFamily: "'Space Mono', monospace" }}>
              {adminDoctorsPresent.active}/{adminDoctorsPresent.total}
            </p>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: adminDoctorsPresent.total ? `${(adminDoctorsPresent.active / adminDoctorsPresent.total) * 100}%` : 0 }} />
            </div>
          </div>
          <div className="rounded-xl border p-3" style={{ background: SURFACE, borderColor: BORDER }}>
            <p className="text-[10px] font-medium" style={textMuted}>غرف نشطة</p>
            <p className="mt-1 font-mono text-lg font-bold" style={{ color: TEXT, fontFamily: "'Space Mono', monospace" }}>
              {adminRooms.occupied}/{adminRooms.total}
            </p>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: adminRooms.total ? `${(adminRooms.occupied / adminRooms.total) * 100}%` : 0 }} />
            </div>
          </div>
          <div className="rounded-xl border p-3" style={{ background: SURFACE, borderColor: BORDER }}>
            <p className="text-[10px] font-medium" style={textMuted}>سيارات في العمل</p>
            <p className="mt-1 font-mono text-lg font-bold" style={{ color: TEXT, fontFamily: "'Space Mono', monospace" }}>
              {adminVehicles.active}/{adminVehicles.total}
            </p>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: adminVehicles.total ? `${(adminVehicles.active / adminVehicles.total) * 100}%` : 0 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-8 transition-opacity duration-300" style={{ background: BG }}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={textMain}>{t('dashboard.title')}</h1>
        <p className="mt-1" style={textMuted}>
          {t('dashboard.subtitle')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden transition-all duration-200" style={cardStyle}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={textMuted}>{t('dashboard.todayAppointments')}</CardTitle>
            <Calendar className="h-5 w-5" style={textMuted} />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" style={textMain}>{stats.todayAppointments}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden transition-all duration-200" style={cardStyle}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={textMuted}>{t('dashboard.inTransit')}</CardTitle>
            <Truck className="h-5 w-5" style={textMuted} />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" style={textMain}>{stats.inTransit}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden transition-all duration-200" style={cardStyle}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={textMuted}>{t('dashboard.activeSessions')}</CardTitle>
            <Activity className="h-5 w-5" style={textMuted} />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" style={textMain}>{stats.activeSessions}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden transition-all duration-200" style={cardStyle}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={textMuted}>{t('dashboard.weeklyRevenue')}</CardTitle>
            <DollarSign className="h-5 w-5" style={textMuted} />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" style={textMain}>{stats.weeklyRevenue}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" style={cardStyle}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle style={textMain}>{t('dashboard.liveStatus')}</CardTitle>
              <p className="text-sm" style={textMuted}>
                {t('dashboard.liveStatusSub')}
              </p>
            </div>
            <span className="text-xs" style={textMuted}>
              {t('dashboard.lastUpdate')}: {t('dashboard.secondsAgo', { count: lastUpdateSeconds })}
            </span>
          </CardHeader>
          <CardContent>
            {liveAppointments.length === 0 ? (
              <EmptyState icon="📅" title={t('dashboard.noAppointmentsToday')} />
            ) : (
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: BORDER }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: BORDER, ...textMuted }}>
                      <th className="px-4 py-3 text-left font-medium">المريض</th>
                      <th className="px-4 py-3 text-left font-medium">الوقت</th>
                      <th className="px-4 py-3 text-left font-medium">الوصول</th>
                      <th className="px-4 py-3 text-left font-medium">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveAppointments.map((a) => {
                      const tr = a.transportRequest as { status?: string; vehicle?: { plateNumber?: string }; driver?: { user?: { nameAr?: string } } } | undefined;
                      const inTransit = tr?.status === 'en_route' || tr?.status === 'assigned';
                      const borderByStatus =
                        a.status === 'completed'
                          ? 'border-l-4 border-l-green-500'
                          : a.status === 'in_progress'
                            ? 'border-l-4 border-l-blue-500'
                            : inTransit
                              ? 'border-l-4 border-l-amber-500'
                              : a.status === 'cancelled'
                                ? 'border-l-4 border-l-red-500'
                                : 'border-l-4 border-l-gray-500';
                      const isPulsing = a.status === 'in_progress' || inTransit;
                      return (
                        <tr
                          key={a.id}
                          className={`border-b transition-colors ${borderByStatus}`}
                          style={{ borderColor: BORDER }}
                        >
                          <td className="px-4 py-3" style={textMain}>
                            <div>
                              {a.patient?.nameAr ?? a.patientId}
                              {tr && (tr.vehicle?.plateNumber || tr.driver?.user?.nameAr) && (
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                  {tr.vehicle?.plateNumber && <span>🚐 {tr.vehicle.plateNumber}</span>}
                                  {tr.driver?.user?.nameAr && (
                                    <span className="ml-2">{tr.driver.user.nameAr}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3" style={textMuted}>
                            {new Date(a.startTime).toLocaleTimeString('ar', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3">
                            {a.arrivalType === 'center_transport' ? (
                              <span className="inline-flex items-center gap-1">
                                <span>🚐</span>
                                <span>{a.arrivalDisplayText ?? 'قادم بسيارة المركز'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <span>🚶</span>
                                <span>{a.arrivalDisplayText ?? 'بمفرده'}</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-2">
                              {isPulsing && (
                                <span
                                  className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"
                                  aria-hidden
                                />
                              )}
                              <StatusBadge status={a.status} type="appointment" />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card style={cardStyle}>
          <CardHeader>
            <CardTitle style={textMain}>{t('dashboard.quickActions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              (isAdmin || isReceptionist || isDoctor) && { label: 'موعد جديد', icon: CalendarPlus, path: '/appointments?new=1' },
              (isAdmin || isReceptionist) && { label: 'إضافة مريض', icon: UserPlus, path: '/patients?new=1' },
              (isAdmin || isReceptionist) && { label: 'تعيين نقل', icon: Car, path: '/transport' },
              (isAdmin || isDoctor || isNurse) && { label: 'رفع أشعة', icon: FileImage, path: '/patients' },
              (isAdmin || isDoctor) && { label: 'التقارير', icon: FileText, path: '/reports' },
            ].filter(Boolean).map((item) => {
              const { label, icon: Icon, path } = item as { label: string; icon: typeof FileText; path: string };
              return (
                <Button
                  key={path}
                  variant="outline"
                  className="w-full justify-start gap-3 rounded-xl border-cyan-500/30 text-cyan-400"
                  onClick={() => navigate(path)}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AdminKPICard({
  label,
  value,
  trend,
  trendUp,
  trendNeutral,
  subStat,
  accent,
  icon,
  sparkData,
}: {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  trendNeutral?: boolean;
  subStat?: string;
  accent: string;
  icon: string;
  sparkData: number[];
}) {
  const max = Math.max(1, ...sparkData);
  const trendClass = trendNeutral ? 'text-amber-400' : trendUp ? 'text-green-400' : 'text-red-400';
  return (
    <div
      className="overflow-hidden rounded-xl border p-4 transition-all duration-200"
      style={{ background: SURFACE, borderColor: BORDER, borderTop: `2px solid ${accent}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium" style={{ color: MUTED }}>{label}</span>
        <span className="text-lg opacity-80">{icon}</span>
      </div>
      <p className="mt-1 text-2xl font-bold font-mono" style={{ color: accent, fontFamily: "'Space Mono', monospace" }}>{value}</p>
      {trend && (
        <p className={`mt-0.5 text-[10px] ${trendClass}`}>
          {trend}
        </p>
      )}
      {subStat && <p className="mt-0.5 text-[10px]" style={{ color: MUTED }}>{subStat}</p>}
      {sparkData.length > 0 && (
        <svg className="mt-2 h-8 w-full" viewBox="0 0 100 20" preserveAspectRatio="none">
          {sparkData.map((v, i) => {
            const w = 100 / sparkData.length;
            const x = i * w;
            const barH = max ? (v / max) * 18 : 0;
            return (
              <rect key={i} x={x} y={20 - barH} width={w - 0.5} height={barH} fill={accent} fillOpacity={0.15} rx={1} />
            );
          })}
        </svg>
      )}
    </div>
  );
}

function SessionsByDayChart({ data, accent }: { data: { date: string; count: number }[]; accent: string }) {
  const MUTED = '#4b5875';
  const TEXT = '#dde6f5';
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const barHeight = 24;
  return (
    <div className="space-y-2">
      {data.length === 0 ? (
        <p className="py-6 text-center text-sm" style={{ color: MUTED }}>لا بيانات للفترة المحددة</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((d) => {
            const w = maxCount ? (d.count / maxCount) * 100 : 0;
            return (
              <div key={d.date} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs font-medium" style={{ color: MUTED }}>
                  {new Date(d.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                </span>
                <div className="h-6 flex-1 overflow-hidden rounded-md bg-white/5">
                  <div
                    className="h-full rounded-md transition-all duration-300"
                    style={{ width: `${w}%`, backgroundColor: accent, minWidth: d.count ? 4 : 0 }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right font-mono text-xs" style={{ color: TEXT }}>{d.count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminAlerts({
  overdueInvoices,
  pendingTransportCount,
  newPatientsTodayCount,
  interactionWarnings,
  onNavigateTransport,
  onNavigatePrescriptions,
}: {
  overdueInvoices: { id: string; patient?: { nameAr?: string }; dueDate?: string }[];
  pendingTransportCount: number;
  newPatientsTodayCount: number;
  interactionWarnings: number;
  onNavigateTransport: () => void;
  onNavigatePrescriptions: () => void;
}) {
  const items: { type: 'red' | 'yellow' | 'green' | 'blue'; title: string; sub: string; action?: { label: string; onClick: () => void } }[] = [];
  if (overdueInvoices.length > 0) {
    overdueInvoices.forEach((inv) => {
      const due = inv.dueDate ? new Date(inv.dueDate) : null;
      const days = due ? Math.max(0, Math.floor((Date.now() - due.getTime()) / 86400000)) : 0;
      items.push({
        type: 'red',
        title: `فواتير متأخرة: ${inv.patient?.nameAr ?? 'مريض'}`,
        sub: `${days} يوم متأخر`,
      });
    });
  }
  if (pendingTransportCount > 0) {
    items.push({
      type: 'yellow',
      title: 'رحلات غير مسندة',
      sub: `${pendingTransportCount} طلب — تعيين سائق`,
      action: { label: 'تعيين سائق', onClick: onNavigateTransport },
    });
  }
  if (newPatientsTodayCount > 0) {
    items.push({
      type: 'green',
      title: 'مرضى جدد بانتظار التسجيل',
      sub: `${newPatientsTodayCount} مرضى جدد اليوم`,
    });
  }
  if (interactionWarnings > 0) {
    items.push({
      type: 'blue',
      title: 'تحذيرات تفاعل دوائي',
      sub: `${interactionWarnings} تحذير — راجع الوصفات`,
      action: { label: 'راجع الوصفات', onClick: onNavigatePrescriptions },
    });
  }
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/5 py-6 text-center" style={{ borderLeft: '4px solid #34d399' }}>
        <p className="text-sm font-medium" style={{ color: TEXT }}>✓ لا تنبيهات — كل شي تمام!</p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="rounded-lg border py-2 px-3"
          style={{
            borderLeft: `4px solid ${
              item.type === 'red' ? RED : item.type === 'yellow' ? AMBER : item.type === 'green' ? GREEN : CYAN
            }`,
            borderColor: BORDER,
            background: SURFACE,
          }}
        >
          <p className="text-sm font-medium" style={{ color: TEXT }}>{item.title}</p>
          <p className="text-xs" style={{ color: MUTED }}>{item.sub}</p>
          {item.action && (
            <button type="button" onClick={item.action.onClick} className="mt-2 text-xs text-cyan-400 hover:underline">
              {item.action.label}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
