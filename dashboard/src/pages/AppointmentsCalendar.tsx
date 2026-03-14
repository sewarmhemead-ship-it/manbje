import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { MOCK_APPOINTMENTS, MOCK_USERS_DOCTORS, isDemoMode } from '@/lib/mock-data';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SkeletonTable } from '@/components/ui/Skeleton';
import type { Appointment, User as ApiUser } from '@/lib/api';

const ACCENT = '#22d3ee';
const FIRST_HOUR = 7;
const LAST_HOUR = 18;
const ROW_HEIGHT = 60;
const TOTAL_MINUTES = (LAST_HOUR - FIRST_HOUR) * 60;

const DAY_NAMES_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'مجدول' },
  { value: 'in_progress', label: 'جلسة نشطة' },
  { value: 'in_transit', label: 'في الطريق' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'cancelled', label: 'ملغى' },
];

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getWeekStart(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getWeekDates(weekStart: Date) {
  const out: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(weekStart);
    x.setDate(weekStart.getDate() + i);
    out.push(x);
  }
  return out;
}

export function AppointmentsCalendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<ApiUser[]>([]);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<Set<string>>(new Set());
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set(['scheduled', 'in_progress', 'in_transit', 'completed']));
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newModalPrefill, setNewModalPrefill] = useState<{ date: string; time: string } | null>(null);

  const isAdmin = user?.role === 'admin';
  const startStr = toDateStr(weekStart);
  const endDate = new Date(weekStart);
  endDate.setDate(endDate.getDate() + (viewMode === 'week' ? 6 : viewMode === 'day' ? 0 : 27));
  const endStr = toDateStr(endDate);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    if (isDemoMode()) {
      setAppointments(MOCK_APPOINTMENTS as Appointment[]);
      setLoading(false);
      return;
    }
    try {
      if (isAdmin) {
        const data = await apiGet<Appointment[]>('/appointments?startDate=' + startStr + '&endDate=' + endStr);
        setAppointments(Array.isArray(data) ? data : []);
      } else if (user?.id) {
        const data = await apiGet<Appointment[]>(`/appointments/doctor/${user.id}?startDate=${startStr}&endDate=${endStr}`);
        setAppointments(Array.isArray(data) ? data : []);
      } else {
        setAppointments([]);
      }
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user?.id, startStr, endStr]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    if (isDemoMode()) {
      setDoctors(MOCK_USERS_DOCTORS as ApiUser[]);
      return;
    }
    if (!isAdmin) {
      if (user?.id) setDoctors([user as ApiUser]);
      return;
    }
    apiGet<ApiUser[]>('/users')
      .then((list) => setDoctors(Array.isArray(list) ? list.filter((u) => u.role === 'doctor') : []))
      .catch(() => setDoctors([]));
  }, [isAdmin, user?.id]);

  useEffect(() => {
    if (doctors.length && selectedDoctorIds.size === 0) {
      setSelectedDoctorIds(new Set(doctors.map((d) => d.id)));
    }
  }, [doctors]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (selectedDoctorIds.size && !selectedDoctorIds.has(a.doctorId)) return false;
      const status = a.status;
      const inTransit = a.transportRequest?.status === 'en_route' || a.transportRequest?.status === 'assigned';
      const effectiveStatus = inTransit && status === 'scheduled' ? 'in_transit' : status;
      if (statusFilters.size && !statusFilters.has(effectiveStatus)) return false;
      return true;
    });
  }, [appointments, selectedDoctorIds, statusFilters]);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const todayStr = toDateStr(new Date());

  const doctorColors = useMemo(() => {
    const colors = ['#22d3ee', '#34d399', '#fbbf24', '#a78bfa', '#f472b6'];
    const m = new Map<string, string>();
    doctors.forEach((d, i) => m.set(d.id, colors[i % colors.length]));
    return m;
  }, [doctors]);

  const toggleDoctor = (id: string) => {
    setSelectedDoctorIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStatus = (value: string) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const openDetail = (a: Appointment) => {
    setSelectedAppointment(a);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedAppointment(null);
  };

  const openNewModal = (date?: string, time?: string) => {
    setNewModalPrefill(date && time ? { date, time } : null);
    setNewModalOpen(true);
  };

  const handleSlotDoubleClick = (date: Date, hour: number, minute: number) => {
    const d = new Date(date);
    d.setHours(hour, minute, 0, 0);
    openNewModal(toDateStr(d), d.toTimeString().slice(0, 5));
  };

  const todayAppointments = useMemo(() => {
    return appointments.filter((a) => toDateStr(new Date(a.startTime)) === todayStr);
  }, [appointments, todayStr]);
  const completedToday = todayAppointments.filter((a) => a.status === 'completed').length;
  const cancelledToday = todayAppointments.filter((a) => a.status === 'cancelled').length;
  const attendanceRate = todayAppointments.length ? Math.round((completedToday / (todayAppointments.length - cancelledToday)) * 100) || 0 : 0;
  const slotsPerHour = 2;
  const totalSlots = (LAST_HOUR - FIRST_HOUR) * slotsPerHour;
  const usedSlots = todayAppointments.length;
  const availableSlots = Math.max(0, totalSlots - usedSlots);

  return (
    <div className="flex min-h-screen bg-[#06080e] text-gray-100" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <aside className="w-[260px] shrink-0 border-l border-cyan-500/20 bg-[#0b0f1a] p-4" dir="rtl">
        <MiniMonthCalendar
          currentMonth={weekStart}
          appointments={appointments}
          onSelectDay={(d) => setWeekStart(getWeekStart(d))}
        />
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-cyan-400">الطبيب</p>
          <div className="space-y-1">
            {doctors.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleDoctor(d.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-right text-sm hover:bg-cyan-500/10"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: selectedDoctorIds.has(d.id) ? doctorColors.get(d.id) ?? ACCENT : 'transparent', border: selectedDoctorIds.has(d.id) ? 'none' : '1px solid #475569' }}
                />
                <span className="truncate">{d.nameAr || d.nameEn || d.email}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-cyan-400">الحالة</p>
          <div className="space-y-1">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={statusFilters.has(value)}
                  onChange={() => toggleStatus(value)}
                  className="rounded border-cyan-500/50 bg-[#06080e] text-cyan-500"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <Card className="mt-6 border-cyan-500/20 bg-[#06080e]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-cyan-400">إحصائيات اليوم</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>المواعيد: {todayAppointments.length}</p>
            <p>نسبة الحضور: {attendanceRate}%</p>
            <p>الإلغاءات: {cancelledToday}</p>
            <p>ال slots المتاحة: {availableSlots}</p>
          </CardContent>
        </Card>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 flex flex-wrap items-center gap-4 border-b border-cyan-500/20 bg-[#0b0f1a] px-6 py-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-cyan-400 hover:bg-cyan-500/20" onClick={() => setWeekStart((d) => { const x = new Date(d); x.setDate(x.getDate() - 7); return x; })}>
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-cyan-400 hover:bg-cyan-500/20" onClick={() => setWeekStart((d) => { const x = new Date(d); x.setDate(x.getDate() + 7); return x; })}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="min-w-[140px] text-lg font-semibold text-white" style={{ fontFamily: "'Space Mono', monospace" }}>
              {weekStart.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <Button variant="outline" size="sm" className="border-cyan-500/30 text-cyan-400" onClick={() => setWeekStart(getWeekStart(new Date()))}>
            اليوم
          </Button>
          <div className="flex gap-1">
            {(['day', 'week', 'month'] as const).map((m) => (
              <Button
                key={m}
                variant={viewMode === m ? 'default' : 'ghost'}
                size="sm"
                className={viewMode === m ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400'}
                onClick={() => setViewMode(m)}
              >
                {m === 'day' ? 'يوم' : m === 'week' ? 'أسبوع' : 'شهر'}
              </Button>
            ))}
          </div>
          <Button className="ml-auto bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" onClick={() => openNewModal()}>
            <Plus className="mr-2 h-4 w-4" /> موعد جديد
          </Button>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {viewMode === 'week' && (
            <>
              {loading ? (
                <div className="min-h-[320px]">
                  <SkeletonTable rows={8} cols={5} />
                </div>
              ) : (
                <WeekView
                  weekDates={weekDates}
                  appointments={filteredAppointments}
                  doctorColors={doctorColors}
                  onSelectAppointment={openDetail}
                  onEmptySlotDoubleClick={handleSlotDoubleClick}
                />
              )}
            </>
          )}
          {viewMode === 'day' && (
            <DayView
              date={weekStart}
              appointments={filteredAppointments.filter((a) => toDateStr(new Date(a.startTime)) === toDateStr(weekStart))}
              doctorColors={doctorColors}
              onSelectAppointment={openDetail}
              onEmptySlotDoubleClick={handleSlotDoubleClick}
            />
          )}
          {viewMode === 'month' && (
            <div className="rounded-xl border border-cyan-500/20 bg-[#0b0f1a] p-4">
              <p className="text-center text-gray-400">عرض الشهر — قريباً</p>
            </div>
          )}
        </div>
      </main>

      {detailOpen && selectedAppointment && (
        <DetailPanel
          appointment={selectedAppointment}
          onClose={closeDetail}
          onRefresh={fetchAppointments}
          onNavigateToPatient={(id) => navigate('/patients/' + id)}
          toast={toast}
        />
      )}

      {newModalOpen && (
        <NewAppointmentModal
          prefill={newModalPrefill}
          onClose={() => { setNewModalOpen(false); setNewModalPrefill(null); }}
          onSuccess={() => { toast('تم حجز الموعد'); setNewModalOpen(false); setNewModalPrefill(null); fetchAppointments(); }}
          toast={toast}
          defaultDoctorId={!isAdmin && user?.id ? user.id : undefined}
        />
      )}
    </div>
  );
}

function MiniMonthCalendar({
  currentMonth,
  appointments,
  onSelectDay,
}: {
  currentMonth: Date;
  appointments: Appointment[];
  onSelectDay: (d: Date) => void;
}) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const daysWithAppointments = useMemo(() => {
    const set = new Set<string>();
    appointments.forEach((a) => set.add(toDateStr(new Date(a.startTime))));
    return set;
  }, [appointments]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-[#06080e] p-3">
      <p className="text-center text-sm font-medium text-cyan-400" style={{ fontFamily: "'Space Mono', monospace" }}>
        {currentMonth.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' })}
      </p>
      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-xs">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const date = new Date(year, month, d);
          const str = toDateStr(date);
          const hasApp = daysWithAppointments.has(str);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDay(date)}
              className="flex h-8 w-full items-center justify-center rounded text-gray-300 hover:bg-cyan-500/20"
            >
              <span className={hasApp ? 'relative' : ''}>
                {d}
                {hasApp && <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-cyan-400" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  weekDates,
  appointments,
  doctorColors,
  onSelectAppointment,
  onEmptySlotDoubleClick,
}: {
  weekDates: Date[];
  appointments: Appointment[];
  doctorColors: Map<string, string>;
  onSelectAppointment: (a: Appointment) => void;
  onEmptySlotDoubleClick: (date: Date, hour: number, minute: number) => void;
}) {
  const todayStr = toDateStr(new Date());
  const now = new Date();
  const isToday = (d: Date) => toDateStr(d) === todayStr;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine = currentMinutes >= FIRST_HOUR * 60 && currentMinutes <= LAST_HOUR * 60;
  const todayColumnIndex = weekDates.findIndex(isToday);

  const rows = [];
  for (let h = FIRST_HOUR; h < LAST_HOUR; h++) {
    rows.push({ hour: h, label: h <= 11 ? `${h}:00 ص` : h === 12 ? '12:00 م' : `${h - 12}:00 م` });
  }

  return (
    <div className="relative rounded-xl border border-cyan-500/20 bg-[#0b0f1a]" dir="rtl">
      <div className="grid gap-0 border-b border-cyan-500/20" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
        <div className="flex items-center justify-center border-l border-cyan-500/10 py-3 text-xs text-gray-500" style={{ fontFamily: "'Space Mono', monospace" }}>
          وقت
        </div>
        {weekDates.map((d) => (
          <div key={d.getTime()} className="border-l border-cyan-500/10 py-3 text-center">
            <p className="text-xs text-gray-400">{DAY_NAMES_AR[d.getDay()]}</p>
            <p
              className={`mt-0.5 text-lg font-semibold ${isToday(d) ? 'flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/30 text-cyan-400 mx-auto' : 'text-white'}`}
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              {d.getDate()}
            </p>
          </div>
        ))}
      </div>
      <div className="relative">
        {showNowLine && todayColumnIndex >= 0 && (
          <div
            className="absolute z-10 flex items-center gap-1 border-t-2 border-red-500 pointer-events-none"
            style={{
              top: ((currentMinutes - FIRST_HOUR * 60) * ROW_HEIGHT) / 60,
              right: `calc(60px + ${todayColumnIndex} * (100% - 60px) / 7)`,
              width: 'calc((100% - 60px) / 7)',
            }}
          >
            <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
          </div>
        )}
        {rows.map(({ hour, label }) => (
          <div
            key={hour}
            className="grid border-b border-cyan-500/10"
            style={{ height: ROW_HEIGHT, gridTemplateColumns: '60px repeat(7, 1fr)' }}
          >
            <div className="flex items-center justify-center border-l border-cyan-500/10 text-xs text-gray-500" style={{ fontFamily: "'Space Mono', monospace" }}>
              {label}
            </div>
            {weekDates.map((date) => (
              <div
                key={date.getTime()}
                className="relative border-l border-cyan-500/10"
                onDoubleClick={(e) => {
                  if (e.target === e.currentTarget) onEmptySlotDoubleClick(date, hour, 0);
                }}
              />
            ))}
          </div>
        ))}
        {appointments.map((a, index) => (
          <AppointmentBlock
            key={a.id}
            appointment={a}
            weekDates={weekDates}
            doctorColors={doctorColors}
            onClick={() => onSelectAppointment(a)}
            styleIndex={index}
          />
        ))}
      </div>
    </div>
  );
}

function AppointmentBlock({
  appointment,
  weekDates,
  doctorColors,
  onClick,
  styleIndex,
}: {
  appointment: Appointment;
  weekDates: Date[];
  doctorColors: Map<string, string>;
  onClick: () => void;
  styleIndex: number;
}) {
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  const dateStr = toDateStr(start);
  const dayIndex = weekDates.findIndex((d) => toDateStr(d) === dateStr);
  if (dayIndex < 0) return null;
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const top = ((startMinutes - FIRST_HOUR * 60) * ROW_HEIGHT) / 60;
  const height = ((endMinutes - startMinutes) * ROW_HEIGHT) / 60;
  const left = (6 - dayIndex) * (100 / 7);
  const width = 100 / 7 - 0.5;

  const status = appointment.status;
  const inTransit = appointment.transportRequest?.status === 'en_route' || appointment.transportRequest?.status === 'assigned';
  const bg =
    status === 'cancelled'
      ? 'bg-red-500/10 opacity-60'
      : status === 'completed'
        ? 'bg-gray-500/20 opacity-70'
        : inTransit
          ? 'bg-amber-500/13'
          : status === 'in_progress'
            ? 'bg-green-500/15 animate-pulse'
            : 'bg-cyan-500/12';

  const color = doctorColors.get(appointment.doctorId) ?? ACCENT;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute rounded-lg border border-cyan-500/20 p-2 text-right ${bg} transition-all hover:ring-2 hover:ring-cyan-500/50`}
      style={{
        top: top + 2,
        height: height - 4,
        left: `calc(${left}% + 60px + 4px)`,
        width: `calc(${width}% - 8px)`,
        animationDelay: `${styleIndex * 50}ms`,
      }}
    >
      <div className="flex items-center gap-1 truncate text-xs font-medium text-white">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        {appointment.patient?.nameAr ?? appointment.patientId}
      </div>
      <p className="mt-0.5 truncate text-xs text-gray-400" style={{ fontFamily: "'Space Mono', monospace" }}>
        {start.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
      </p>
      <div className="mt-1 flex items-center gap-1">
        <span className="text-xs">{appointment.arrivalType === 'center_transport' ? '🚐' : '🚶'}</span>
      </div>
    </button>
  );
}

function DayView({
  date,
  appointments,
  doctorColors,
  onSelectAppointment,
  onEmptySlotDoubleClick,
}: {
  date: Date;
  appointments: Appointment[];
  doctorColors: Map<string, string>;
  onSelectAppointment: (a: Appointment) => void;
  onEmptySlotDoubleClick: (date: Date, hour: number, minute: number) => void;
}) {
  const rows = [];
  for (let h = FIRST_HOUR; h < LAST_HOUR; h++) {
    rows.push({ hour: h });
  }
  const todayStr = toDateStr(new Date());
  const isToday = toDateStr(date) === todayStr;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine = isToday && currentMinutes >= FIRST_HOUR * 60 && currentMinutes <= LAST_HOUR * 60;

  return (
    <div className="relative rounded-xl border border-cyan-500/20 bg-[#0b0f1a]" dir="rtl">
      <div className="grid gap-0" style={{ gridTemplateColumns: '60px 1fr' }}>
        {rows.map(({ hour }) => (
          <div
            key={hour}
            className="grid border-b border-cyan-500/10"
            style={{ height: ROW_HEIGHT, gridTemplateColumns: '60px 1fr' }}
          >
            <div className="flex items-center justify-center border-l border-cyan-500/10 text-xs text-gray-500" style={{ fontFamily: "'Space Mono', monospace" }}>
              {hour <= 11 ? `${hour}:00 ص` : hour === 12 ? '12:00 م' : `${hour - 12}:00 م`}
            </div>
            <div
              className="relative border-l border-cyan-500/10"
              onDoubleClick={() => onEmptySlotDoubleClick(date, hour, 0)}
            >
              {hour === FIRST_HOUR && showNowLine && (
                <div
                  className="absolute left-0 right-0 z-10 flex items-center gap-1 border-t-2 border-red-500"
                  style={{ top: ((currentMinutes - FIRST_HOUR * 60) * ROW_HEIGHT) / 60 }}
                >
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 pointer-events-none" style={{ top: 0, right: 0, left: 0, height: TOTAL_MINUTES * ROW_HEIGHT / 60 }} aria-hidden />
      <div className="absolute top-0 right-[60px] left-2 bottom-0 pointer-events-auto">
        {appointments.map((a) => {
          const start = new Date(a.startTime);
          const end = new Date(a.endTime);
          const startMinutes = start.getHours() * 60 + start.getMinutes();
          const endMinutes = end.getHours() * 60 + end.getMinutes();
          const top = ((startMinutes - FIRST_HOUR * 60) * ROW_HEIGHT) / 60;
          const height = ((endMinutes - startMinutes) * ROW_HEIGHT) / 60;
          const status = a.status;
          const inTransit = a.transportRequest?.status === 'en_route' || a.transportRequest?.status === 'assigned';
          const bg = status === 'cancelled' ? 'bg-red-500/10 opacity-60' : status === 'completed' ? 'bg-gray-500/20 opacity-70' : inTransit ? 'bg-amber-500/13' : status === 'in_progress' ? 'bg-green-500/15 animate-pulse' : 'bg-cyan-500/12';
          const color = doctorColors.get(a.doctorId) ?? ACCENT;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelectAppointment(a)}
              className={`absolute rounded-lg border border-cyan-500/20 p-2 text-right ${bg} ml-2 mr-2`}
              style={{ top: top + 2, height: height - 4, right: 8, left: 8 }}
            >
              <div className="flex items-center gap-1 truncate text-xs font-medium text-white">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                {a.patient?.nameAr ?? a.patientId}
              </div>
              <p className="mt-0.5 text-xs text-gray-400" style={{ fontFamily: "'Space Mono', monospace" }}>
                {start.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <span>{a.arrivalType === 'center_transport' ? '🚐' : '🚶'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DetailPanel({
  appointment,
  onClose,
  onRefresh,
  onNavigateToPatient,
  toast,
}: {
  appointment: Appointment;
  onClose: () => void;
  onRefresh: () => void;
  onNavigateToPatient: (id: string) => void;
  toast: ReturnType<typeof useToast>;
}) {
  const [updating, setUpdating] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const tr = appointment.transportRequest;

  const startSession = async () => {
    setUpdating(true);
    try {
      await apiPatch('/appointments/' + appointment.id + '/status', { status: 'in_progress' });
      toast.success?.('تم بدء الجلسة') ?? toast('تم بدء الجلسة');
      onRefresh();
    } catch {
      toast.error?.('فشل التحديث') ?? toast('فشل التحديث');
    } finally {
      setUpdating(false);
    }
  };

  const cancelAppointment = async () => {
    setUpdating(true);
    try {
      await apiPatch('/appointments/' + appointment.id + '/status', { status: 'cancelled' });
      toast.success?.('تم إلغاء الموعد') ?? toast('تم إلغاء الموعد');
      onRefresh();
      onClose();
    } catch {
      toast.error?.('فشل الإلغاء') ?? toast('فشل الإلغاء');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      className="fixed inset-y-0 left-0 z-50 w-[340px] border-r border-cyan-500/20 bg-[#0b0f1a] shadow-xl"
      style={{ animation: 'slideInLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-cyan-500/20 p-4">
          <h2 className="text-lg font-semibold text-white">تفاصيل الموعد</h2>
          <Button variant="ghost" size="icon" className="text-gray-400" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <p className="text-xl font-medium text-white">{appointment.patient?.nameAr ?? appointment.patientId}</p>
            <StatusBadge status={appointment.status} type="appointment" className="mt-1" />
          </div>
          <div className="text-sm text-gray-400">
            <p>الوقت: {new Date(appointment.startTime).toLocaleTimeString('ar-SA')} – {new Date(appointment.endTime).toLocaleTimeString('ar-SA')}</p>
            <p>الطبيب: {appointment.doctor?.nameAr ?? appointment.doctorId}</p>
            <p>الغرفة: {appointment.room?.name ?? appointment.roomId}</p>
            {appointment.equipment && <p>الجهاز: {appointment.equipment.name}</p>}
          </div>
          <Card className="border-cyan-500/20 bg-[#06080e]">
            <CardContent className="p-3">
              {appointment.arrivalType === 'center_transport' && tr ? (
                <>
                  <p className="text-sm text-cyan-400">النقل</p>
                  <p>لوحة: {tr.vehicle?.plateNumber ?? '—'}</p>
                  <p>السائق: {tr.driver?.user?.nameAr ?? '—'}</p>
                  {tr.pickupTime && <p>وقت الاستلام: {new Date(tr.pickupTime).toISOString().slice(11, 16)}</p>}
                </>
              ) : (
                <p className="text-sm text-green-400">قادم بمفرده</p>
              )}
            </CardContent>
          </Card>
          {appointment.patient && (
            <div className="text-sm text-gray-400">
              {appointment.patient.diagnosis && <p>التشخيص: {appointment.patient.diagnosis}</p>}
              {appointment.patient.phone && <p>الهاتف: {appointment.patient.phone}</p>}
            </div>
          )}
          {appointment.notes && <p className="text-sm text-gray-400">ملاحظات: {appointment.notes}</p>}
          <div className="flex flex-col gap-2 pt-4">
            <Button className="w-full bg-cyan-500/20 text-cyan-400" disabled={updating || appointment.status !== 'scheduled'} onClick={startSession}>
              بدء الجلسة
            </Button>
            <Button variant="outline" className="w-full border-cyan-500/30 text-cyan-400" onClick={() => appointment.patientId && onNavigateToPatient(appointment.patientId)}>
              ملف المريض 360°
            </Button>
            <Button variant="outline" className="w-full border-cyan-500/30" onClick={() => toast('تعديل الموعد — قريباً')}>
              تعديل الموعد
            </Button>
            <Button variant="outline" className="w-full border-red-500/30 text-red-400" disabled={updating || appointment.status === 'cancelled'} onClick={() => setCancelConfirmOpen(true)}>
              إلغاء الموعد
            </Button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={cancelConfirmOpen}
        title="إلغاء الموعد"
        message="هل تريد إلغاء الموعد؟ سيتم إبلاغ المريض."
        confirmLabel="إلغاء الموعد"
        confirmVariant="danger"
        onConfirm={cancelAppointment}
        onCancel={() => setCancelConfirmOpen(false)}
      />
    </div>
  );
}

function NewAppointmentModal({
  prefill,
  onClose,
  onSuccess,
  toast,
  defaultDoctorId,
}: {
  prefill: { date: string; time: string } | null;
  onClose: () => void;
  onSuccess: () => void;
  toast: (m: string) => void;
  defaultDoctorId?: string;
}) {
  const [patients, setPatients] = useState<{ id: string; nameAr?: string }[]>([]);
  const [rooms, setRooms] = useState<{ id: string; name?: string }[]>([]);
  const [equipment, setEquipment] = useState<{ id: string; name?: string }[]>([]);
  const [doctors, setDoctors] = useState<ApiUser[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientId, setPatientId] = useState('');
  const [date, setDate] = useState(prefill?.date ?? toDateStr(new Date()));
  const [time, setTime] = useState(prefill?.time ?? '09:00');
  const [duration, setDuration] = useState(60);
  const [doctorId, setDoctorId] = useState(defaultDoctorId ?? '');
  const [roomId, setRoomId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [arrivalType, setArrivalType] = useState<'self_arrival' | 'center_transport'>('self_arrival');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [mobilityNeed, setMobilityNeed] = useState('walking');
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'daily' | 'weekly' | 'biweekly'>('weekly');
  const [recurrenceCount, setRecurrenceCount] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<{ id: string; nameAr?: string }[]>('/patients').then((r) => setPatients(Array.isArray(r) ? r as { id: string; nameAr?: string }[] : []));
    apiGet<{ id: string; name?: string }[]>('/rooms?activeOnly=true').then((r) => setRooms(Array.isArray(r) ? r as { id: string; name?: string }[] : []));
    apiGet<{ id: string; name?: string }[]>('/equipment?availableOnly=true').then((r) => setEquipment(Array.isArray(r) ? r as { id: string; name?: string }[] : []));
    apiGet<ApiUser[]>('/users')
      .then((r) => {
        const list = Array.isArray(r) ? r.filter((u) => u.role === 'doctor') : [];
        setDoctors(list);
        if (defaultDoctorId) setDoctorId(defaultDoctorId);
        else if (list[0]) setDoctorId(list[0].id);
      })
      .catch(() => {
        if (defaultDoctorId) {
          setDoctors([{ id: defaultDoctorId, role: 'doctor', email: '', nameAr: null, nameEn: null, phone: null, isActive: true }]);
          setDoctorId(defaultDoctorId);
        }
      });
  }, [defaultDoctorId]);

  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients.slice(0, 20);
    const q = patientSearch.toLowerCase();
    return patients.filter((p) => (p.nameAr ?? '').toLowerCase().includes(q)).slice(0, 20);
  }, [patients, patientSearch]);

  const submit = async () => {
    setError('');
    if (!patientId || !doctorId || !roomId || !date || !time) {
      setError('يرجى تعبئة الحقول المطلوبة');
      return;
    }
    const start = new Date(date + 'T' + time);
    const end = new Date(start.getTime() + duration * 60 * 1000);
    const body = {
      patientId,
      doctorId,
      roomId,
      equipmentId: equipmentId || undefined,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      arrivalType,
      notes: notes || undefined,
      ...(arrivalType === 'center_transport' && { pickupAddress, pickupTime: new Date(date + 'T' + pickupTime).toISOString(), mobilityNeed }),
    };

    if (recurring) {
      setSubmitting(true);
      const occurrences: { start: Date; end: Date }[] = [];
      let cur = new Date(start);
      const count = Math.min(20, Math.max(1, recurrenceCount));
      for (let i = 0; i < count; i++) {
        occurrences.push({ start: new Date(cur), end: new Date(cur.getTime() + duration * 60 * 1000) });
        if (recurrenceFreq === 'daily') cur.setDate(cur.getDate() + 1);
        else if (recurrenceFreq === 'weekly') cur.setDate(cur.getDate() + 7);
        else cur.setDate(cur.getDate() + 14);
      }
      let created = 0;
      for (const occ of occurrences) {
        try {
          await apiPost('/appointments', {
            ...body,
            startTime: occ.start.toISOString(),
            endTime: occ.end.toISOString(),
          });
          created++;
        } catch (e) {
          setError((e as Error).message);
          break;
        }
      }
      setSubmitting(false);
      if (created > 0) {
        toast(created === count ? 'تم حجز المواعيد المتكررة' : `تم حجز ${created} مواعيد`);
        onSuccess();
      }
      return;
    }

    setSubmitting(true);
    try {
      await apiPost('/appointments', body);
      onSuccess();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <Card className="w-full max-w-lg border-cyan-500/20 bg-[#0b0f1a] max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between shrink-0">
          <CardTitle className="text-cyan-400">موعد جديد</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </CardHeader>
        <CardContent className="space-y-4 overflow-y-auto shrink flex-1">
          {error && <div className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-400">{error}</div>}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            سيتحقق النظام من توفر الطبيب والغرفة والجهاز تلقائياً
          </div>
          <div>
            <label className="text-sm text-gray-400">المريض</label>
            <input
              list="patients-list"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              onBlur={() => { const p = filteredPatients.find(x => (x.nameAr ?? '').includes(patientSearch)); if (p) setPatientId(p.id); }}
              placeholder="بحث..."
              className="mt-1 w-full rounded-lg border border-cyan-500/30 bg-[#06080e] px-3 py-2 text-white"
            />
            <datalist id="patients-list">
              {filteredPatients.map((p) => (
                <option key={p.id} value={p.nameAr ?? p.id} />
              ))}
            </datalist>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="mt-1 w-full rounded-lg border border-cyan-500/30 bg-[#06080e] px-3 py-2 text-white">
              <option value="">اختر المريض</option>
              {filteredPatients.map((p) => <option key={p.id} value={p.id}>{p.nameAr ?? p.id}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400">التاريخ</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-cyan-500/30 bg-[#06080e] px-3 py-2 text-white" />
            </div>
            <div>
              <label className="text-sm text-gray-400">الوقت</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full rounded-lg border border-cyan-500/30 bg-[#06080e] px-3 py-2 text-white" />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400">المدة (دقيقة)</label>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-cyan-500/30 bg-[#06080e] px-3 py-2 text-white">
              <option value={30}>30</option>
              <option value={60}>60</option>
              <option value={90}>90</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400">الطبيب</label>
            <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="mt-1 w-full rounded-lg border border-cyan-500/30 bg-[#06080e] px-3 py-2 text-white">
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.nameAr || d.nameEn || d.email}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400">الغرفة</label>
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="mt-1 w-full rounded-lg border border-cyan-500/30 bg-[#06080e] px-3 py-2 text-white">
              <option value="">اختر الغرفة</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name ?? r.id}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400">الجهاز (اختياري)</label>
            <select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} className="mt-1 w-full rounded-lg border border-cyan-500/30 bg-[#06080e] px-3 py-2 text-white">
              <option value="">بدون</option>
              {equipment.map((e) => <option key={e.id} value={e.id}>{e.name ?? e.id}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400">نوع الوصول</label>
            <div className="mt-1 flex gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" checked={arrivalType === 'self_arrival'} onChange={() => setArrivalType('self_arrival')} />
                بمفرده
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={arrivalType === 'center_transport'} onChange={() => setArrivalType('center_transport')} />
                نقل المركز
              </label>
            </div>
          </div>
          {arrivalType === 'center_transport' && (
            <>
              <div>
                <label className="text-sm text-gray-400">عنوان الاستلام</label>
                <input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} className="mt-1 w-full rounded-lg border border-cyan-500/30 bg-[#06080e] px-3 py-2 text-white" />
              </div>
              <div>
                <label className="text-sm text-gray-400">وقت الاستلام</label>
                <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="mt-1 w-full rounded-lg border border-cyan-500/30 bg-[#06080e] px-3 py-2 text-white" />
              </div>
              <div>
                <label className="text-sm text-gray-400">الاحتياج</label>
                <select value={mobilityNeed} onChange={(e) => setMobilityNeed(e.target.value)} className="mt-1 w-full rounded-lg border border-cyan-500/30 bg-[#06080e] px-3 py-2 text-white">
                  <option value="walking">مشي</option>
                  <option value="wheelchair">كرسي متحرك</option>
                  <option value="stretcher">نقالة</option>
                </select>
              </div>
            </>
          )}
          <div>
            <label className="text-sm text-gray-400">ملاحظات</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-cyan-500/30 bg-[#06080e] px-3 py-2 text-white" />
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
              مواعيد متكررة
            </label>
          </div>
          {recurring && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">التكرار</label>
                <select value={recurrenceFreq} onChange={(e) => setRecurrenceFreq(e.target.value as any)} className="mt-1 w-full rounded-lg border border-cyan-500/30 bg-[#06080e] px-3 py-2 text-white">
                  <option value="daily">يومي</option>
                  <option value="weekly">أسبوعي</option>
                  <option value="biweekly">كل أسبوعين</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400">عدد الجلسات (حد أقصى 20)</label>
                <input type="number" min={1} max={20} value={recurrenceCount} onChange={(e) => setRecurrenceCount(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-cyan-500/30 bg-[#06080e] px-3 py-2 text-white" />
              </div>
            </div>
          )}
          <Button className="w-full bg-cyan-500/20 text-cyan-400" onClick={submit} disabled={submitting}>{submitting ? 'جاري الحجز...' : 'حجز الموعد'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
