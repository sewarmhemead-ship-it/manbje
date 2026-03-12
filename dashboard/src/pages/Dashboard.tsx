import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Truck,
  Activity,
  DollarSign,
  UserPlus,
  CalendarPlus,
  Car,
  Loader2,
  FileImage,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/api';
import type { Appointment } from '@/lib/api';
import { getTransportRequests } from '@/lib/api-dashboard';
import { MOCK_APPOINTMENTS, MOCK_DASHBOARD_STATS, isDemoMode } from '@/lib/mock-data';
import { getStatusLabel, getStatusBadgeStyle } from '@/lib/statusLabels';

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

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    inTransit: 0,
    activeSessions: 0,
    weeklyRevenue: 0,
  });
  const [liveAppointments, setLiveAppointments] = useState<Appointment[]>([]);
  const [lastUpdateSeconds, setLastUpdateSeconds] = useState(0);

  const load = useCallback(async () => {
    if (isDemoMode()) {
      setStats(MOCK_DASHBOARD_STATS);
      setLiveAppointments(MOCK_APPOINTMENTS as Appointment[]);
      setLoading(false);
      return;
    }
    try {
      const doctorId = user?.role === 'admin' ? undefined : user?.id;
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
        user?.role === 'admin'
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
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => {
      load();
      setLastUpdateSeconds(0);
    }, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setLastUpdateSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cardStyle = { background: '#0b0f1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px' };
  const textMuted = { color: '#4b5875' };
  const textMain = { color: '#dde6f5' };

  return (
    <div className="space-y-8 transition-opacity duration-300" style={{ background: '#06080e' }}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={textMain}>لوحة التحكم</h1>
        <p className="mt-1" style={textMuted}>
          نظرة عامة على النشاط والمواعيد والنقل
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden transition-all duration-200" style={cardStyle}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={textMuted}>مواعيد اليوم</CardTitle>
            <Calendar className="h-5 w-5" style={textMuted} />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" style={textMain}>{stats.todayAppointments}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden transition-all duration-200" style={cardStyle}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={textMuted}>قيد النقل</CardTitle>
            <Truck className="h-5 w-5" style={textMuted} />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" style={textMain}>{stats.inTransit}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden transition-all duration-200" style={cardStyle}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={textMuted}>جلسات نشطة</CardTitle>
            <Activity className="h-5 w-5" style={textMuted} />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" style={textMain}>{stats.activeSessions}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden transition-all duration-200" style={cardStyle}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={textMuted}>إيرادات الأسبوع</CardTitle>
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
              <CardTitle style={textMain}>الحالة المباشرة</CardTitle>
              <p className="text-sm" style={textMuted}>
                المرضى القادمون اليوم — نقل المركز أو ذاتي
              </p>
            </div>
            <span className="text-xs" style={textMuted}>
              آخر تحديث: {lastUpdateSeconds} ثانية
            </span>
          </CardHeader>
          <CardContent>
            {liveAppointments.length === 0 ? (
              <p className="py-8 text-center" style={textMuted}>
                لا توجد مواعيد اليوم
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', ...textMuted }}>
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
                          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
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
                              <span
                                className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                                style={getStatusBadgeStyle(a.status)}
                              >
                                {getStatusLabel(a.status, 'appointment')}
                              </span>
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
            <CardTitle style={textMain}>إجراءات سريعة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'موعد جديد', icon: CalendarPlus, path: '/appointments?new=1' },
              { label: 'إضافة مريض', icon: UserPlus, path: '/patients?new=1' },
              { label: 'تعيين نقل', icon: Car, path: '/transport' },
              { label: 'رفع أشعة', icon: FileImage, path: '/patients' },
              { label: 'التقارير', icon: FileText, path: '/reports' },
            ].map(({ label, icon: Icon, path }) => (
              <Button
                key={path}
                variant="outline"
                className="w-full justify-start gap-3 rounded-xl border-cyan-500/30 text-cyan-400"
                onClick={() => navigate(path)}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
