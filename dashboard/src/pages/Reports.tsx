import { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/api';
import { useToast } from '@/lib/toast';
import {
  MOCK_PATIENTS,
  MOCK_APPOINTMENTS,
  MOCK_PATIENT_STATS,
  MOCK_TRANSPORT_REQUESTS,
  MOCK_VEHICLES,
  MOCK_USERS_DOCTORS,
  MOCK_REPORTS,
  isDemoMode,
} from '@/lib/mock-data';

const BG = '#06080e';
const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';
const CYAN = '#22d3ee';
const GREEN = '#34d399';
const AMBER = '#fbbf24';
const RED = '#f87171';
const PURPLE = '#a78bfa';
const TOOLTIP_BG = '#1a2035';
const AXIS_FILL = '#94a3b8';
const DAY_NAMES_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return toDateStr(x);
}

function endOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  x.setHours(23, 59, 59, 999);
  return toDateStr(x);
}

interface Appointment {
  id: string;
  startTime: string;
  status: string;
  doctorId?: string;
  patientId?: string;
  patient?: { nameAr?: string };
  doctor?: { nameAr?: string };
}
interface ClinicalSession {
  id: string;
  recoveryScore: number | null;
  appointment?: { startTime: string; patient?: { nameAr?: string }; doctor?: { nameAr?: string } };
}
interface Patient {
  id: string;
  nameAr: string;
  diagnosis?: string | null;
  createdAt: string;
  assignedDoctorId?: string | null;
}
interface TransportRequest {
  id: string;
  status: string;
  mobilityNeed?: string | null;
  createdAt: string;
  vehicle?: { plateNumber?: string };
  driver?: { user?: { nameAr?: string } };
}
interface User {
  id: string;
  nameAr: string | null;
  role: string;
}

