import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '@/lib/api';
import { STATUS_COLORS, getStatusLabel } from '@/lib/statusLabels';

const BG = '#06080e';
const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';
const CYAN = '#22d3ee';
const GREEN = '#34d399';
const AMBER = '#fbbf24';
const RED = '#f87171';
const PURPLE = '#a78bfa';

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

type DateRangeKey = 'week' | 'month' | '3months' | 'custom';

function getRangeForKey(key: DateRangeKey): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  if (key === 'week') {
    start.setDate(start.getDate() - 6);
  } else if (key === 'month') {
    start.setMonth(start.getMonth() - 1);
  } else if (key === '3months') {
    start.setMonth(start.getMonth() - 3);
  }
  return { start: toDateStr(start), end: toDateStr(end) };
}

interface ReportStats {
  totalAppointments: number;
  attendanceRate: number;
  activePatients: number;
  completedSessions: number;
  transportTotal: number;
  transportCompleted: number;
  transportCancelled: number;
  avgRecovery: number | null;
  last7Days: { date: string; dayName: string; completed: number; in_progress: number; cancelled: number; scheduled?: number }[];
  statusDist: { scheduled: number; completed: number; cancelled: number; in_progress: number };
  topDoctors: { doctorId: string; doctorName: string; total: number; completed: number; attendanceRate: number }[];
  mostActivePatients: { id: string; nameAr: string; sessionCount: number; recoveryScore: number | null; lastVisit: string | null }[];
  transportByDay: { date: string; dayName: string; transportCount: number }[];
}

interface RecoveryPoint {
  date: string;
  score: number;
}

interface RecoveryTrendItem {
  patientId: string;
  patientName: string;
  data: RecoveryPoint[];
}

