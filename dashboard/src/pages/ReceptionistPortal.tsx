import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/lib/toast';
import { getStatusLabel, getStatusBadgeStyle } from '@/lib/statusLabels';
import { Loader2, X } from 'lucide-react';
import type { Appointment } from '@/lib/api';

const BG = '#06080e';
const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';
const AMBER = '#fbbf24';
const RED = '#f87171';
const CYAN = '#22d3ee';

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}
function toArabicDate(d: Date) {
  return d.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

type TabId = 'today' | 'book' | 'register' | 'transport';

export function ReceptionistPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<TabId>('today');
  const [preSelectPatient, setPreSelectPatient] = useState<{ id: string; nameAr?: string } | null>(null);

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'today', label: 'استقبال اليوم', icon: '📅' },
    { id: 'book', label: 'حجز موعد', icon: '➕' },
    { id: 'register', label: 'تسجيل مريض', icon: '👤' },
    { id: 'transport', label: 'طلب نقل', icon: '🚐' },
  ];

  return (
    <div className="min-h-screen" style={{ background: BG, fontFamily: 'Cairo, sans-serif' }}>
      <div
        className="border-b px-6 py-4"
        style={{
          borderColor: BORDER,
          background: SURFACE,
          backgroundImage: 'radial-gradient(ellipse at top right, rgba(251,191,36,0.08) 0%, transparent 50%)',
        }}
      >
        <h1 className="text-xl font-bold" style={{ color: AMBER }}>🏢 بوابة الاستقبال</h1>
        <p className="mt-1 text-sm text-[#4b5875]">
          {toArabicDate(new Date())} — مرحباً {user?.nameAr ?? user?.email}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
                tab === t.id
                  ? 'text-black'
                  : 'text-[#4b5875] hover:text-[#dde6f5]'
              }`}
              style={{
                background: tab === t.id ? AMBER : 'rgba(255,255,255,0.06)',
              }}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {tab === 'today' && <TodayTab toast={toast} navigate={navigate} />}
        {tab === 'book' && (
          <BookTab
            toast={toast}
            preSelectPatient={preSelectPatient}
            onClearPreSelect={() => setPreSelectPatient(null)}
            onSwitchToRegister={() => setTab('register')}
            onSuccess={() => setTab('today')}
          />
        )}
        {tab === 'register' && (
          <RegisterTab
            toast={toast}
            onSwitchToBook={(patient) => {
              setPreSelectPatient(patient);
              setTab('book');
            }}
          />
        )}
        {tab === 'transport' && <TransportTab toast={toast} />}
      </div>
    </div>
  );
}

// —— Tab 1: استقبال اليوم ——
function TodayTab({ toast, navigate }: { toast: (m: string) => void; navigate: (path: string) => void }) {
  const todayStr = todayDateStr();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiGet<Appointment[]>(`/appointments?startDate=${todayStr}&endDate=${todayStr}`)
      .then((data) => setAppointments(Array.isArray(data) ? data.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()) : []))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [todayStr]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = search.trim()
    ? appointments.filter(
        (a) =>
          (a.patient?.nameAr ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (a.doctor?.nameAr ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : appointments;

  const stats = {
    total: appointments.length,
    attended: appointments.filter((a) => a.status === 'completed' || a.status === 'in_progress').length,
    noShow: appointments.filter((a) => a.status === 'no_show').length,
    scheduled: appointments.filter((a) => a.status === 'scheduled').length,
  };

  const markInProgress = async (id: string) => {
    setUpdating(id);
    try {
      await apiPatch(`/appointments/${id}/status`, { status: 'in_progress' });
      toast('✓ تم تسجيل الحضور');
      load();
    } catch {
      toast('فشل التحديث');
    } finally {
      setUpdating(null);
    }
  };

  const markNoShow = async (id: string) => {
    setUpdating(id);
    try {
      await apiPatch(`/appointments/${id}/status`, { status: 'no_show' });
      toast('✓ تم تسجيل عدم الحضور');
      load();
    } catch {
      toast('فشل التحديث');
    } finally {
      setUpdating(null);
    }
  };

  const noShowPatientIds = appointments.filter((a) => a.status === 'no_show').map((a) => a.patientId).filter(Boolean) as string[];
  const sendNoShowReminder = async () => {
    if (noShowPatientIds.length === 0) return;
    setSendingReminder(true);
    try {
      await apiPost('/notifications/send-bulk', {
        patientIds: noShowPatientIds,
        type: 'manual',
        channel: 'whatsapp',
        vars: { message: 'تذكير: لم نحصل على حضورك في الموعد. يرجى التواصل مع المركز لإعادة الحجز.' },
      });
      toast('✓ تم إرسال التذكير');
    } catch {
      toast('فشل الإرسال');
    } finally {
      setSendingReminder(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isPastBy15Min = (startTime: string) => {
    const start = new Date(startTime).getTime();
    return Date.now() - start >= 15 * 60 * 1000;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'موعد اليوم', value: stats.total },
          { label: 'حضر', value: stats.attended },
          { label: 'لم يحضر', value: stats.noShow },
          { label: 'قادم', value: stats.scheduled },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border p-4"
            style={{ background: SURFACE, borderColor: BORDER, borderTop: `3px solid ${AMBER}` }}
          >
            <p className="text-[11px] text-[#4b5875]">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: AMBER, fontFamily: "'Space Mono', monospace" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {stats.noShow > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border p-4" style={{ background: 'rgba(251,191,36,0.1)', borderColor: AMBER }}>
          <span className="text-amber-400">⚠️ {stats.noShow} مريض لم يحضر اليوم — هل تريد إرسال إشعار؟</span>
          <button
            type="button"
            onClick={sendNoShowReminder}
            disabled={sendingReminder}
            className="rounded-xl px-4 py-2 text-sm font-medium text-black hover:opacity-90"
            style={{ background: AMBER }}
          >
            {sendingReminder ? 'جاري الإرسال...' : 'إرسال تذكير'}
          </button>
        </div>
      )}

      <div className="rounded-2xl border overflow-hidden" style={{ background: SURFACE, borderColor: BORDER }}>
        <div className="flex flex-wrap items-center gap-3 border-b p-3" style={{ borderColor: BORDER }}>
          <h3 className="font-medium text-[#dde6f5]">قائمة مواعيد اليوم</h3>
          <input
            type="text"
            placeholder="بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5] w-48"
            style={{ borderColor: BORDER }}
          />
          <button
            type="button"
            onClick={handlePrint}
            className="mr-auto rounded-xl px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/10"
          >
            تصدير PDF قائمة اليوم
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-amber-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-[#4b5875]">لا مواعيد اليوم</div>
          ) : (
            <table className="w-full text-right text-sm">
              <thead>
                <tr style={{ borderColor: BORDER }}>
                  <th className="p-3 font-medium text-[#4b5875]">المريض / الطبيب</th>
                  <th className="p-3 font-medium text-[#4b5875]">الوقت</th>
                  <th className="p-3 font-medium text-[#4b5875]">الوصول</th>
                  <th className="p-3 font-medium text-[#4b5875]">الحالة</th>
                  <th className="p-3 font-medium text-[#4b5875]">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const statusStyle = getStatusBadgeStyle(a.status);
                  return (
                    <tr key={a.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: BORDER }}>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: `${CYAN}44` }}>
                            {(a.patient?.nameAr ?? '—').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-[#dde6f5]">{a.patient?.nameAr ?? '—'}</p>
                            <p className="text-xs text-[#4b5875]">د. {a.doctor?.nameAr ?? '—'} · {a.room?.name ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[#dde6f5]">
                        {new Date(a.startTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3">
                        {a.arrivalType === 'center_transport' ? '🚐 سيارة' : '🚶 بمفرده'}
                      </td>
                      <td className="p-3">
                        <span className="rounded px-2 py-0.5 text-xs" style={statusStyle}>
                          {getStatusLabel(a.status, 'appointment')}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {a.status === 'scheduled' && (
                            <button
                              type="button"
                              disabled={!!updating}
                              onClick={() => markInProgress(a.id)}
                              className="rounded-lg bg-amber-500/20 px-2 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/30 disabled:opacity-50"
                            >
                              تسجيل حضور
                            </button>
                          )}
                          {a.status === 'scheduled' && isPastBy15Min(a.startTime) && (
                            <button
                              type="button"
                              disabled={!!updating}
                              onClick={() => markNoShow(a.id)}
                              className="rounded-lg bg-red-500/20 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                            >
                              لم يحضر
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => a.patientId && navigate(`/patients/${a.patientId}`)}
                            className="rounded-lg border px-2 py-1.5 text-xs text-[#dde6f5] hover:bg-white/5"
                            style={{ borderColor: BORDER }}
                          >
                            عرض المريض
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// —— Tab 2: حجز موعد (simplified booking form, amber theme) ——
function BookTab({
  toast,
  preSelectPatient,
  onClearPreSelect,
  onSwitchToRegister,
  onSuccess,
}: {
  toast: (m: string) => void;
  preSelectPatient: { id: string; nameAr?: string } | null;
  onClearPreSelect: () => void;
  onSwitchToRegister: () => void;
  onSuccess: () => void;
}) {
  const [patients, setPatients] = useState<{ id: string; nameAr?: string; phone?: string }[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; nameAr?: string; specialty?: string }[]>([]);
  const [rooms, setRooms] = useState<{ id: string; roomNumber?: string }[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientId, setPatientId] = useState('');
  useEffect(() => {
    if (preSelectPatient) {
      setPatientId(preSelectPatient.id);
      setPatientSearch(preSelectPatient.nameAr ?? '');
      onClearPreSelect();
    }
  }, [preSelectPatient, onClearPreSelect]);
  const [doctorId, setDoctorId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [date, setDate] = useState(todayDateStr());
  const [time, setTime] = useState('09:00');
  const [arrivalType, setArrivalType] = useState<'self_arrival' | 'center_transport'>('self_arrival');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupTime, setPickupTime] = useState('08:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingSlots, setExistingSlots] = useState<Appointment[]>([]);

  useEffect(() => {
    apiGet<{ id: string; nameAr?: string; phone?: string }[]>('/patients?search=&limit=100').then((r) => {
      const data = Array.isArray(r) ? r : (r as { data?: typeof r })?.data ?? [];
      setPatients(Array.isArray(data) ? data : []);
    }).catch(() => setPatients([]));
    apiGet<{ id: string; nameAr?: string; specialty?: string; role: string }[]>('/users').then((r) => {
      const list = Array.isArray(r) ? r.filter((u) => u.role === 'doctor') : [];
      setDoctors(list);
      if (list[0]) setDoctorId(list[0].id);
    }).catch(() => setDoctors([]));
    apiGet<{ id: string; roomNumber?: string }[]>('/rooms?activeOnly=true').then((r) => setRooms(Array.isArray(r) ? r : [])).catch(() => setRooms([]));
  }, []);

  useEffect(() => {
    if (!doctorId || !date) {
      setExistingSlots([]);
      return;
    }
    apiGet<Appointment[]>(`/appointments?startDate=${date}&endDate=${date}`)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setExistingSlots(list.filter((a) => a.doctorId === doctorId));
      })
      .catch(() => setExistingSlots([]));
  }, [doctorId, date]);

  const filteredPatients = patientSearch.trim()
    ? patients.filter((p) => (p.nameAr ?? '').toLowerCase().includes(patientSearch.toLowerCase())).slice(0, 15)
    : patients.slice(0, 15);

  const isSlotTaken = (t: string) =>
    existingSlots.some((a) => {
      const start = new Date(a.startTime).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false });
      return start === t;
    });

  const handleSubmit = async () => {
    setError('');
    if (!patientId || !doctorId || !roomId || !date || !time) {
      setError('يرجى تعبئة الحقول المطلوبة');
      return;
    }
    const start = new Date(date + 'T' + time);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setSubmitting(true);
    try {
      await apiPost('/appointments', {
        patientId,
        doctorId,
        roomId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        arrivalType,
        notes: notes || undefined,
        ...(arrivalType === 'center_transport' && {
          pickupAddress: pickupAddress || undefined,
          pickupTime: new Date(date + 'T' + pickupTime).toISOString(),
        }),
      });
      const patientName = patients.find((p) => p.id === patientId)?.nameAr ?? 'المريض';
      toast(`✓ تم الحجز — موعد ${patientName} يوم ${date} الساعة ${time}`);
      if (arrivalType === 'center_transport' && window.confirm('هل تريد طلب سيارة الآن؟')) {
        try {
          await apiPost('/transport/requests', {
            patientId,
            appointmentId: undefined,
            pickupAddress: pickupAddress || undefined,
            pickupTime: new Date(date + 'T' + pickupTime).toISOString(),
          });
          toast('✓ تم إنشاء طلب النقل');
        } catch {
          toast('إنشاء طلب النقل فشل');
        }
      }
      onSuccess();
    } catch (e) {
      setError((e as Error).message ?? 'فشل الحجز');
    } finally {
      setSubmitting(false);
    }
  };

  const timeSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border p-6" style={{ background: SURFACE, borderColor: BORDER }}>
        <h3 className="mb-4 font-medium text-[#dde6f5]">حجز موعد جديد</h3>
        {error && <div className="mb-4 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-400">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">المريض</label>
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="بحث بالاسم أو الجوال..."
              className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]"
              style={{ borderColor: BORDER }}
            />
            <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border" style={{ borderColor: BORDER }}>
              {filteredPatients.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setPatientId(p.id); setPatientSearch(p.nameAr ?? ''); }}
                  className={`w-full px-3 py-2 text-right text-sm ${patientId === p.id ? 'bg-amber-500/20 text-amber-400' : 'text-[#dde6f5] hover:bg-white/5'}`}
                >
                  {p.nameAr} {p.phone ? `· ${p.phone}` : ''}
                </button>
              ))}
            </div>
            <button type="button" onClick={onSwitchToRegister} className="mt-2 text-sm text-amber-400 hover:underline">
              + مريض جديد
            </button>
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">الطبيب</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]"
              style={{ borderColor: BORDER }}
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.nameAr ?? d.id} {d.specialty ? `· ${d.specialty}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">التاريخ</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">الغرفة</label>
              <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: BORDER }}>
                <option value="">—</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.roomNumber ?? r.id}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm text-[#4b5875]">الوقت</label>
            <div className="grid grid-cols-6 gap-2">
              {timeSlots.map((t) => {
                const taken = isSlotTaken(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => !taken && setTime(t)}
                    className={`rounded-lg py-2 text-sm font-mono ${taken ? 'cursor-not-allowed bg-white/5 text-[#4b5875]' : time === t ? 'bg-amber-500 text-black' : 'bg-white/5 text-[#dde6f5] hover:bg-amber-500/20'}`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            {doctorId && date && (
              <p className="mt-2 text-xs text-[#4b5875]">
                {isSlotTaken(time) ? <span className="text-red-400">✗ هذا الوقت محجوز</span> : <span className="text-green-400">✓ متاح</span>}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm text-[#4b5875]">نوع الوصول</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setArrivalType('self_arrival')}
                className={`rounded-xl px-4 py-2 text-sm ${arrivalType === 'self_arrival' ? 'bg-amber-500 text-black' : 'bg-white/5 text-[#4b5875]'}`}
              >
                🚶 بمفرده
              </button>
              <button
                type="button"
                onClick={() => setArrivalType('center_transport')}
                className={`rounded-xl px-4 py-2 text-sm ${arrivalType === 'center_transport' ? 'bg-amber-500 text-black' : 'bg-white/5 text-[#4b5875]'}`}
              >
                🚐 سيارة المركز
              </button>
            </div>
            {arrivalType === 'center_transport' && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="عنوان الاستلام"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  className="rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5] col-span-2"
                  style={{ borderColor: BORDER }}
                />
                <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]" style={{ borderColor: BORDER }} />
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">ملاحظات</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: BORDER }} />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !patientId || !roomId}
            className="w-full rounded-xl py-3 text-sm font-medium text-black disabled:opacity-50"
            style={{ background: AMBER }}
          >
            {submitting ? <Loader2 className="inline h-4 w-4 animate-spin ml-2" /> : null} تأكيد الحجز
          </button>
        </div>
      </div>
    </div>
  );
}

// —— Tab 3: تسجيل مريض ——
function RegisterTab({ toast, onSwitchToBook }: { toast: (m: string) => void; onSwitchToBook: (patient: { id: string; nameAr?: string }) => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    nameAr: '',
    nameEn: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    nationalId: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    diagnosis: '',
    referredBy: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    arrivalTypePreference: 'self_arrival',
    mobilityAid: '',
    notes: '',
    sendWhatsApp: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [phoneExists, setPhoneExists] = useState(false);

  const phoneRegex = /^[\d\s+\-]{10,}$/;

  useEffect(() => {
    if (!form.phone.trim()) {
      setPhoneExists(false);
      return;
    }
    const q = form.phone.replace(/\D/g, '');
    if (q.length < 10) return;
    apiGet<{ id: string; phone?: string }[]>(`/users?search=${encodeURIComponent(form.phone)}`).then((r) => {
      const list = Array.isArray(r) ? r : [];
      setPhoneExists(list.some((u) => (u.phone ?? '').replace(/\D/g, '').slice(-10) === q.slice(-10)));
    }).catch(() => setPhoneExists(false));
  }, [form.phone]);

  const handleSubmit = async () => {
    setError('');
    if (!form.nameAr.trim()) {
      setError('الاسم بالعربي مطلوب');
      return;
    }
    if (!form.phone.trim()) {
      setError('رقم الجوال مطلوب');
      return;
    }
    if (!phoneRegex.test(form.phone.replace(/\s/g, ''))) {
      setError('رقم الجوال غير صالح');
      return;
    }
    if (phoneExists) {
      setError('هذا الرقم مسجل مسبقاً');
      return;
    }
    setSubmitting(true);
    const last4 = form.phone.replace(/\D/g, '').slice(-4).padStart(4, '0') || '0000';
    const password = last4 + '00';
    const email = form.phone.replace(/\D/g, '') + '@pt.patient';
    try {
      const reg = await apiPost<{ user: { id: string } }>('/auth/register', {
        email,
        password,
        role: 'patient',
        nameAr: form.nameAr,
        nameEn: form.nameEn || undefined,
        phone: form.phone.trim(),
      });
      const userId = reg.user?.id;
      if (!userId) throw new Error('لم يتم إنشاء المستخدم');
      const patientRes = await apiPost<{ id: string }>('/patients', {
        userId,
        nameAr: form.nameAr,
        nameEn: form.nameEn || undefined,
        phone: form.phone.trim(),
        birthDate: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        address: form.address || undefined,
        emergencyContactName: form.emergencyContact || undefined,
        emergencyContactPhone: form.emergencyPhone || undefined,
        diagnosis: form.diagnosis || undefined,
        insuranceCompany: form.insuranceProvider || undefined,
        insurancePolicyNumber: form.insurancePolicyNumber || undefined,
        arrivalPreference: form.arrivalTypePreference || undefined,
        notes: [form.referredBy && `طبيب المحيل: ${form.referredBy}`, form.mobilityAid && `الحركة: ${form.mobilityAid}`, form.notes].filter(Boolean).join('\n') || undefined,
      });
      const patientId = patientRes?.id;
      if (form.sendWhatsApp && patientId) {
        try {
          await apiPost('/notifications/send', {
            patientId,
            type: 'manual',
            channel: 'whatsapp',
            vars: {
              message: `مرحباً ${form.nameAr}، تم تسجيلك في مركز العلاج الفيزيائي. رقم جوالك: ${form.phone}، كلمة المرور: ${last4}. حمّل تطبيقنا.`,
            },
          });
        } catch {
          /* ignore */
        }
      }
      toast(`✓ تم تسجيل ${form.nameAr} بنجاح`);
      if (window.confirm('حجز موعد الآن؟')) {
        onSwitchToBook({ id: patientRes.id, nameAr: form.nameAr });
      }
      setForm({
        nameAr: '', nameEn: '', phone: '', dateOfBirth: '', gender: '', nationalId: '', address: '',
        emergencyContact: '', emergencyPhone: '', diagnosis: '', referredBy: '', insuranceProvider: '', insurancePolicyNumber: '',
        arrivalTypePreference: 'self_arrival', mobilityAid: '', notes: '', sendWhatsApp: true,
      });
      setStep(1);
    } catch (e) {
      setError((e as Error).message ?? 'فشل التسجيل');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm ${step === 1 ? 'bg-amber-500 text-black' : 'bg-white/10 text-[#4b5875]'}`}
        >
          ① البيانات الأساسية
        </button>
        <button
          type="button"
          onClick={() => setStep(2)}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm ${step === 2 ? 'bg-amber-500 text-black' : 'bg-white/10 text-[#4b5875]'}`}
        >
          ② البيانات الطبية
        </button>
      </div>
      <div className="rounded-2xl border p-6" style={{ background: SURFACE, borderColor: BORDER }}>
        {error && <div className="mb-4 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-400">{error}</div>}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-medium text-[#dde6f5]">البيانات الأساسية</h3>
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">الاسم بالعربي *</label>
              <input value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: form.nameAr ? BORDER : RED }} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">الاسم بالإنجليزي</label>
              <input value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">رقم الجوال *</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: form.phone && !phoneRegex.test(form.phone) ? RED : phoneExists ? RED : BORDER }} />
              {phoneExists && <p className="mt-1 text-xs text-red-400">⚠️ هذا الرقم مسجل مسبقاً</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">تاريخ الميلاد</label>
              <input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">الجنس</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm((f) => ({ ...f, gender: 'ذكر' }))} className={`rounded-xl px-4 py-2 text-sm ${form.gender === 'ذكر' ? 'bg-amber-500 text-black' : 'bg-white/5 text-[#4b5875]'}`}>ذكر</button>
                <button type="button" onClick={() => setForm((f) => ({ ...f, gender: 'أنثى' }))} className={`rounded-xl px-4 py-2 text-sm ${form.gender === 'أنثى' ? 'bg-amber-500 text-black' : 'bg-white/5 text-[#4b5875]'}`}>أنثى</button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">رقم الهوية/الإقامة</label>
              <input value={form.nationalId} onChange={(e) => setForm((f) => ({ ...f, nationalId: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">العنوان</label>
              <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: BORDER }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-[#4b5875]">جهة الطوارئ (اسم)</label>
                <input value={form.emergencyContact} onChange={(e) => setForm((f) => ({ ...f, emergencyContact: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: BORDER }} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#4b5875]">رقم الطوارئ</label>
                <input value={form.emergencyPhone} onChange={(e) => setForm((f) => ({ ...f, emergencyPhone: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: BORDER }} />
              </div>
            </div>
            <button type="button" onClick={() => setStep(2)} className="w-full rounded-xl py-3 font-medium text-black" style={{ background: AMBER }}>التالي → البيانات الطبية</button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-medium text-[#dde6f5]">البيانات الطبية الأولية</h3>
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">التشخيص الأولي</label>
              <textarea value={form.diagnosis} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))} rows={2} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: BORDER }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-[#4b5875]">طبيب المحيل</label>
                <input value={form.referredBy} onChange={(e) => setForm((f) => ({ ...f, referredBy: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: BORDER }} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#4b5875]">شركة التأمين</label>
                <input value={form.insuranceProvider} onChange={(e) => setForm((f) => ({ ...f, insuranceProvider: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: BORDER }} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">رقم وثيقة التأمين</label>
              <input value={form.insurancePolicyNumber} onChange={(e) => setForm((f) => ({ ...f, insurancePolicyNumber: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">تفضيل الوصول</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm((f) => ({ ...f, arrivalTypePreference: 'center_transport' }))} className={`rounded-xl px-3 py-2 text-sm ${form.arrivalTypePreference === 'center_transport' ? 'bg-amber-500 text-black' : 'bg-white/5 text-[#4b5875]'}`}>🚐 سيارة</button>
                <button type="button" onClick={() => setForm((f) => ({ ...f, arrivalTypePreference: 'self_arrival' }))} className={`rounded-xl px-3 py-2 text-sm ${form.arrivalTypePreference === 'self_arrival' ? 'bg-amber-500 text-black' : 'bg-white/5 text-[#4b5875]'}`}>🚶 بمفرده</button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">المساعدة على الحركة</label>
              <select value={form.mobilityAid} onChange={(e) => setForm((f) => ({ ...f, mobilityAid: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: BORDER }}>
                <option value="">لا يحتاج</option>
                <option value="عكاز">عكاز</option>
                <option value="كرسي متحرك">كرسي متحرك</option>
                <option value="نقالة">نقالة</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">ملاحظات</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: BORDER }} />
            </div>
            <label className="flex items-center gap-2 text-sm text-[#dde6f5]">
              <input type="checkbox" checked={form.sendWhatsApp} onChange={(e) => setForm((f) => ({ ...f, sendWhatsApp: e.target.checked }))} />
              إرسال بيانات الدخول للمريض عبر WhatsApp
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="rounded-xl border px-4 py-3 text-sm text-[#dde6f5]" style={{ borderColor: BORDER }}>← السابق</button>
              <button type="button" onClick={handleSubmit} disabled={submitting} className="flex-1 rounded-xl py-3 font-medium text-black disabled:opacity-50" style={{ background: AMBER }}>
                {submitting ? <Loader2 className="inline h-4 w-4 animate-spin ml-2" /> : null} تسجيل المريض
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type TransportReq = { id?: string; createdAt?: string; pickupTime?: string; status?: string; driverId?: string };

// —— Tab 4: طلب نقل ——
function TransportTab({ toast }: { toast: (m: string) => void }) {
  const todayStr = todayDateStr();
  const [requests, setRequests] = useState<TransportReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandForm, setExpandForm] = useState(false);
  const [patients, setPatients] = useState<{ id: string; nameAr?: string; address?: string }[]>([]);
  const [form, setForm] = useState({ patientId: '', appointmentId: '', pickupAddress: '', pickupTime: '', mobilityNeed: false, notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<{ id: string; user?: { nameAr?: string } }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; plateNumber?: string }[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    apiGet<TransportReq[]>('/transport/requests')
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const today = list.filter((r) => (r.createdAt ?? r.pickupTime ?? '').toString().startsWith(todayStr));
        setRequests(today);
      })
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [todayStr]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    apiGet<{ id: string; nameAr?: string; address?: string }[] | { data: { id: string; nameAr?: string; address?: string }[] }>('/patients?limit=100').then((r) => {
        const list = Array.isArray(r) ? r : (r as { data?: { id: string; nameAr?: string; address?: string }[] }).data ?? [];
        setPatients(list as { id: string; nameAr?: string; address?: string }[]);
      }).catch(() => setPatients([]));
    apiGet<{ id: string; user?: { nameAr?: string } }[]>('/transport/drivers').then((r) => setDrivers(Array.isArray(r) ? r : [])).catch(() => setDrivers([]));
    apiGet<{ id: string; plateNumber?: string }[]>('/transport/vehicles').then((r) => setVehicles(Array.isArray(r) ? r : [])).catch(() => setVehicles([]));
  }, []);

  const stats = {
    total: requests.length,
    inProgress: requests.filter((r) => r.status === 'en_route' || r.status === 'assigned').length,
    completed: requests.filter((r) => r.status === 'arrived_at_center' || r.status === 'completed').length,
  };
  const unassigned = requests.filter((r) => !r.driverId && r.status === 'requested');
  const unassignedCount = unassigned.length;

  const handleCreateRequest = async () => {
    if (!form.patientId) {
      toast('اختر المريض');
      return;
    }
    setSubmitting(true);
    try {
      await apiPost('/transport/requests', {
        patientId: form.patientId,
        appointmentId: form.appointmentId || undefined,
        pickupAddress: form.pickupAddress || undefined,
        pickupTime: form.pickupTime ? new Date(todayStr + 'T' + form.pickupTime).toISOString() : undefined,
        mobilityNeed: form.mobilityNeed ? 'walking' : undefined,
        notes: form.notes || undefined,
      });
      toast('✓ تم إنشاء طلب النقل');
      setForm({ patientId: '', appointmentId: '', pickupAddress: '', pickupTime: '', mobilityNeed: false, notes: '' });
      setExpandForm(false);
      load();
    } catch (e) {
      toast((e as Error).message ?? 'فشل');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (requestId: string, driverId: string, vehicleId: string) => {
    setAssigning(requestId);
    try {
      await apiPatch(`/transport/requests/${requestId}/assign`, { driverId, vehicleId });
      toast('✓ تم الإسناد');
      load();
    } catch {
      toast('فشل الإسناد');
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'طلبات اليوم', value: stats.total },
          { label: 'جارية الآن', value: stats.inProgress },
          { label: 'مكتملة', value: stats.completed },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border p-4" style={{ background: SURFACE, borderColor: BORDER, borderTop: `3px solid ${AMBER}` }}>
            <p className="text-[11px] text-[#4b5875]">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: AMBER, fontFamily: "'Space Mono', monospace" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {unassignedCount > 0 && (
        <div className="rounded-xl border p-4" style={{ background: 'rgba(248,113,113,0.1)', borderColor: RED }}>
          <p className="text-red-400">⚠️ {unassignedCount} طلبات غير مسندة — يرجى إسناد سائق</p>
        </div>
      )}

      <div className="rounded-2xl border p-4" style={{ background: SURFACE, borderColor: BORDER }}>
        <button
          type="button"
          onClick={() => setExpandForm(!expandForm)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/10"
        >
          {expandForm ? <X className="h-4 w-4" /> : '+'} طلب جديد
        </button>
        {expandForm && (
          <div className="mt-4 space-y-3 rounded-xl border p-4" style={{ borderColor: BORDER }}>
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">المريض</label>
              <select value={form.patientId} onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value, pickupAddress: patients.find((p) => p.id === e.target.value)?.address ?? f.pickupAddress }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: BORDER }}>
                <option value="">—</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.nameAr}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">عنوان الاستلام</label>
              <input value={form.pickupAddress} onChange={(e) => setForm((f) => ({ ...f, pickupAddress: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">وقت الاستلام</label>
              <input type="time" value={form.pickupTime} onChange={(e) => setForm((f) => ({ ...f, pickupTime: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: BORDER }} />
            </div>
            <label className="flex items-center gap-2 text-sm text-[#dde6f5]">
              <input type="checkbox" checked={form.mobilityNeed} onChange={(e) => setForm((f) => ({ ...f, mobilityNeed: e.target.checked }))} />
              يحتاج مساعدة حركة
            </label>
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">ملاحظات</label>
              <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]" style={{ borderColor: BORDER }} />
            </div>
            <button type="button" onClick={handleCreateRequest} disabled={submitting} className="w-full rounded-xl py-3 font-medium text-black disabled:opacity-50" style={{ background: AMBER }}>
              {submitting ? <Loader2 className="inline h-4 w-4 animate-spin ml-2" /> : null} إنشاء الطلب
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: SURFACE, borderColor: BORDER }}>
        <h3 className="border-b p-3 font-medium text-[#dde6f5]" style={{ borderColor: BORDER }}>طلبات النقل اليوم</h3>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-amber-400" /></div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-[#4b5875]">لا طلبات اليوم</div>
        ) : (
          <div className="divide-y" style={{ borderColor: BORDER }}>
            {(requests as { id: string; patient?: { nameAr?: string }; pickupAddress?: string; pickupTime?: string; status?: string; driverId?: string; driver?: { user?: { nameAr?: string } }; vehicle?: { plateNumber?: string } }[]).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-4 p-4">
                <div>
                  <p className="font-medium text-[#dde6f5]">{r.patient?.nameAr ?? '—'}</p>
                  <p className="text-xs text-[#4b5875]">{r.pickupAddress ?? '—'} · {r.pickupTime ? new Date(r.pickupTime).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                </div>
                <span className="rounded px-2 py-0.5 text-xs" style={getStatusBadgeStyle(r.status ?? '')}>
                  {getStatusLabel(r.status ?? '', 'transport')}
                </span>
                {r.driver?.user?.nameAr && <span className="text-sm text-[#4b5875]">السائق: {r.driver.user.nameAr}</span>}
                {r.vehicle?.plateNumber && <span className="text-sm text-[#4b5875]">اللوحة: {r.vehicle.plateNumber}</span>}
                {!r.driverId && r.status === 'requested' && (
                  <div className="mr-auto flex gap-2">
                    <select
                      id={`driver-${r.id}`}
                      className="rounded-lg border bg-[#06080e] px-2 py-1.5 text-sm text-[#dde6f5]"
                      style={{ borderColor: BORDER }}
                    >
                      <option value="">اختر سائق</option>
                      {drivers.map((d) => <option key={d.id} value={d.id}>{d.user?.nameAr ?? d.id}</option>)}
                    </select>
                    <select id={`vehicle-${r.id}`} className="rounded-lg border bg-[#06080e] px-2 py-1.5 text-sm text-[#dde6f5]" style={{ borderColor: BORDER }}>
                      <option value="">اختر مركبة</option>
                      {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plateNumber ?? v.id}</option>)}
                    </select>
                    <button
                      type="button"
                      disabled={!!assigning}
                      onClick={() => {
                        const driverId = (document.getElementById(`driver-${r.id}`) as HTMLSelectElement)?.value;
                        const vehicleId = (document.getElementById(`vehicle-${r.id}`) as HTMLSelectElement)?.value;
                        if (driverId && vehicleId) handleAssign(r.id, driverId, vehicleId);
                        else toast('اختر سائقاً ومركبة');
                      }}
                      className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-sm text-amber-400 hover:bg-amber-500/30"
                    >
                      إسناد
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