export function Reports() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return startOfMonth(d);
  });
  const [dateTo, setDateTo] = useState(() => endOfMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sessions, setSessions] = useState<ClinicalSession[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsStats, setPatientsStats] = useState<{ total: number; activeThisMonth: number; newThisWeek: number }>({ total: 0, activeThisMonth: 0, newThisWeek: 0 });
  const [transportRequests, setTransportRequests] = useState<TransportRequest[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; plateNumber?: string; status?: string }[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);

  const [reportDashboardStats, setReportDashboardStats] = useState<{
    totalSessions: number;
    avgRecovery: number;
    attendanceRate: number;
    cancellations: number;
    newPatients: number;
    revenue: number;
  } | null>(null);
  const [reportSessionsByDay, setReportSessionsByDay] = useState<{ date: string; count: number }[] | null>(null);
  const [reportHeatmap, setReportHeatmap] = useState<{ dayOfWeek: number; hour: number; count: number }[] | null>(null);
  const [reportDoctorPerf, setReportDoctorPerf] = useState<{ doctorId: string; doctorName: string; sessionsCount: number; avgRecovery: number; attendanceRate: number }[] | null>(null);
  const [reportPatientGrowth, setReportPatientGrowth] = useState<{ month: string; newPatients: number }[] | null>(null);
  const [reportTransportStats, setReportTransportStats] = useState<{
    totalTrips: number;
    todayTrips: number;
    byMobilityNeed: { type: string; count: number }[];
    byVehicle: { vehicleId: string; plate: string; tripCount: number }[];
  } | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    if (isDemoMode()) {
      setAppointments(MOCK_APPOINTMENTS as unknown as Appointment[]);
      setSessions([]);
      setPatients(MOCK_PATIENTS as unknown as Patient[]);
      setPatientsStats(MOCK_PATIENT_STATS);
      setTransportRequests(MOCK_TRANSPORT_REQUESTS as unknown as TransportRequest[]);
      setVehicles(MOCK_VEHICLES as { id: string; plateNumber?: string; status?: string }[]);
      setDoctors(MOCK_USERS_DOCTORS as unknown as User[]);
      setReportDashboardStats(MOCK_REPORTS.dashboardStats);
      setReportSessionsByDay(MOCK_REPORTS.sessionsByDay);
      setReportHeatmap(MOCK_REPORTS.heatmap);
      setReportDoctorPerf(MOCK_REPORTS.doctorPerf);
      setReportPatientGrowth(MOCK_REPORTS.patientGrowth);
      setReportTransportStats(MOCK_REPORTS.transportStats);
      setLoading(false);
      return;
    }
    const isAdmin = user?.role === 'admin';
    const doctorId = user?.id ?? '';
    const base = [
      isAdmin
        ? apiGet<Appointment[]>(`/appointments?startDate=${dateFrom}&endDate=${dateTo}`)
        : apiGet<Appointment[]>(`/appointments/doctor/${doctorId}?startDate=${dateFrom}&endDate=${dateTo}`),
      apiGet<ClinicalSession[]>(`/clinical-sessions?startDate=${dateFrom}&endDate=${dateTo}`).catch(() => []),
      apiGet<Patient[]>('/patients').catch(() => []),
      apiGet<{ total: number; activeThisMonth: number; newThisWeek: number }>('/patients/stats').catch(() => ({ total: 0, activeThisMonth: 0, newThisWeek: 0 })),
      apiGet<TransportRequest[]>('/transport/requests').catch(() => []),
      apiGet<{ id: string; plateNumber?: string; status?: string }[]>('/transport/vehicles').catch(() => []),
      apiGet<User[]>('/users').catch(() => []),
    ];
    const reportCalls = isAdmin
      ? [
          apiGet<{ totalSessions: number; avgRecovery: number; attendanceRate: number; cancellations: number; newPatients: number; revenue: number }>(
            `/reports/dashboard-stats?startDate=${dateFrom}&endDate=${dateTo}`,
          ).catch(() => null),
          apiGet<{ date: string; count: number }[]>(`/reports/sessions-by-day?startDate=${dateFrom}&endDate=${dateTo}`).catch(() => null),
          apiGet<{ dayOfWeek: number; hour: number; count: number }[]>(`/reports/heatmap?startDate=${dateFrom}&endDate=${dateTo}`).catch(() => null),
          apiGet<{ doctorId: string; doctorName: string; sessionsCount: number; avgRecovery: number; attendanceRate: number }[]>(
            `/reports/doctor-performance?startDate=${dateFrom}&endDate=${dateTo}`,
          ).catch(() => null),
          apiGet<{ month: string; newPatients: number }[]>('/reports/patient-growth').catch(() => null),
          apiGet<{ totalTrips: number; todayTrips: number; byMobilityNeed: { type: string; count: number }[]; byVehicle: { vehicleId: string; plate: string; tripCount: number }[] }>(
            `/reports/transport-stats?startDate=${dateFrom}&endDate=${dateTo}`,
          ).catch(() => null),
        ]
      : [];
    try {
      const baseResults = await Promise.all(base);
      setAppointments(Array.isArray(baseResults[0]) ? (baseResults[0] as Appointment[]) : []);
      setSessions(Array.isArray(baseResults[1]) ? (baseResults[1] as ClinicalSession[]) : []);
      setPatients(Array.isArray(baseResults[2]) ? (baseResults[2] as Patient[]) : []);
      setPatientsStats((baseResults[3] as { total: number; activeThisMonth: number; newThisWeek: number }) ?? { total: 0, activeThisMonth: 0, newThisWeek: 0 });
      setTransportRequests(Array.isArray(baseResults[4]) ? (baseResults[4] as TransportRequest[]) : []);
      setVehicles(Array.isArray(baseResults[5]) ? (baseResults[5] as { id: string; plateNumber?: string; status?: string }[]) : []);
      setDoctors(Array.isArray(baseResults[6]) ? (baseResults[6] as User[]).filter((u) => u.role === 'doctor') : []);
      if (isAdmin && reportCalls.length) {
        const reportResults = await Promise.all(reportCalls);
        setReportDashboardStats((reportResults[0] as typeof reportDashboardStats) ?? null);
        setReportSessionsByDay(Array.isArray(reportResults[1]) ? (reportResults[1] as { date: string; count: number }[]) : null);
        setReportHeatmap(Array.isArray(reportResults[2]) ? (reportResults[2] as { dayOfWeek: number; hour: number; count: number }[]) : null);
        setReportDoctorPerf(Array.isArray(reportResults[3]) ? (reportResults[3] as { doctorId: string; doctorName: string; sessionsCount: number; avgRecovery: number; attendanceRate: number }[]) : null);
        setReportPatientGrowth(Array.isArray(reportResults[4]) ? (reportResults[4] as { month: string; newPatients: number }[]) : null);
        setReportTransportStats((reportResults[5] as typeof reportTransportStats) ?? null);
      } else {
        setReportDashboardStats(null);
        setReportSessionsByDay(null);
        setReportHeatmap(null);
        setReportDoctorPerf(null);
        setReportPatientGrowth(null);
        setReportTransportStats(null);
      }
    } catch {
      setAppointments([]);
      setSessions([]);
      setPatients([]);
      setTransportRequests([]);
      setVehicles([]);
      setDoctors([]);
      setReportDashboardStats(null);
      setReportSessionsByDay(null);
      setReportHeatmap(null);
      setReportDoctorPerf(null);
      setReportPatientGrowth(null);
      setReportTransportStats(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, user?.id, user?.role]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const tabs = [
    { value: 'overview', label: '📊 نظرة عامة' },
    { value: 'doctors', label: '👨‍⚕️ أداء الأطباء' },
    { value: 'patients', label: '👥 تحليل المرضى' },
    { value: 'transport', label: '🚐 تقارير النقل' },
    { value: 'finance', label: '💰 المالية' },
  ];

  return (
    <div className="min-h-screen" style={{ background: BG, fontFamily: 'Cairo, sans-serif' }}>
      <header className="sticky top-0 z-10 border-b px-6 py-4" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-xl font-bold text-white" style={{ fontSize: '20px' }}>📊 التقارير والإحصائيات</h1>
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: BORDER, backgroundColor: BG }}>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-transparent text-sm text-white outline-none" />
            <span className="text-gray-500">→</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-transparent text-sm text-white outline-none" />
          </div>
          <Button variant="ghost" size="sm" className="text-gray-400" onClick={() => fetchAll()}>🔄 تحديث</Button>
          <Button size="sm" className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" onClick={() => toast('قريباً')}>📥 تصدير PDF</Button>
        </div>
      </header>

      <div className="border-b px-6 pt-4" style={{ borderColor: BORDER }}>
        <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: SURFACE }}>
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${tab === t.value ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="p-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
                <CardContent className="p-4"><div className="h-16 rounded bg-white/10" /></CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {tab === 'overview' && (
              <OverviewTab
                appointments={appointments}
                sessions={sessions}
                patients={patients}
                dateFrom={dateFrom}
                dateTo={dateTo}
                reportDashboardStats={reportDashboardStats}
                reportSessionsByDay={reportSessionsByDay}
                reportHeatmap={reportHeatmap}
              />
            )}
            {tab === 'doctors' && <DoctorsTab appointments={appointments} sessions={sessions} doctors={doctors} reportDoctorPerf={reportDoctorPerf} />}
            {tab === 'patients' && <PatientsTab patients={patients} patientsStats={patientsStats} sessions={sessions} reportPatientGrowth={reportPatientGrowth} />}
            {tab === 'transport' && (
              <TransportTab
                transportRequests={transportRequests}
                vehicles={vehicles}
                dateFrom={dateFrom}
                dateTo={dateTo}
                reportTransportStats={reportTransportStats}
              />
            )}
            {tab === 'finance' && <FinanceTab />}
          </>
        )}
      </main>
    </div>
  );
}

