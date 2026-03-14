import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/lib/toast';
import { getStatusLabel, getStatusBadgeStyle } from '@/lib/statusLabels';
import { Loader2 } from 'lucide-react';
import type { Appointment } from '@/lib/api';

const BG = '#06080e';
const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';
const CYAN = '#22d3ee';
const GREEN = '#34d399';
const AMBER = '#fbbf24';
const RED = '#f87171';

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}
function toArabicDate(d: Date) {
  return d.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function recoveryColor(score: number) {
  if (score > 70) return GREEN;
  if (score >= 40) return AMBER;
  return RED;
}

export interface PreSelect {
  patientId?: string;
  patientName?: string;
  appointmentId?: string;
}

type TabId = 'today' | 'patients' | 'session' | 'rx';

export function DoctorPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<TabId>('today');
  const [preSelect, setPreSelect] = useState<PreSelect | null>(null);

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'today', label: 'مواعيدي اليوم', icon: '📅' },
    { id: 'patients', label: 'مرضاي', icon: '👥' },
    { id: 'session', label: 'تسجيل جلسة', icon: '📋' },
    { id: 'rx', label: 'وصفاتي', icon: '💊' },
  ];

  return (
    <div className="min-h-screen" style={{ background: BG, fontFamily: 'Cairo, sans-serif' }}>
      <div
        className="border-b px-6 py-4"
        style={{
          borderColor: BORDER,
          background: SURFACE,
          backgroundImage: 'radial-gradient(ellipse at top right, rgba(34,211,238,0.08) 0%, transparent 50%)',
        }}
      >
        <h1 className="text-xl font-bold" style={{ color: CYAN }}>👨‍⚕️ بوابة الطبيب</h1>
        <p className="mt-1 text-sm text-[#4b5875]">
          {toArabicDate(new Date())} — مرحباً د. {user?.nameAr ?? user?.email}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
                tab === t.id ? 'text-black' : 'text-[#4b5875] hover:text-[#dde6f5]'
              }`}
              style={{ background: tab === t.id ? CYAN : 'rgba(255,255,255,0.06)' }}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {tab === 'today' && (
          <TodayTab
            toast={toast}
            navigate={navigate}
            userId={user?.id ?? ''}
            onStartSession={(p) => {
              setPreSelect({ patientId: p.patientId, patientName: p.patientName, appointmentId: p.appointmentId });
              setTab('session');
            }}
            onOpenRx={(p) => {
              setPreSelect({ patientId: p.patientId, patientName: p.patientName });
              setTab('rx');
            }}
          />
        )}
        {tab === 'patients' && (
          <MyPatientsTab
            toast={toast}
            navigate={navigate}
            doctorId={user?.id ?? ''}
            onNewSession={(p) => {
              setPreSelect({ patientId: p.id, patientName: p.nameAr ?? '' });
              setTab('session');
            }}
          />
        )}
        {tab === 'session' && (
          <SessionTab
            toast={toast}
            preSelect={preSelect}
            onClearPreSelect={() => setPreSelect(null)}
            onSaved={() => {
              setPreSelect(null);
              setTab('today');
            }}
          />
        )}
        {tab === 'rx' && (
          <MyRxTab
            toast={toast}
            doctorId={user?.id ?? ''}
            preSelect={preSelect}
            onClearPreSelect={() => setPreSelect(null)}
            navigate={navigate}
          />
        )}
      </div>
    </div>
  );
}

// —— Tab 1: مواعيدي اليوم ——
function TodayTab({
  toast,
  navigate,
  userId,
  onStartSession,
  onOpenRx,
}: {
  toast: (m: string) => void;
  navigate: (path: string) => void;
  userId: string;
  onStartSession: (p: { patientId: string; patientName?: string; appointmentId: string }) => void;
  onOpenRx: (p: { patientId: string; patientName?: string }) => void;
}) {
  const todayStr = todayDateStr();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date>(new Date());

  const load = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    apiGet<Appointment[]>(`/appointments/doctor/${userId}?startDate=${todayStr}&endDate=${todayStr}`)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setAppointments(list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
        setLastFetch(new Date());
      })
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [userId, todayStr]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const stats = {
    total: appointments.length,
    completed: appointments.filter((a) => a.status === 'completed').length,
    scheduled: appointments.filter((a) => a.status === 'scheduled').length,
    avgRecovery: 0, // optional: would need sessions fetch
  };

  const handleStartSession = async (a: Appointment) => {
    setUpdating(a.id);
    try {
      await apiPatch(`/appointments/${a.id}/status`, { status: 'in_progress' });
      toast('✓ تم بدء الجلسة');
      onStartSession({
        patientId: a.patientId,
        patientName: (a as { patient?: { nameAr?: string } }).patient?.nameAr,
        appointmentId: a.id,
      });
      load();
    } catch {
      toast('فشل التحديث');
    } finally {
      setUpdating(null);
    }
  };

  const since = (d: Date) => {
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return 'منذ أقل من دقيقة';
    if (s < 3600) return `منذ ${Math.floor(s / 60)} دقيقة`;
    return `منذ ${Math.floor(s / 3600)} ساعة`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#4b5875]">آخر تحديث: {since(lastFetch)}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'موعد اليوم', value: stats.total },
          { label: 'مكتملة', value: stats.completed },
          { label: 'قادمة', value: stats.scheduled },
          { label: 'متوسط تعافي', value: stats.avgRecovery ? `${stats.avgRecovery}%` : '—' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border p-4"
            style={{ background: SURFACE, borderColor: BORDER, borderTop: `3px solid ${CYAN}` }}
          >
            <p className="text-[11px] text-[#4b5875]">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: CYAN, fontFamily: "'Space Mono', monospace" }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: SURFACE, borderColor: BORDER }}>
        <h3 className="border-b p-3 font-medium text-[#dde6f5]" style={{ borderColor: BORDER }}>
          قائمة المواعيد
        </h3>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="p-8 text-center text-[#4b5875]">لا توجد مواعيد اليوم</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-right text-sm text-[#4b5875]" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th className="p-3">المريض</th>
                  <th className="p-3">الوقت</th>
                  <th className="p-3">الغرفة</th>
                  <th className="p-3">التعافي</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => {
                  const statusStyle = getStatusBadgeStyle(a.status);
                  const recoveryScore = (a as { patient?: { recoveryScore?: number } }).patient?.recoveryScore ?? null;
                  return (
                    <tr key={a.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium"
                            style={{ background: `${CYAN}22`, color: CYAN }}
                          >
                            {((a as { patient?: { nameAr?: string } }).patient?.nameAr ?? '—').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-[#dde6f5]">
                              {(a as { patient?: { nameAr?: string } }).patient?.nameAr ?? '—'}
                            </p>
                            <span className="rounded px-2 py-0.5 text-[10px] text-[#4b5875]">
                              {(a as { patient?: { diagnosis?: string } }).patient?.diagnosis ?? '—'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[#dde6f5]">
                        {new Date(a.startTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 text-[#dde6f5]">{(a as { room?: { name?: string } }).room?.name ?? '—'}</td>
                      <td className="p-3">
                        {recoveryScore != null ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-16 rounded-full bg-white/10 overflow-hidden"
                              style={{ background: BORDER }}
                            >
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${recoveryScore}%`, background: recoveryColor(recoveryScore) }}
                              />
                            </div>
                            <span className="text-xs font-mono" style={{ color: recoveryColor(recoveryScore) }}>
                              {recoveryScore}%
                            </span>
                          </div>
                        ) : (
                          '—'
                        )}
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
                              onClick={() => handleStartSession(a)}
                              className="rounded-lg px-2 py-1.5 text-xs font-medium text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50"
                            >
                              بدء الجلسة
                            </button>
                          )}
                          {(a.status === 'in_progress' || a.status === 'completed') && (
                            <button
                              type="button"
                              onClick={() => onOpenRx({ patientId: a.patientId, patientName: (a as { patient?: { nameAr?: string } }).patient?.nameAr })}
                              className="rounded-lg px-2 py-1.5 text-xs text-[#dde6f5] hover:bg-white/10"
                            >
                              وصفة
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => a.patientId && navigate(`/patients/${a.patientId}`)}
                            className="rounded-lg border px-2 py-1.5 text-xs text-[#dde6f5] hover:bg-white/5"
                            style={{ borderColor: BORDER }}
                          >
                            الملف الكامل
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

// —— Tab 2: مرضاي ——
type PatientRow = {
  id: string;
  nameAr?: string | null;
  diagnosis?: string | null;
  assignedDoctorId?: string | null;
};
type SessionInfo = { recoveryScore?: number | null; createdAt?: string };

function MyPatientsTab({
  navigate,
  doctorId,
  onNewSession,
}: {
  toast: (m: string) => void;
  navigate: (path: string) => void;
  doctorId: string;
  onNewSession: (p: { id: string; nameAr?: string | null }) => void;
}) {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [recoveryMap, setRecoveryMap] = useState<Record<string, { score: number; sessionsCount: number }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [recoveryFilter, setRecoveryFilter] = useState<'all' | 'high' | 'mid' | 'low'>('all');

  useEffect(() => {
    apiGet<PatientRow[] | { data: PatientRow[] }>('/patients?limit=500')
      .then((r) => {
        const list = Array.isArray(r) ? r : (r as { data?: PatientRow[] }).data ?? [];
        const mine = list.filter((p) => p.assignedDoctorId === doctorId);
        setPatients(mine);
        return mine;
      })
      .then((mine) => {
        Promise.all(
          mine.map((p) =>
            apiGet<SessionInfo[]>(`/clinical-sessions?patientId=${p.id}`).then((sessions) => {
              const list = Array.isArray(sessions) ? sessions : [];
              const last = list[0];
              const score = last?.recoveryScore ?? null;
              return { id: p.id, score: score != null ? score : -1, sessionsCount: list.length };
            }).catch(() => ({ id: p.id, score: -1, sessionsCount: 0 }))
          )
        ).then((arr) => {
          const map: Record<string, { score: number; sessionsCount: number }> = {};
          arr.forEach((x) => { map[x.id] = { score: x.score, sessionsCount: x.sessionsCount }; });
          setRecoveryMap(map);
        });
      })
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));
  }, [doctorId]);

  const filtered = patients.filter((p) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!(p.nameAr ?? '').toLowerCase().includes(q) && !(p.diagnosis ?? '').toLowerCase().includes(q)) return false;
    }
    if (recoveryFilter === 'all') return true;
    const r = recoveryMap[p.id];
    const score = r?.score ?? -1;
    if (recoveryFilter === 'high') return score > 70;
    if (recoveryFilter === 'mid') return score >= 40 && score <= 70;
    if (recoveryFilter === 'low') return score >= 0 && score < 40;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="بحث بالاسم أو التشخيص..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5] w-56"
          style={{ borderColor: BORDER }}
        />
        {(['all', 'high', 'mid', 'low'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setRecoveryFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs ${
              recoveryFilter === f ? 'text-black' : 'text-[#4b5875] hover:text-[#dde6f5]'
            }`}
            style={{ background: recoveryFilter === f ? CYAN : 'rgba(255,255,255,0.06)' }}
          >
            {f === 'all' && 'الكل'}
            {f === 'high' && 'تعافي ممتاز (>70)'}
            {f === 'mid' && 'تعافي متوسط (40-70)'}
            {f === 'low' && 'يحتاج اهتمام (<40)'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center text-[#4b5875]" style={{ background: SURFACE, borderColor: BORDER }}>
          لا يوجد مرضى مسجلون بعد
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((p) => {
            const r = recoveryMap[p.id];
            const score = r?.score ?? -1;
            const sessionsCount = r?.sessionsCount ?? 0;
            const color = score < 0 ? BORDER : recoveryColor(score);
            return (
              <div
                key={p.id}
                className="rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
                style={{ background: SURFACE, borderColor: BORDER }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-medium"
                    style={{ background: `${CYAN}22`, color: CYAN }}
                  >
                    {(p.nameAr ?? '—').slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#dde6f5]">{p.nameAr ?? '—'}</p>
                    <span className="rounded px-2 py-0.5 text-[10px] text-[#4b5875]">{p.diagnosis ?? '—'}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-mono text-[#4b5875]">{sessionsCount} جلسة</span>
                  {score >= 0 && (
                    <>
                      <div className="h-2 flex-1 rounded-full overflow-hidden" style={{ background: BORDER }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${score}%`, background: color }}
                        />
                      </div>
                      <span className="text-xs font-mono" style={{ color }}>{score}%</span>
                    </>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/patients/${p.id}`)}
                    className="rounded-xl border px-3 py-2 text-sm text-[#dde6f5] hover:bg-white/5"
                    style={{ borderColor: BORDER }}
                  >
                    ملف المريض
                  </button>
                  <button
                    type="button"
                    onClick={() => onNewSession(p)}
                    className="rounded-xl px-3 py-2 text-sm font-medium text-black hover:opacity-90"
                    style={{ background: CYAN }}
                  >
                    جلسة جديدة
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// —— Tab 3: تسجيل جلسة SOAP ——
const SOAP_CHIPS = ['ROM طبيعي', 'لا تورم', 'قوة عضلة 5/5', 'ألم عند الضغط'];
const DURATIONS = [30, 45, 60, 90];

function SessionTab({
  toast,
  preSelect,
  onClearPreSelect,
  onSaved,
}: {
  toast: (m: string) => void;
  preSelect: PreSelect | null;
  onClearPreSelect: () => void;
  onSaved: () => void;
}) {
  const todayStr = todayDateStr();
  const [step, setStep] = useState(1);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientOptions, setPatientOptions] = useState<{ id: string; nameAr?: string; diagnosis?: string }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; nameAr?: string; diagnosis?: string } | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [lastSessionScore, setLastSessionScore] = useState<number | null>(null);
  const [soap, setSoap] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [recoveryScore, setRecoveryScore] = useState(50);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (preSelect?.patientId) {
      setSelectedPatient({ id: preSelect.patientId, nameAr: preSelect.patientName });
      setSelectedAppointmentId(preSelect.appointmentId ?? '');
      onClearPreSelect();
    }
  }, [preSelect, onClearPreSelect]);

  useEffect(() => {
    if (!patientSearch.trim()) {
      setPatientOptions([]);
      return;
    }
    apiGet<{ id: string; nameAr?: string; diagnosis?: string }[] | { data: { id: string; nameAr?: string; diagnosis?: string }[] }>(
      `/patients?search=${encodeURIComponent(patientSearch)}&limit=20`
    ).then((r) => {
      const list = Array.isArray(r) ? r : (r as { data?: { id: string; nameAr?: string; diagnosis?: string }[] }).data ?? [];
      setPatientOptions(list as { id: string; nameAr?: string; diagnosis?: string }[]);
    }).catch(() => setPatientOptions([]));
  }, [patientSearch]);

  useEffect(() => {
    if (!selectedPatient?.id) {
      setTodayAppointments([]);
      setLastSessionScore(null);
      return;
    }
    apiGet<Appointment[]>(`/appointments/patient/${selectedPatient.id}`)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const today = list.filter(
          (a) => a.startTime.startsWith(todayStr) && (a.status === 'scheduled' || a.status === 'in_progress')
        );
        setTodayAppointments(today);
        if (today.length && !selectedAppointmentId) setSelectedAppointmentId(today[0].id);
      })
      .catch(() => setTodayAppointments([]));
    apiGet<{ recoveryScore?: number }[]>(`/clinical-sessions?patientId=${selectedPatient.id}`)
      .then((s) => {
        const arr = Array.isArray(s) ? s : [];
        const last = arr[0];
        setLastSessionScore(last?.recoveryScore ?? null);
      })
      .catch(() => setLastSessionScore(null));
  }, [selectedPatient?.id, todayStr]);

  const addChipToObjective = (chip: string) => {
    setSoap((prev) => ({ ...prev, objective: (prev.objective ? prev.objective + ' ' : '') + chip }));
  };

  const handleSave = async () => {
    if (!selectedPatient?.id) {
      toast('اختر المريض');
      return;
    }
    if (!selectedAppointmentId) {
      toast('الجلسة مرتبطة بموعد — اختر موعد اليوم أو ابدأ الجلسة من مواعيدي اليوم');
      return;
    }
    setSubmitting(true);
    try {
      await apiPost('/clinical-sessions', {
        appointmentId: selectedAppointmentId,
        subjective: soap.subjective || undefined,
        objective: soap.objective || undefined,
        assessment: soap.assessment || undefined,
        plan: soap.plan || undefined,
        recoveryScore,
      });
      toast(`✓ تم حفظ الجلسة — تعافي ${selectedPatient.nameAr ?? 'المريض'}: ${recoveryScore}%`);
      onSaved();
    } catch (e) {
      toast((e as Error).message ?? 'فشل الحفظ');
    } finally {
      setSubmitting(false);
    }
  };

  const prevScore = lastSessionScore ?? 0;
  const diff = recoveryScore - prevScore;
  const diffStr = diff > 0 ? `↑ +${diff}%` : diff < 0 ? `↓ ${diff}%` : '—';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
            step >= 1 ? (step === 1 ? 'text-black' : 'text-white') : 'text-[#4b5875]'
          }`}
          style={{ background: step === 1 ? CYAN : step > 1 ? GREEN : BORDER }}
        >
          {step > 1 ? '✓' : '①'}
        </div>
        <div className="h-0.5 w-8 rounded" style={{ background: BORDER }} />
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
            step >= 2 ? (step === 2 ? 'text-black' : 'text-white') : 'text-[#4b5875]'
          }`}
          style={{ background: step === 2 ? CYAN : step > 2 ? GREEN : BORDER }}
        >
          {step > 2 ? '✓' : '②'}
        </div>
        <span className="text-sm text-[#4b5875]">① اختيار المريض → ② تفاصيل الجلسة</span>
      </div>

      {step === 1 && (
        <div className="rounded-2xl border p-6" style={{ background: SURFACE, borderColor: BORDER }}>
          <h3 className="mb-4 font-medium text-[#dde6f5]">اختيار المريض</h3>
          <input
            type="text"
            placeholder="بحث عن مريض..."
            value={selectedPatient ? selectedPatient.nameAr : patientSearch}
            onChange={(e) => {
              if (selectedPatient) setSelectedPatient(null);
              setPatientSearch(e.target.value);
            }}
            className="mb-3 w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]"
            style={{ borderColor: BORDER }}
          />
          {patientOptions.length > 0 && !selectedPatient && (
            <ul className="mb-3 max-h-40 overflow-y-auto rounded-lg border" style={{ borderColor: BORDER }}>
              {patientOptions.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatient(p);
                      setPatientSearch('');
                      setPatientOptions([]);
                    }}
                    className="w-full px-3 py-2 text-right text-sm text-[#dde6f5] hover:bg-white/5"
                  >
                    {p.nameAr} — {p.diagnosis ?? '—'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedPatient && (
            <div className="mb-4 rounded-xl border p-3" style={{ borderColor: BORDER }}>
              <p className="font-medium text-[#dde6f5]">{selectedPatient.nameAr}</p>
              <p className="text-xs text-[#4b5875]">التشخيص: {selectedPatient.diagnosis ?? '—'}</p>
              <p className="text-xs text-[#4b5875]">آخر تعافي: {lastSessionScore != null ? `${lastSessionScore}%` : '—'}</p>
            </div>
          )}
          {selectedPatient && (
            <div className="mb-4">
              <p className="mb-2 text-sm text-[#4b5875]">موعد اليوم</p>
              {todayAppointments.length === 0 ? (
                <p className="text-sm text-amber-400">لا يوجد موعد اليوم — ابدأ الجلسة من تبويب مواعيدي اليوم</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {todayAppointments.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAppointmentId(a.id)}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        selectedAppointmentId === a.id ? 'border-cyan-400 bg-cyan-500/20 text-cyan-400' : 'text-[#dde6f5]'
                      }`}
                      style={selectedAppointmentId !== a.id ? { borderColor: BORDER } : {}}
                    >
                      {new Date(a.startTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            disabled={!selectedPatient || (todayAppointments.length > 0 && !selectedAppointmentId)}
            onClick={() => setStep(2)}
            className="rounded-xl px-4 py-2 font-medium text-black disabled:opacity-50"
            style={{ background: CYAN }}
          >
            التالي
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 rounded-2xl border p-6" style={{ background: SURFACE, borderColor: BORDER }}>
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-[#dde6f5]">تفاصيل الجلسة</h3>
            <button type="button" onClick={() => setStep(1)} className="text-sm text-cyan-400 hover:underline">
              تغيير المريض
            </button>
          </div>

          {['subjective', 'objective', 'assessment', 'plan'].map((key, i) => {
            const labels = ['S — الشكوى الذاتية', 'O — الفحص الموضوعي', 'A — التقييم', 'P — خطة العلاج'];
            const placeholders = [
              'ماذا يشكو المريض؟ وصف الألم، موقعه، شدته...',
              'نتائج الفحص: ROM، القوة العضلية، التورم، نطاق الحركة...',
              'تقييمك: التشخيص، مقارنة بالجلسة السابقة...',
              'خطة الجلسة القادمة، التعديلات، التوصيات...',
            ];
            return (
              <div key={key}>
                <label className="mb-1 block text-sm text-[#4b5875]">{labels[i]}</label>
                <textarea
                  value={soap[key as keyof typeof soap]}
                  onChange={(e) => setSoap((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholders[i]}
                  rows={3}
                  className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]"
                  style={{ borderColor: BORDER, borderRight: `3px solid ${CYAN}` }}
                />
                {key === 'objective' && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {SOAP_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => addChipToObjective(chip)}
                        className="rounded-full border px-2 py-1 text-xs text-[#dde6f5] hover:bg-white/5"
                        style={{ borderColor: BORDER }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">نسبة التعافي الحالية</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={recoveryScore}
                onChange={(e) => setRecoveryScore(Number(e.target.value))}
                className="flex-1"
                style={{ accentColor: recoveryColor(recoveryScore) }}
              />
              <span className="text-2xl font-bold font-mono" style={{ color: recoveryColor(recoveryScore), minWidth: 60 }}>
                {recoveryScore}%
              </span>
            </div>
            <p className="mt-1 text-xs text-[#4b5875]">
              الجلسة السابقة: {prevScore}% → اليوم: {recoveryScore}% ({diffStr})
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">مدة الجلسة</label>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDurationMinutes(d)}
                  className={`rounded-lg border px-3 py-2 text-sm ${durationMinutes === d ? 'border-cyan-400 bg-cyan-500/20 text-cyan-400' : 'text-[#dde6f5]'}`}
                  style={durationMinutes !== d ? { borderColor: BORDER } : {}}
                >
                  {d} دقيقة
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleSave}
            className="rounded-xl px-6 py-3 font-medium text-black hover:opacity-90 disabled:opacity-50"
            style={{ background: CYAN }}
          >
            {submitting ? 'جاري الحفظ...' : 'حفظ الجلسة'}
          </button>
        </div>
      )}
    </div>
  );
}

// —— Tab 4: وصفاتي ——
interface PrescriptionRow {
  id: string;
  rxNumber: string;
  patientId: string;
  status: string;
  createdAt: string;
  patient?: { nameAr?: string };
  items?: { drug?: { nameAr?: string } }[];
}

function MyRxTab({
  toast,
  doctorId,
  preSelect,
  onClearPreSelect,
  navigate,
}: {
  toast: (m: string) => void;
  doctorId: string;
  preSelect: PreSelect | null;
  onClearPreSelect: () => void;
  navigate: (path: string, opts?: { state?: { patientId?: string; patientName?: string; openRx?: boolean } }) => void;
}) {
  const [list, setList] = useState<PrescriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalMonth: 0, active: 0, warnings: 0 });

  useEffect(() => {
    setLoading(true);
    apiGet<PrescriptionRow[]>(`/prescriptions?doctorId=${doctorId}&limit=100`)
      .then((rxList) => {
        const arr = Array.isArray(rxList) ? rxList : [];
        setList(arr);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const totalMonth = arr.filter((r) => r.createdAt >= monthStart).length;
        const active = arr.filter((r) => r.status === 'active').length;
        setStats({
          totalMonth,
          active,
          warnings: 0,
        });
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
    apiGet<{ interactionWarnings?: number }>('/prescriptions/stats')
      .then((st) => setStats((prev) => ({ ...prev, warnings: st?.interactionWarnings ?? 0 })))
      .catch(() => {});
  }, [doctorId]);

  const handlePrint = (rx: PrescriptionRow) => {
    window.open(`/prescriptions?print=${rx.id}`, '_blank');
  };

  const handleCancel = (rx: PrescriptionRow) => {
    if (!window.confirm('إلغاء الوصفة؟')) return;
    apiPatch(`/prescriptions/${rx.id}/status`, { status: 'cancelled' })
      .then(() => {
        toast('✓ تم إلغاء الوصفة');
        setList((prev) => prev.filter((r) => r.id !== rx.id));
      })
      .catch(() => toast('فشل الإلغاء'));
  };

  const openNewRx = () => {
    navigate('/prescriptions', {
      state: { openRx: true, patientId: preSelect?.patientId ?? undefined, patientName: preSelect?.patientName ?? undefined },
    });
    onClearPreSelect();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border p-4" style={{ background: SURFACE, borderColor: BORDER, borderTop: `3px solid ${CYAN}` }}>
          <p className="text-[11px] text-[#4b5875]">وصفاتي هذا الشهر</p>
          <p className="text-2xl font-bold font-mono" style={{ color: CYAN }}>{stats.totalMonth}</p>
        </div>
        <div className="rounded-2xl border p-4" style={{ background: SURFACE, borderColor: BORDER, borderTop: `3px solid ${GREEN}` }}>
          <p className="text-[11px] text-[#4b5875]">نشطة</p>
          <p className="text-2xl font-bold font-mono" style={{ color: GREEN }}>{stats.active}</p>
        </div>
        <div className="rounded-2xl border p-4" style={{ background: SURFACE, borderColor: BORDER, borderTop: `3px solid ${RED}` }}>
          <p className="text-[11px] text-[#4b5875]">تحذيرات تفاعل</p>
          <p className="text-2xl font-bold font-mono" style={{ color: RED }}>{stats.warnings}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={openNewRx}
          className="rounded-xl px-4 py-2 font-medium text-black hover:opacity-90"
          style={{ background: CYAN }}
        >
          + وصفة جديدة
        </button>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: SURFACE, borderColor: BORDER }}>
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-[#4b5875]">لا توجد وصفات</div>
        ) : (
          <ul>
            {list.map((rx) => (
              <li
                key={rx.id}
                className="flex flex-wrap items-center gap-3 border-b px-4 py-3"
                style={{ borderColor: BORDER }}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-medium" style={{ color: CYAN }}>{rx.rxNumber}</p>
                  <p className="text-sm text-[#dde6f5]">{rx.patient?.nameAr ?? '—'}</p>
                  <p className="text-xs text-[#4b5875]">{new Date(rx.createdAt).toLocaleDateString('ar-SA')}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(rx.items ?? []).slice(0, 4).map((it, i) => (
                      <span key={i} className="rounded-full px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-300">
                        {it.drug?.nameAr ?? '—'}
                      </span>
                    ))}
                  </div>
                  <span
                    className="mt-1 inline-block rounded px-2 py-0.5 text-xs"
                    style={getStatusBadgeStyle(rx.status)}
                  >
                    {rx.status === 'active' ? 'نشطة' : rx.status === 'cancelled' ? 'ملغاة' : rx.status}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handlePrint(rx)}
                    className="rounded-lg p-2 text-[#dde6f5] hover:bg-white/10"
                    title="طباعة"
                  >
                    🖨️
                  </button>
                  {rx.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => handleCancel(rx)}
                      className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                      title="إلغاء"
                    >
                      ❌
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