export function Reports() {
  const navigate = useNavigate();
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [prevStats, setPrevStats] = useState<ReportStats | null>(null);
  const [recoveryTrends, setRecoveryTrends] = useState<RecoveryTrendItem[]>([]);

  const range = dateRangeKey === 'custom' ? { start: customFrom, end: customTo } : getRangeForKey(dateRangeKey);
  const startStr = dateRangeKey === 'custom' ? customFrom : range.start;
  const endStr = dateRangeKey === 'custom' ? customTo : range.end;

  const fetchData = useCallback(async () => {
    if (dateRangeKey === 'custom' && (!customFrom || !customTo)) return;
    setLoading(true);
    setError(null);
    const start = dateRangeKey === 'custom' ? customFrom : range.start;
    const end = dateRangeKey === 'custom' ? customTo : range.end;
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const days = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) || 1;
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (days - 1));
    const prevStartStr = toDateStr(prevStart);
    const prevEndStr = toDateStr(prevEnd);

    try {
      const [currentRes, prevRes] = await Promise.all([
        apiGet<ReportStats>(`/reports/stats?startDate=${start}&endDate=${end}`),
        apiGet<ReportStats>(`/reports/stats?startDate=${prevStartStr}&endDate=${prevEndStr}`).catch(() => null),
      ]);
      setStats(currentRes);
      setPrevStats(prevRes);

      const top3Ids = (currentRes.mostActivePatients ?? []).slice(0, 3).map((p) => p.id).filter(Boolean);
      if (top3Ids.length > 0) {
        const trends = await apiGet<RecoveryTrendItem[]>(
          `/reports/recovery-trends?patientIds=${top3Ids.join(',')}`
        ).catch(() => []);
        setRecoveryTrends(Array.isArray(trends) ? trends : []);
      } else {
        setRecoveryTrends([]);
      }
    } catch {
      setError('تعذر التحميل');
      setStats(null);
      setPrevStats(null);
      setRecoveryTrends([]);
    } finally {
      setLoading(false);
    }
  }, [dateRangeKey, customFrom, customTo, range.start, range.end]);

  useEffect(() => {
    const r = getRangeForKey('month');
    setCustomFrom(r.start);
    setCustomTo(r.end);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportPdf = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (!stats) return;
    const headers = ['التاريخ', 'المواعيد', 'المكتملة', 'الملغاة', 'النقل'];
    const rows = stats.last7Days.map((d) => [
      d.date,
      (d.completed ?? 0) + (d.in_progress ?? 0) + (d.cancelled ?? 0) + (d.scheduled ?? 0),
      d.completed ?? 0,
      d.cancelled ?? 0,
      (stats.transportByDay ?? []).find((t) => t.date === d.date)?.transportCount ?? 0,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقارير-${startStr}-${endStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalApts = stats?.totalAppointments ?? 0;
  const prevTotalApts = prevStats?.totalAppointments ?? 0;
  const trendPct = prevTotalApts ? Math.round(((totalApts - prevTotalApts) / prevTotalApts) * 100) : 0;
  const attendancePct = stats?.attendanceRate ?? 0;
  const activePatients = stats?.activePatients ?? 0;
  const completedCount = stats?.completedSessions ?? 0;
  const transportCompleted = stats?.transportCompleted ?? 0;
  const transportCancelled = stats?.transportCancelled ?? 0;
  const transportTotal = stats?.transportTotal ?? 0;
  const wheelchairCount = 0;
  const avgRecovery = stats?.avgRecovery ?? null;
  const recoveryColor = avgRecovery == null ? '#4b5875' : avgRecovery > 70 ? GREEN : avgRecovery >= 40 ? AMBER : RED;

  const last7Days = stats?.last7Days ?? [];
  const statusDistribution = stats?.statusDist
    ? Object.entries(stats.statusDist).filter(([, n]) => n > 0)
    : [];
  const doctorStats = (stats?.topDoctors ?? []).map((d) => ({
    id: d.doctorId,
    name: d.doctorName,
    sessions: d.total,
    completed: d.completed,
    attendance: d.attendanceRate,
  }));
  const topPatients = stats?.mostActivePatients ?? [];
  const transportByDay = (stats?.transportByDay ?? []).map((d) => ({
    date: d.date,
    dayName: d.dayName,
    count: d.transportCount,
  }));
  const maxTransportCount = Math.max(1, ...transportByDay.map((d) => d.count));

  const recoveryCurves: Record<string, { date: string; recoveryScore: number }[]> = {};
  recoveryTrends
    .filter((r) => (r.data?.length ?? 0) >= 2)
    .forEach((r) => {
      recoveryCurves[r.patientId] = (r.data ?? []).map((p) => ({ date: p.date, recoveryScore: p.score }));
    });
  const recoveryPatientNames: { id: string; nameAr: string }[] = recoveryTrends.map((r) => ({
    id: r.patientId,
    nameAr: r.patientName,
  }));

  if (error) {
    return (
      <div className="reports-page min-h-screen p-6" style={{ background: BG }}>
        <div className="rounded-2xl border p-6" style={{ background: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.3)' }}>
          <p className="text-amber-200">تعذر التحميل — إعادة المحاولة</p>
          <button type="button" className="mt-3 rounded-lg bg-amber-500/20 px-4 py-2 text-amber-400 hover:bg-amber-500/30" onClick={() => fetchData()}>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="reports-page min-h-screen"
      style={{
        background: BG,
        fontFamily: 'Cairo, sans-serif',
        backgroundImage: 'radial-gradient(ellipse at 0% 0%, rgba(34,211,238,0.06) 0%, transparent 50%)',
      }}
    >
      <header className="sticky top-0 z-10 border-b px-6 py-4 print:static" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-[#dde6f5]">📊 التقارير والإحصائيات</h1>
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <div className="flex rounded-xl border p-1" style={{ borderColor: BORDER, backgroundColor: BG }}>
              {(['week', 'month', '3months'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDateRangeKey(key)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${dateRangeKey === key ? 'bg-cyan-500/20 text-cyan-400' : 'text-[#4b5875] hover:text-[#dde6f5]'}`}
                >
                  {key === 'week' ? 'هذا الأسبوع' : key === 'month' ? 'هذا الشهر' : 'آخر 3 أشهر'}
                </button>
              ))}
            </div>
            {dateRangeKey === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border bg-[#101622] px-2 py-1.5 text-sm text-[#dde6f5]"
                  style={{ borderColor: BORDER }}
                />
                <span className="text-[#4b5875]">→</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border bg-[#101622] px-2 py-1.5 text-sm text-[#dde6f5]"
                  style={{ borderColor: BORDER }}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setDateRangeKey('custom')}
              className="rounded-lg border px-3 py-1.5 text-sm text-[#4b5875] hover:text-[#dde6f5]"
              style={{ borderColor: BORDER }}
            >
              مخصص
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!stats}
              className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-transparent px-4 py-2 text-sm text-[#dde6f5] hover:bg-white/5 disabled:opacity-50"
            >
              تصدير CSV
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-transparent px-4 py-2 text-sm text-[#dde6f5] hover:bg-white/5"
            >
              تصدير PDF
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-[#4b5875] print:mt-0">
          من {startStr} إلى {endStr}
        </p>
      </header>

      <main className="p-6 print:p-0">
        {error && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4" style={{ borderColor: 'rgba(251,191,36,0.3)' }}>
            <p className="text-amber-200">{error}</p>
            <button type="button" onClick={() => fetchData()} className="mt-2 rounded-lg bg-amber-500/20 px-3 py-1.5 text-sm text-amber-200 hover:bg-amber-500/30">
              إعادة المحاولة
            </button>
          </div>
        )}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border p-4" style={{ background: SURFACE, borderColor: BORDER }}>
                <div className="h-4 w-2/3 rounded bg-white/10" />
                <div className="mt-2 h-8 w-1/2 rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : !error && stats && totalApts === 0 ? (
          <div className="rounded-2xl border p-8 text-center" style={{ background: SURFACE, borderColor: BORDER }}>
            <p className="text-[#dde6f5]">لا توجد بيانات للفترة المحددة</p>
            <p className="mt-2 text-sm text-[#4b5875]">جرب تغيير نطاق التاريخ</p>
          </div>
        ) : !error && stats ? (
          <>
            {/* Section 1 — KPI Cards */}
            <section className="report-section mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6 print:break-after-page" style={{ animation: 'fadeUp 0.3s ease-out both' }}>
              <KPICard
                styleIndex={0}
                label="إجمالي المواعيد"
                value={totalApts}
                subStat={trendPct !== 0 ? `${trendPct > 0 ? '↑' : '↓'} ${Math.abs(trendPct)}% عن الفترة السابقة` : undefined}
                trend={trendPct > 0 ? 'up' : trendPct < 0 ? 'down' : undefined}
                accent={CYAN}
                icon="📅"
              />
              <KPICard
                styleIndex={1}
                label="معدل الحضور"
                value={`${attendancePct}%`}
                accent={GREEN}
                icon="✅"
              />
              <KPICard
                styleIndex={2}
                label="مرضى نشطون"
                value={activePatients}
                accent={PURPLE}
                icon="👥"
              />
              <KPICard
                styleIndex={3}
                label="جلسات مكتملة"
                value={completedCount}
                accent={GREEN}
                icon="⚡"
              />
              <KPICard
                styleIndex={4}
                label="طلبات النقل"
                value={transportTotal}
                subStat={`${transportCompleted} مكتمل / ${transportCancelled} ملغى`}
                accent={AMBER}
                icon="🚐"
              />
              <KPICard
                styleIndex={5}
                label="متوسط التعافي"
                value={avgRecovery != null ? `${avgRecovery}%` : 'لا بيانات'}
                accent={recoveryColor}
                icon="📈"
                progress={avgRecovery != null ? avgRecovery : undefined}
              />
            </section>

            {/* Section 2 — Charts */}
            <section className="report-section mb-8 grid gap-6 lg:grid-cols-10 print:break-after-page" style={{ animation: 'fadeUp 0.3s ease-out both', animationDelay: '50ms' }}>
              <div className="lg:col-span-6 rounded-2xl border p-4" style={{ background: SURFACE, borderColor: BORDER }}>
                <h3 className="mb-4 text-sm font-medium text-[#4b5875]">المواعيد الأسبوعية</h3>
                <BarChartSVG data={last7Days} />
              </div>
              <div className="lg:col-span-4 rounded-2xl border p-4" style={{ background: SURFACE, borderColor: BORDER }}>
                <h3 className="mb-4 text-sm font-medium text-[#4b5875]">توزيع الحالات</h3>
                <DonutChartSVG data={statusDistribution} total={totalApts} />
              </div>
            </section>

            {/* Section 3 — Tables */}
            <section className="report-section mb-8 grid gap-6 lg:grid-cols-2 print:break-after-page" style={{ animation: 'fadeUp 0.3s ease-out both', animationDelay: '100ms' }}>
              <div className="rounded-2xl border overflow-hidden" style={{ background: SURFACE, borderColor: BORDER }}>
                <div className="border-b px-4 py-3" style={{ borderColor: BORDER }}>
                  <h3 className="text-sm font-medium text-[#dde6f5]">أفضل الأطباء</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderColor: BORDER }}>
                        <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-[#4b5875]" style={{ fontFamily: "'Space Mono', monospace" }}>الطبيب</th>
                        <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-[#4b5875]" style={{ fontFamily: "'Space Mono', monospace" }}>الجلسات</th>
                        <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-[#4b5875]" style={{ fontFamily: "'Space Mono', monospace" }}>معدل الحضور</th>
                        <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-[#4b5875]" style={{ fontFamily: "'Space Mono', monospace" }}>متوسط التعافي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorStats.map((d) => (
                        <tr key={d.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                          <td className="px-4 py-3">
                            <span className="inline-block h-2 w-2 rounded-full bg-cyan-500 mr-2" />
                            <span className="text-[#dde6f5]">{d.name}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[#dde6f5]" style={{ fontFamily: "'Space Mono', monospace" }}>{d.sessions}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                                <div className="h-full rounded-full bg-green-500" style={{ width: `${d.attendance}%` }} />
                              </div>
                              <span className="text-xs text-[#4b5875]" style={{ fontFamily: "'Space Mono', monospace" }}>{d.attendance}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[#4b5875]">—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t px-4 py-2 text-center" style={{ borderColor: BORDER }}>
                  <button type="button" className="text-xs text-cyan-400 hover:underline print:hidden">عرض الكل</button>
                </div>
              </div>
              <div className="rounded-2xl border overflow-hidden" style={{ background: SURFACE, borderColor: BORDER }}>
                <div className="border-b px-4 py-3" style={{ borderColor: BORDER }}>
                  <h3 className="text-sm font-medium text-[#dde6f5]">المرضى الأكثر نشاطاً</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderColor: BORDER }}>
                        <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-[#4b5875]" style={{ fontFamily: "'Space Mono', monospace" }}>المريض</th>
                        <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-[#4b5875]" style={{ fontFamily: "'Space Mono', monospace" }}>الجلسات</th>
                        <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-[#4b5875]" style={{ fontFamily: "'Space Mono', monospace" }}>التعافي</th>
                        <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-[#4b5875]" style={{ fontFamily: "'Space Mono', monospace" }}>آخر زيارة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPatients.map((p) => {
                        const score = p.recoveryScore ?? null;
                        const barColor = score == null ? '#4b5875' : score > 70 ? GREEN : score >= 40 ? AMBER : RED;
                        return (
                          <tr
                            key={p.id}
                            className="cursor-pointer border-b hover:bg-white/[0.02] print:cursor-default"
                            style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                            onClick={() => navigate(`/patients/${p.id}`)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/30 to-cyan-600/20 text-xs font-bold text-white">
                                  {(p.nameAr ?? '؟').slice(0, 2)}
                                </div>
                                <span className="text-[#dde6f5]">{p.nameAr}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-[#dde6f5]" style={{ fontFamily: "'Space Mono', monospace" }}>{p.sessionCount}</td>
                            <td className="px-4 py-3">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                                <div className="h-full rounded-full" style={{ width: `${score ?? 0}%`, backgroundColor: barColor }} />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[#4b5875]" style={{ fontFamily: "'Space Mono', monospace" }}>
                              {p.lastVisit ?? '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Section 4 — Transport */}
            <section className="report-section mb-8 rounded-2xl border p-6 print:break-after-page" style={{ background: SURFACE, borderColor: BORDER, animation: 'fadeUp 0.3s ease-out both', animationDelay: '150ms' }}>
              <h3 className="mb-4 text-base font-medium text-[#dde6f5]">📊 تحليل النقل</h3>
              <div className="mb-6 flex flex-wrap gap-6">
                <div>
                  <p className="text-[11px] text-[#4b5875]">معدل إكمال الرحلات</p>
                  <p className="text-2xl font-bold text-[#dde6f5]" style={{ fontFamily: "'Space Mono', monospace" }}>
                    {transportTotal ? Math.round((transportCompleted / transportTotal) * 100) : 0}%
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#4b5875]">متوسط وقت الاستلام</p>
                  <p className="text-2xl font-bold text-amber-400" style={{ fontFamily: "'Space Mono', monospace" }}>—</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#4b5875]">احتياجية كرسي متحرك</p>
                  <p className="text-2xl font-bold text-[#dde6f5]" style={{ fontFamily: "'Space Mono', monospace" }}>{wheelchairCount}</p>
                </div>
              </div>
              <TransportBarChartSVG data={transportByDay} maxCount={maxTransportCount} />
            </section>

            {/* Section 5 — Recovery Trends */}
            <section className="report-section rounded-2xl border p-6 print:break-after-page" style={{ background: SURFACE, borderColor: BORDER, animation: 'fadeUp 0.3s ease-out both', animationDelay: '200ms' }}>
              <h3 className="mb-4 text-base font-medium text-[#dde6f5]">📈 منحنى التعافي العام</h3>
              <RecoveryLineChartSVG curves={recoveryCurves} patients={recoveryPatientNames} />
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

function KPICard({
  label,
  value,
  subStat,
  trend,
  accent,
  icon,
  progress,
  styleIndex,
}: {
  label: string;
  value: string | number;
  subStat?: string;
  trend?: 'up' | 'down';
  accent: string;
  icon: string;
  progress?: number;
  styleIndex?: number;
}) {
  return (
    <div
      className="rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
      style={{
        background: SURFACE,
        borderColor: BORDER,
        borderTop: `2px solid ${accent}`,
        animation: 'fadeUp 0.3s ease-out both',
        animationDelay: styleIndex != null ? `${styleIndex * 50}ms` : undefined,
      }}
    >
      {icon && <span className="text-xl opacity-80">{icon}</span>}
      <p className="mt-1 text-[11px] text-[#4b5875]">{label}</p>
      <p className="mt-0.5 text-[32px] font-bold" style={{ color: accent, fontFamily: "'Space Mono', monospace" }}>
        {value}
      </p>
      {subStat && (
        <p className="mt-1 text-[10px] text-[#4b5875]">{subStat}</p>
      )}
      {trend != null && (
        <p className={`text-[10px] ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
          {trend === 'up' ? '↑' : '↓'}
        </p>
      )}
      {progress != null && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, progress)}%`, backgroundColor: accent }} />
        </div>
      )}
    </div>
  );
}

function BarChartSVG({
  data,
}: {
  data: { dayName: string; completed: number; in_progress: number; cancelled: number }[];
}) {
  const w = 400;
  const h = 220;
  const pad = { left: 40, right: 20, top: 20, bottom: 36 };
  const maxVal = Math.max(1, ...data.map((d) => d.completed + d.in_progress + d.cancelled));
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const barW = Math.max(8, (chartW / data.length) * 0.5);

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <rect width={w} height={h} fill={SURFACE} />
      {data.map((d, i) => {
        const total = d.completed + d.in_progress + d.cancelled;
        const scale = total / maxVal;
        const barTotalH = Math.max(4, scale * chartH * 0.8);
        const x = pad.left + (i + 0.5) * (chartW / data.length) - barW / 2;
        const yAcc = pad.top + chartH - barTotalH;
        const segH = (n: number) => (total ? (n / total) * barTotalH : 0);
        const yCancelled = yAcc;
        const yInProgress = yAcc + segH(d.cancelled);
        const yCompleted = yAcc + segH(d.cancelled) + segH(d.in_progress);
        return (
          <g key={d.dayName}>
            {d.completed > 0 && <rect x={x} y={yCompleted} width={barW} height={segH(d.completed)} rx={2} fill={GREEN} />}
            {d.in_progress > 0 && <rect x={x} y={yInProgress} width={barW} height={segH(d.in_progress)} rx={2} fill={CYAN} />}
            {d.cancelled > 0 && <rect x={x} y={yCancelled} width={barW} height={segH(d.cancelled)} rx={2} fill={RED} />}
            <text x={x + barW / 2} y={h - 8} textAnchor="middle" fill="#4b5875" fontSize="10" fontFamily="Cairo">
              {d.dayName}
            </text>
          </g>
        );
      })}
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={h - pad.bottom} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      <line x1={pad.left} y1={h - pad.bottom} x2={w - pad.right} y2={h - pad.bottom} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
    </svg>
  );
}

function DonutChartSVG({ data, total }: { data: [string, number][]; total: number }) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;
  let acc = 0;
  const segments = data.map(([status, count]) => {
    const pct = total ? count / total : 0;
    const start = acc;
    acc += pct;
    return { status, count, start: start * 360, sweep: pct * 360, color: STATUS_COLORS[status] ?? '#4b5875' };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => {
          const startRad = (seg.start - 90) * (Math.PI / 180);
          const endRad = (seg.start + seg.sweep - 90) * (Math.PI / 180);
          const x1 = cx + r * Math.cos(startRad);
          const y1 = cy + r * Math.sin(startRad);
          const x2 = cx + r * Math.cos(endRad);
          const y2 = cy + r * Math.sin(endRad);
          const large = seg.sweep > 180 ? 1 : 0;
          const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
          return <path key={i} d={d} fill={seg.color} opacity={0.9} />;
        })}
        <circle cx={cx} cy={cy} r={r * 0.55} fill={SURFACE} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#dde6f5" fontSize="18" fontFamily="'Space Mono', monospace">
          {total}
        </text>
      </svg>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <span key={seg.status} className="flex items-center gap-1.5 text-xs text-[#4b5875]">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
            {getStatusLabel(seg.status, 'appointment')}
          </span>
        ))}
      </div>
    </div>
  );
}

function TransportBarChartSVG({ data, maxCount }: { data: { date?: string; dayName: string; count: number }[]; maxCount: number }) {
  const chartW = 200;

  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.date ?? d.dayName} className="flex items-center gap-3" style={{ direction: 'rtl' }}>
          <span className="w-[52px] text-left text-xs text-[#4b5875]">{d.dayName}</span>
          <div className="flex-1" style={{ maxWidth: chartW }}>
            <div
              className="h-6 rounded-md transition-all"
              style={{
                width: `${maxCount ? (d.count / maxCount) * 100 : 0}%`,
                backgroundColor: AMBER,
                minWidth: d.count ? 8 : 0,
              }}
            />
          </div>
          <span className="w-8 text-left font-mono text-xs text-[#4b5875]" style={{ fontFamily: "'Space Mono', monospace" }}>
            {d.count}
          </span>
        </div>
      ))}
    </div>
  );
}

type RecoveryChartPoint = { date: string; score?: number; recoveryScore?: number };

function RecoveryLineChartSVG({
  curves,
  patients,
}: {
  curves: Record<string, RecoveryChartPoint[]>;
  patients: { id: string; nameAr?: string }[];
}) {
  const patientIds = Object.keys(curves).filter((id) => (curves[id]?.length ?? 0) >= 2);
  const colors = [CYAN, GREEN, PURPLE];
  const w = 600;
  const h = 220;
  const pad = { left: 50, right: 80, top: 20, bottom: 30 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  const getScore = (p: RecoveryChartPoint) => p.recoveryScore ?? p.score ?? 0;

  const allDates = Array.from(
    new Set(patientIds.flatMap((id) => (curves[id] ?? []).map((p) => p.date))).values()
  ).sort();
  const minDate = allDates[0] ?? '';
  const maxDate = allDates[allDates.length - 1] ?? minDate;
  const dateRange = maxDate && minDate ? (new Date(maxDate).getTime() - new Date(minDate).getTime()) / 86400000 : 1;

  const getX = (date: string) => {
    const t = minDate ? (new Date(date).getTime() - new Date(minDate).getTime()) / 86400000 / dateRange : 0;
    return pad.left + t * chartW;
  };
  const getY = (score: number) => pad.top + chartH - (score / 100) * chartH;

  if (patientIds.length === 0) {
    return <p className="py-8 text-center text-[#4b5875]">لا توجد جلسات مسجلة بعد</p>;
  }

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <rect width={w} height={h} fill={SURFACE} />
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={h - pad.bottom} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      <line x1={pad.left} y1={h - pad.bottom} x2={w - pad.right} y2={h - pad.bottom} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      {[0, 25, 50, 75, 100].map((v) => (
        <text key={v} x={pad.left - 6} y={getY(v)} textAnchor="end" dominantBaseline="middle" fill="#4b5875" fontSize="9" fontFamily="'Space Mono', monospace">
          {v}
        </text>
      ))}
      {patientIds.map((id, idx) => {
        const points = (curves[id] ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
        const color = colors[idx % colors.length];
        const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.date)} ${getY(getScore(p))}`).join(' ');
        const firstX = points[0] ? getX(points[0].date) : pad.left;
        const lastX = points[points.length - 1] ? getX(points[points.length - 1].date) : pad.left;
        const bottomY = h - pad.bottom;
        const areaD = `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
        const name = patients.find((p) => p.id === id)?.nameAr ?? id.slice(0, 8);
        return (
          <g key={id}>
            <path d={areaD} fill={color} fillOpacity="0.08" />
            <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p) => (
              <circle key={p.date} cx={getX(p.date)} cy={getY(getScore(p))} r="3" fill={color} />
            ))}
            <text x={w - pad.right + 8} y={pad.top + 20 + idx * 18} fill={color} fontSize="10" fontFamily="Cairo">
              {name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