function KPICard({
  label,
  value,
  trend,
  icon,
  styleIndex,
}: {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | null;
  icon?: string;
  styleIndex?: number;
}) {
  return (
    <Card
      className="rounded-2xl border transition-all hover:-translate-y-0.5 hover:border-cyan-500/40"
      style={{
        backgroundColor: SURFACE,
        borderColor: BORDER,
        animation: 'fadeUp 0.3s ease-out both',
        animationDelay: styleIndex != null ? `${styleIndex * 50}ms` : undefined,
      }}
    >
      <CardContent className="relative p-4">
        {icon && <div className="absolute right-2 top-2 text-2xl opacity-20">{icon}</div>}
        <p className="text-[11px] text-gray-400">{label}</p>
        <p className="mt-1 text-[26px] font-bold text-white" style={{ fontFamily: "'Space Mono', monospace" }}>{value}</p>
        {trend != null && (
          <span className={`text-xs ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>{trend === 'up' ? '↑' : '↓'}</span>
        )}
      </CardContent>
    </Card>
  );
}

function OverviewTab({
  appointments,
  sessions,
  patients,
  dateFrom,
  dateTo,
  reportDashboardStats,
  reportSessionsByDay,
  reportHeatmap,
}: {
  appointments: Appointment[];
  sessions: ClinicalSession[];
  patients: Patient[];
  dateFrom: string;
  dateTo: string;
  reportDashboardStats?: { totalSessions: number; avgRecovery: number; attendanceRate: number; cancellations: number; newPatients: number; revenue: number } | null;
  reportSessionsByDay?: { date: string; count: number }[] | null;
  reportHeatmap?: { dayOfWeek: number; hour: number; count: number }[] | null;
}) {
  const completed = reportDashboardStats ? reportDashboardStats.totalSessions : appointments.filter((a) => a.status === 'completed').length;
  const cancelled = reportDashboardStats ? reportDashboardStats.cancellations : appointments.filter((a) => a.status === 'cancelled').length;
  const total = appointments.length;
  const attendanceRate = reportDashboardStats ? reportDashboardStats.attendanceRate : (total ? Math.round((appointments.filter((a) => a.status === 'completed' || a.status === 'in_progress').length / total) * 100) : 0);
  const avgRecovery = reportDashboardStats ? reportDashboardStats.avgRecovery : (sessions.filter((s) => s.recoveryScore != null).length ? Math.round(sessions.reduce((a, s) => a + (s.recoveryScore ?? 0), 0) / sessions.filter((s) => s.recoveryScore != null).length) : 0);
  const newPatientsInRange = reportDashboardStats ? reportDashboardStats.newPatients : patients.filter((p) => p.createdAt >= dateFrom && p.createdAt <= dateTo + 'T23:59:59.999Z').length;
  const revenue = reportDashboardStats ? reportDashboardStats.revenue : 0;

  const dailyData = (() => {
    if (reportSessionsByDay && reportSessionsByDay.length) {
      return reportSessionsByDay.map((r) => ({ day: r.date.slice(8, 10), count: r.count })).slice(-14);
    }
    const byDay: Record<string, number> = {};
    appointments.forEach((a) => {
      const day = a.startTime.slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
    });
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const out: { day: string; count: number }[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = toDateStr(d);
      out.push({ day: key.slice(8, 10), count: byDay[key] ?? 0 });
    }
    return out.slice(-14);
  })();

  const diagnosisData = (() => {
    const byDiag: Record<string, number> = {};
    patients.forEach((p) => {
      const d = p.diagnosis || 'غير محدد';
      byDiag[d] = (byDiag[d] ?? 0) + 1;
    });
    return Object.entries(byDiag).map(([name, count]) => ({ name, value: count }));
  })();
  const diagnosisColors = [CYAN, GREEN, AMBER, RED, PURPLE];

  const heatmapData = (() => {
    const grid: Record<number, Record<number, number>> = {};
    for (let h = 8; h <= 17; h++) grid[h] = {};
    if (reportHeatmap && reportHeatmap.length) {
      reportHeatmap.forEach((r) => {
        if (r.hour >= 8 && r.hour <= 17) {
          if (!grid[r.hour]) grid[r.hour] = {};
          grid[r.hour][r.dayOfWeek] = (grid[r.hour][r.dayOfWeek] ?? 0) + r.count;
        }
      });
    } else {
      appointments.forEach((a) => {
        const d = new Date(a.startTime);
        const hour = d.getHours();
        const day = d.getDay();
        if (hour >= 8 && hour <= 17) {
          grid[hour][day] = (grid[hour][day] ?? 0) + 1;
        }
      });
    }
    return grid;
  })();
  const maxHeat = Math.max(0, 1, ...Object.values(heatmapData).flatMap((h) => Object.values(h)));

  const weeklyRecovery = (() => {
    const byWeek: Record<string, number[]> = {};
    sessions.forEach((s) => {
      if (s.recoveryScore == null || !s.appointment?.startTime) return;
      const d = new Date(s.appointment.startTime);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = toDateStr(weekStart);
      if (!byWeek[key]) byWeek[key] = [];
      byWeek[key].push(s.recoveryScore);
    });
    return Object.entries(byWeek).map(([week, scores]) => ({ week: week.slice(5), avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) })).slice(-8);
  })();

  const recentSessions = sessions.slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KPICard styleIndex={0} label="إجمالي الجلسات" value={completed} trend="up" icon="📋" />
        <KPICard styleIndex={1} label="متوسط التعافي" value={avgRecovery + '%'} icon="📈" />
        <KPICard styleIndex={2} label="نسبة الحضور" value={attendanceRate + '%'} icon="✅" />
        <KPICard styleIndex={3} label="الإلغاءات" value={cancelled} icon="❌" />
        <KPICard styleIndex={4} label="مرضى جدد" value={newPatientsInRange} icon="👤" />
        <KPICard styleIndex={5} label="إيرادات الشهر" value={revenue ? `$${revenue.toLocaleString()}` : '$0'} icon="💰" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader><CardTitle className="text-base text-white">جلسات يومية</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <XAxis dataKey="day" tick={{ fill: AXIS_FILL, fontFamily: "'Space Mono', monospace", fontSize: 11 }} stroke={BORDER} />
                  <YAxis tick={{ fill: AXIS_FILL, fontFamily: "'Space Mono', monospace", fontSize: 11 }} stroke={BORDER} />
                  <Tooltip contentStyle={{ backgroundColor: TOOLTIP_BG, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8 }} labelStyle={{ color: '#fff' }} />
                  <Bar dataKey="count" fill={CYAN} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader><CardTitle className="text-base text-white">توزيع الحالات (التشخيص)</CardTitle></CardHeader>
          <CardContent>
            {diagnosisData.length === 0 ? (
              <p className="py-8 text-center text-gray-400">لا توجد بيانات</p>
            ) : (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={diagnosisData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2}>
                      {diagnosisData.map((_, i) => <Cell key={i} fill={diagnosisColors[i % diagnosisColors.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: TOOLTIP_BG, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
        <CardHeader><CardTitle className="text-base text-white">كثافة المواعيد (ساعة × يوم)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="w-14 py-2 text-left text-[11px] text-gray-400" style={{ fontFamily: "'Space Mono', monospace" }}>وقت</th>
                  {DAY_NAMES_AR.map((d) => <th key={d} className="py-2 text-center text-[11px] text-gray-400">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((hour) => (
                  <tr key={hour}>
                    <td className="py-1 text-gray-400" style={{ fontFamily: "'Space Mono', monospace" }}>{hour}:00</td>
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                      const count = heatmapData[hour]?.[day] ?? 0;
                      const opacity = maxHeat ? count / Math.max(maxHeat, 1) : 0;
                      return (
                        <td key={day} className="p-1">
                          <div className="rounded bg-cyan-500/30 text-center text-xs text-white" style={{ backgroundColor: `rgba(34, 211, 238, ${0.2 + opacity * 0.8})` }} title={`${DAY_NAMES_AR[day]} ${hour}:00 — ${count} جلسات`}>
                            {count || ''}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader><CardTitle className="text-base text-white">اتجاه التعافي أسبوعياً</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyRecovery} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <XAxis dataKey="week" tick={{ fill: AXIS_FILL, fontFamily: "'Space Mono', monospace", fontSize: 11 }} stroke={BORDER} />
                  <YAxis tick={{ fill: AXIS_FILL, fontFamily: "'Space Mono', monospace", fontSize: 11 }} stroke={BORDER} />
                  <Tooltip contentStyle={{ backgroundColor: TOOLTIP_BG, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8 }} />
                  <Bar dataKey="avg" fill={GREEN} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader><CardTitle className="text-base text-white">آخر الجلسات</CardTitle></CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <p className="py-6 text-center text-gray-400">لا توجد جلسات</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: BORDER }}>
                      <th className="py-2 text-right text-gray-400">المريض</th>
                      <th className="py-2 text-right text-gray-400">الطبيب</th>
                      <th className="py-2 text-right text-gray-400">التعافي</th>
                      <th className="py-2 text-right text-gray-400">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSessions.map((s) => (
                      <tr key={s.id} className="border-b" style={{ borderColor: BORDER }}>
                        <td className="py-2 text-white">{s.appointment?.patient?.nameAr ?? '—'}</td>
                        <td className="py-2 text-gray-400">{s.appointment?.doctor?.nameAr ?? '—'}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
                              <div className="h-full rounded-full" style={{ width: `${s.recoveryScore ?? 0}%`, backgroundColor: (s.recoveryScore ?? 0) > 70 ? GREEN : (s.recoveryScore ?? 0) >= 40 ? AMBER : RED }} />
                            </div>
                            <span style={{ fontFamily: "'Space Mono', monospace" }}>{s.recoveryScore ?? 0}%</span>
                          </div>
                        </td>
                        <td className="py-2"><Badge className="bg-green-500/20 text-green-400 text-xs">مكتمل</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DoctorsTab({
  appointments,
  sessions,
  doctors,
  reportDoctorPerf,
}: {
  appointments: Appointment[];
  sessions: ClinicalSession[];
  doctors: User[];
  reportDoctorPerf?: { doctorId: string; doctorName: string; sessionsCount: number; avgRecovery: number; attendanceRate: number }[] | null;
}) {
  const completed = appointments.filter((a) => a.status === 'completed');
  const totalByDoctor: Record<string, number> = {};
  const recoveryByDoctor: Record<string, number[]> = {};
  doctors.forEach((d) => { totalByDoctor[d.id] = 0; recoveryByDoctor[d.id] = []; });
  completed.forEach((a) => {
    if (a.doctorId && totalByDoctor[a.doctorId] != null) totalByDoctor[a.doctorId]++;
  });
  sessions.forEach((s) => {
    const docId = (s.appointment as { doctorId?: string })?.doctorId;
    if (docId && s.recoveryScore != null) recoveryByDoctor[docId]?.push(s.recoveryScore);
  });
  const totalSessions = reportDoctorPerf?.length
    ? reportDoctorPerf.reduce((s, p) => s + p.sessionsCount, 0)
    : completed.length;
  const bestRecovery = reportDoctorPerf?.length
    ? reportDoctorPerf.reduce((best, p) => (p.avgRecovery > (best.avg ?? 0) ? { name: p.doctorName ?? '—', avg: p.avgRecovery } : best), { name: '—', avg: 0 as number })
    : doctors.length
      ? doctors.reduce((best, d) => {
          const arr = recoveryByDoctor[d.id] ?? [];
          const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
          return avg > (best.avg ?? 0) ? { name: d.nameAr ?? d.id, avg } : best;
        }, { name: '—', avg: 0 as number })
      : { name: '—', avg: 0 };
  const totalAppts = appointments.length;
  const attendancePct = reportDoctorPerf?.length
    ? Math.max(0, ...reportDoctorPerf.map((p) => p.attendanceRate))
    : (() => {
        const attended = appointments.filter((a) => a.status === 'completed' || a.status === 'in_progress').length;
        return totalAppts ? Math.round((attended / totalAppts) * 100) : 0;
      })();

  const weeklyByDoctor = (() => {
    const byWeek: Record<string, Record<string, number>> = {};
    completed.forEach((a) => {
      const d = new Date(a.startTime);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = toDateStr(weekStart);
      if (!byWeek[key]) byWeek[key] = {};
      const docId = a.doctorId ?? 'unknown';
      byWeek[key][docId] = (byWeek[key][docId] ?? 0) + 1;
    });
    const weeks = Object.keys(byWeek).slice(-6);
    return weeks.map((week) => {
      const row: Record<string, string | number> = { week: week.slice(5) };
      doctors.forEach((d) => { row[d.nameAr ?? d.id] = byWeek[week]?.[d.id] ?? 0; });
      return row;
    });
  })();

  const docColors = [CYAN, GREEN, AMBER, PURPLE];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard label="عدد الأطباء" value={doctors.length} icon="👨‍⚕️" />
        <KPICard label="جلسات هذا الشهر" value={totalSessions} icon="📋" />
        <KPICard label="أعلى تعافي" value={bestRecovery.name + ' ' + Math.round(bestRecovery.avg) + '%'} icon="📈" />
        <KPICard label="أعلى حضور" value={attendancePct + '%'} icon="✅" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.map((d) => {
          const sessCount = totalByDoctor[d.id] ?? 0;
          const recScores = recoveryByDoctor[d.id] ?? [];
          const avgRec = recScores.length ? Math.round(recScores.reduce((a, b) => a + b, 0) / recScores.length) : 0;
          const att = totalAppts ? Math.round((sessCount / totalAppts) * 100) : 0;
          return (
            <Card key={d.id} className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-cyan-500/30 to-cyan-600/20 flex items-center justify-center text-lg font-bold text-white">
                    {(d.nameAr ?? 'د').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-white">{d.nameAr ?? d.id}</p>
                    <p className="text-xs text-gray-400">طبيب</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">{sessCount} جلسات</Badge>
                  <Badge className="bg-green-500/20 text-green-400 text-xs">{avgRec}% تعافي</Badge>
                  <Badge className="bg-amber-500/20 text-amber-400 text-xs">{att}% حضور</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  <div><div className="h-2 w-full rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-500/70" style={{ width: `${Math.min(100, sessCount * 5)}%` }} /></div></div>
                  <div><div className="h-2 w-full rounded-full bg-white/10"><div className="h-full rounded-full bg-green-500/70" style={{ width: `${avgRec}%` }} /></div></div>
                  <div><div className="h-2 w-full rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-500/70" style={{ width: `${att}%` }} /></div></div>
                  <div><div className="h-2 w-full rounded-full bg-white/10"><div className="h-full rounded-full bg-purple-500/70" style={{ width: '60%' }} /></div></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {weeklyByDoctor.length > 0 && (
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader><CardTitle className="text-base text-white">جلسات أسبوعية لكل طبيب</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyByDoctor} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <XAxis dataKey="week" tick={{ fill: AXIS_FILL, fontFamily: "'Space Mono', monospace", fontSize: 11 }} stroke={BORDER} />
                  <YAxis tick={{ fill: AXIS_FILL, fontFamily: "'Space Mono', monospace", fontSize: 11 }} stroke={BORDER} />
                  <Tooltip contentStyle={{ backgroundColor: TOOLTIP_BG, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8 }} />
                  <Legend />
                  {doctors.slice(0, 4).map((d, idx) => (
                    <Bar key={d.id} dataKey={d.nameAr ?? d.id} fill={docColors[idx % docColors.length]} radius={[0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PatientsTab({
  patients,
  patientsStats,
  sessions,
  reportPatientGrowth,
}: {
  patients: Patient[];
  patientsStats: { total: number; activeThisMonth: number; newThisWeek: number };
  sessions: ClinicalSession[];
  reportPatientGrowth?: { month: string; newPatients: number }[] | null;
}) {
  const completed90 = patients.filter((p) => {
    const patientSessions = sessions.filter((s) => (s.appointment as { patientId?: string })?.patientId === p.id);
    const scores = patientSessions.map((s) => s.recoveryScore).filter((n): n is number => n != null);
    const last = scores[scores.length - 1];
    return last != null && last >= 90;
  }).length;
  const avgSessions = patients.length ? (sessions.length / patients.length).toFixed(1) : '0';

  const growthData = (() => {
    if (reportPatientGrowth && reportPatientGrowth.length) {
      return reportPatientGrowth.map((r) => ({ month: r.month.slice(5), count: r.newPatients })).slice(-12);
    }
    const byMonth: Record<string, number> = {};
    patients.forEach((p) => {
      const m = p.createdAt.slice(0, 7);
      byMonth[m] = (byMonth[m] ?? 0) + 1;
    });
    return Object.entries(byMonth).map(([month, count]) => ({ month: month.slice(5), count })).slice(-12);
  })();

  const diagnosisDist = (() => {
    const byDiag: Record<string, number> = {};
    patients.forEach((p) => {
      const d = p.diagnosis || 'غير محدد';
      byDiag[d] = (byDiag[d] ?? 0) + 1;
    });
    return Object.entries(byDiag).map(([name, count]) => ({ name, count }));
  })();
  const distColors = [CYAN, GREEN, AMBER, RED, PURPLE];
  const maxDist = Math.max(1, ...diagnosisDist.map((d) => d.count));

  const improving = (() => {
    const list = patients.map((p) => {
      const patientSessions = sessions.filter((s) => (s.appointment as { patientId?: string })?.patientId === p.id).sort((a, b) => (a.appointment?.startTime ?? '').localeCompare(b.appointment?.startTime ?? ''));
      const scores = patientSessions.map((s) => s.recoveryScore).filter((n): n is number => n != null);
      const start = scores[0] ?? 0;
      const current = scores[scores.length - 1] ?? 0;
      return { patient: p, start, current, improvement: current - start, sessions: patientSessions.length };
    });
    return list.filter((x) => x.improvement > 0).sort((a, b) => b.improvement - a.improvement).slice(0, 10);
  })();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KPICard label="إجمالي المرضى" value={patientsStats.total} icon="👥" />
        <KPICard label="نشط هذا الشهر" value={patientsStats.activeThisMonth} icon="✅" />
        <KPICard label="جدد هذا الأسبوع" value={patientsStats.newThisWeek} icon="🆕" />
        <KPICard label="أكملوا العلاج (≥90%)" value={completed90} icon="🎯" />
        <KPICard label="متوسط الجلسات/مريض" value={avgSessions} icon="📋" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader><CardTitle className="text-base text-white">نمو المرضى (شهرياً)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <XAxis dataKey="month" tick={{ fill: AXIS_FILL, fontFamily: "'Space Mono', monospace", fontSize: 11 }} stroke={BORDER} />
                  <YAxis tick={{ fill: AXIS_FILL, fontFamily: "'Space Mono', monospace", fontSize: 11 }} stroke={BORDER} />
                  <Tooltip contentStyle={{ backgroundColor: TOOLTIP_BG, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8 }} />
                  <Bar dataKey="count" fill={PURPLE} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader><CardTitle className="text-base text-white">توزيع التشخيصات</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {diagnosisDist.map((d, i) => (
              <div key={d.name}>
                <div className="flex justify-between text-sm">
                  <span className="text-white">{d.name}</span>
                  <span style={{ fontFamily: "'Space Mono', monospace" }}>{d.count}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${(d.count / maxDist) * 100}%`, backgroundColor: distColors[i % distColors.length] }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
        <CardHeader><CardTitle className="text-base text-white">أكثر المرضى تحسناً</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: BORDER }}>
                  <th className="py-2 text-right text-gray-400">المريض</th>
                  <th className="py-2 text-right text-gray-400">التشخيص</th>
                  <th className="py-2 text-right text-gray-400">الجلسات</th>
                  <th className="py-2 text-right text-gray-400">بداية %</th>
                  <th className="py-2 text-right text-gray-400">حالي %</th>
                  <th className="py-2 text-right text-gray-400">التحسن</th>
                </tr>
              </thead>
              <tbody>
                {improving.map(({ patient, start, current, improvement, sessions: s }) => (
                  <tr key={patient.id} className="border-b" style={{ borderColor: BORDER }}>
                    <td className="py-2 text-white">{patient.nameAr}</td>
                    <td className="py-2"><Badge className="bg-cyan-500/20 text-cyan-400 text-xs">{patient.diagnosis || '—'}</Badge></td>
                    <td className="py-2" style={{ fontFamily: "'Space Mono', monospace" }}>{s}</td>
                    <td className="py-2" style={{ fontFamily: "'Space Mono', monospace" }}>{start}%</td>
                    <td className="py-2" style={{ fontFamily: "'Space Mono', monospace" }}>{current}%</td>
                    <td className="py-2 text-green-400">↑ +{improvement}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TransportTab({
  transportRequests,
  vehicles,
  dateFrom,
  dateTo,
  reportTransportStats,
}: {
  transportRequests: TransportRequest[];
  vehicles: { id: string; plateNumber?: string; status?: string }[];
  dateFrom: string;
  dateTo: string;
  reportTransportStats?: {
    totalTrips: number;
    todayTrips: number;
    byMobilityNeed: { type: string; count: number }[];
    byVehicle: { vehicleId: string; plate: string; tripCount: number }[];
  } | null;
}) {
  const inRange = transportRequests.filter((r) => r.createdAt >= dateFrom && r.createdAt <= dateTo + 'T23:59:59.999Z');
  const todayStr = toDateStr(new Date());
  const totalTrips = reportTransportStats ? reportTransportStats.totalTrips : inRange.length;
  const todayTrips = reportTransportStats ? reportTransportStats.todayTrips : transportRequests.filter((r) => r.createdAt.startsWith(todayStr)).length;
  const activeVehicles = vehicles.filter((v) => v.status === 'in_use' || v.status === 'available').length;
  const walking = reportTransportStats
    ? (reportTransportStats.byMobilityNeed.find((x) => x.type === 'walking')?.count ?? 0)
    : inRange.filter((r) => r.mobilityNeed === 'walking' || !r.mobilityNeed).length;
  const wheelchair = reportTransportStats
    ? (reportTransportStats.byMobilityNeed.find((x) => x.type === 'wheelchair')?.count ?? 0)
    : inRange.filter((r) => r.mobilityNeed === 'wheelchair').length;
  const stretcher = reportTransportStats
    ? (reportTransportStats.byMobilityNeed.find((x) => x.type === 'stretcher')?.count ?? 0)
    : inRange.filter((r) => r.mobilityNeed === 'stretcher').length;
  const totalMob = walking + wheelchair + stretcher || 1;

  const dailyTrips = (() => {
    const byDay: Record<string, number> = {};
    inRange.forEach((r) => {
      const day = r.createdAt.slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
    });
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const out: { day: string; count: number }[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = toDateStr(d);
      out.push({ day: key.slice(8, 10), count: byDay[key] ?? 0 });
    }
    return out.slice(-14);
  })();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KPICard label="إجمالي الرحلات" value={totalTrips} icon="🚐" />
        <KPICard label="رحلات اليوم" value={todayTrips} icon="📅" />
        <KPICard label="مركبات نشطة" value={activeVehicles} icon="🚗" />
        <KPICard label="متوسط وقت الرحلة" value="23 د" icon="⏱" />
        <KPICard label="نسبة الالتزام بالوقت" value="87%" icon="✅" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader><CardTitle className="text-base text-white">رحلات يومية</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTrips} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <XAxis dataKey="day" tick={{ fill: AXIS_FILL, fontFamily: "'Space Mono', monospace", fontSize: 11 }} stroke={BORDER} />
                  <YAxis tick={{ fill: AXIS_FILL, fontFamily: "'Space Mono', monospace", fontSize: 11 }} stroke={BORDER} />
                  <Tooltip contentStyle={{ backgroundColor: TOOLTIP_BG, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8 }} />
                  <Bar dataKey="count" fill={AMBER} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader><CardTitle className="text-base text-white">الاحتياج (تنقل)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm"><span>🚶 مشي</span><span style={{ fontFamily: "'Space Mono', monospace" }}>{walking}</span></div>
              <div className="mt-1 h-2 w-full rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-500/70" style={{ width: `${(walking / totalMob) * 100}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-sm"><span>♿ كرسي متحرك</span><span style={{ fontFamily: "'Space Mono', monospace" }}>{wheelchair}</span></div>
              <div className="mt-1 h-2 w-full rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-500/70" style={{ width: `${(wheelchair / totalMob) * 100}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-sm"><span>🛏 نقالة</span><span style={{ fontFamily: "'Space Mono', monospace" }}>{stretcher}</span></div>
              <div className="mt-1 h-2 w-full rounded-full bg-white/10"><div className="h-full rounded-full bg-purple-500/70" style={{ width: `${(stretcher / totalMob) * 100}%` }} /></div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
        <CardHeader><CardTitle className="text-base text-white">أداء الأسطول</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: BORDER }}>
                  <th className="py-2 text-right text-gray-400">لوحة</th>
                  <th className="py-2 text-right text-gray-400">النوع</th>
                  <th className="py-2 text-right text-gray-400">السائق</th>
                  <th className="py-2 text-right text-gray-400">عدد الرحلات</th>
                  <th className="py-2 text-right text-gray-400">المسافة</th>
                  <th className="py-2 text-right text-gray-400">متوسط الوقت</th>
                  <th className="py-2 text-right text-gray-400">التقييم</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.slice(0, 10).map((v) => (
                  <tr key={v.id} className="border-b" style={{ borderColor: BORDER }}>
                    <td className="py-2 font-medium text-white" style={{ fontFamily: "'Space Mono', monospace" }}>{v.plateNumber ?? v.id.slice(0, 8)}</td>
                    <td className="py-2 text-gray-400">—</td>
                    <td className="py-2 text-gray-400">—</td>
                    <td className="py-2" style={{ fontFamily: "'Space Mono', monospace" }}>—</td>
                    <td className="py-2 text-gray-400">—</td>
                    <td className="py-2 text-gray-400">—</td>
                    <td className="py-2"><Badge className="bg-amber-500/20 text-amber-400 text-xs">—</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FinanceTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard label="إيرادات الشهر" value="$18.2K" icon="💰" />
        <KPICard label="متوسط تكلفة الجلسة" value="$98" icon="💵" />
        <KPICard label="مستحقات معلقة" value="$3.4K" icon="⏳" />
        <KPICard label="التأمين محصل" value="$12.8K" icon="🏥" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader><CardTitle className="text-base text-white">إيرادات أسبوعية</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ w: '1', v: 4 }, { w: '2', v: 5 }, { w: '3', v: 3 }, { w: '4', v: 6 }]} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <XAxis dataKey="w" tick={{ fill: AXIS_FILL, fontFamily: "'Space Mono', monospace", fontSize: 11 }} stroke={BORDER} />
                  <YAxis tick={{ fill: AXIS_FILL, fontFamily: "'Space Mono', monospace", fontSize: 11 }} stroke={BORDER} />
                  <Bar dataKey="v" fill={GREEN} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader><CardTitle className="text-base text-white">مصادر الدخل</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm"><span>التأمين</span><span style={{ fontFamily: "'Space Mono', monospace" }}>70%</span></div>
              <div className="mt-1 h-2 w-full rounded-full bg-white/10"><div className="h-full w-[70%] rounded-full bg-cyan-500/70" /></div>
            </div>
            <div>
              <div className="flex justify-between text-sm"><span>مباشر</span><span style={{ fontFamily: "'Space Mono', monospace" }}>20%</span></div>
              <div className="mt-1 h-2 w-full rounded-full bg-white/10"><div className="h-full w-[20%] rounded-full bg-green-500/70" /></div>
            </div>
            <div>
              <div className="flex justify-between text-sm"><span>نقل</span><span style={{ fontFamily: "'Space Mono', monospace" }}>10%</span></div>
              <div className="mt-1 h-2 w-full rounded-full bg-white/10"><div className="h-full w-[10%] rounded-full bg-amber-500/70" /></div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
        <CardHeader><CardTitle className="text-base text-white">الفواتير الأخيرة</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-gray-400">سيتم ربط البيانات الحقيقية عند بناء نظام الفوترة</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: BORDER }}>
                  <th className="py-2 text-right text-gray-400">#</th>
                  <th className="py-2 text-right text-gray-400">المريض</th>
                  <th className="py-2 text-right text-gray-400">الخدمة</th>
                  <th className="py-2 text-right text-gray-400">المبلغ</th>
                  <th className="py-2 text-right text-gray-400">التأمين</th>
                  <th className="py-2 text-right text-gray-400">المتبقي</th>
                  <th className="py-2 text-right text-gray-400">الحالة</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b" style={{ borderColor: BORDER }}>
                  <td className="py-2 text-gray-400" style={{ fontFamily: "'Space Mono', monospace" }}>—</td>
                  <td className="py-2 text-gray-400">—</td>
                  <td className="py-2 text-gray-400">—</td>
                  <td className="py-2 text-gray-400">—</td>
                  <td className="py-2 text-gray-400">—</td>
                  <td className="py-2 text-gray-400">—</td>
                  <td className="py-2"><Badge className="bg-gray-500/20 text-gray-400 text-xs">—</Badge></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
