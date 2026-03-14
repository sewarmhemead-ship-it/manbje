import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/lib/toast';
import { getStatusLabel, getStatusBadgeStyle } from '@/lib/statusLabels';
import { Loader2 } from 'lucide-react';
import type { Appointment } from '@/lib/api';

const BG = '#06080e';
const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';
const GREEN = '#34d399';
const AMBER = '#fbbf24';
const RED = '#f87171';

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}
function toArabicDate(d: Date) {
  return d.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

const MOBILITY_LABELS: Record<string, string> = {
  wheelchair: '🦽 كرسي متحرك',
  crutch: '🦯 عكاز',
  stretcher: '🛏️ نقالة',
  walking: '🚶 مشي',
  none: '',
};

type TabId = 'floor' | 'vitals' | 'transport' | 'tasks';

export function NursePortal() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<TabId>('floor');

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'floor', label: 'جولة الطابق', icon: '🏥' },
    { id: 'vitals', label: 'العلامات الحيوية', icon: '💓' },
    { id: 'transport', label: 'متابعة النقل', icon: '🚐' },
    { id: 'tasks', label: 'مهامي', icon: '✅' },
  ];

  return (
    <div className="min-h-screen" style={{ background: BG, fontFamily: 'Cairo, sans-serif' }}>
      <div
        className="border-b px-6 py-4"
        style={{
          borderColor: BORDER,
          background: SURFACE,
          backgroundImage: 'radial-gradient(ellipse at top left, rgba(52,211,153,0.08) 0%, transparent 50%)',
        }}
      >
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold" style={{ color: GREEN }}>🩺 بوابة الممرض</h1>
          <span className="flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> مباشر
          </span>
        </div>
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
                tab === t.id ? 'text-black' : 'text-[#4b5875] hover:text-[#dde6f5]'
              }`}
              style={{ background: tab === t.id ? GREEN : 'rgba(255,255,255,0.06)' }}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {tab === 'floor' && <FloorRoundTab toast={toast} />}
        {tab === 'vitals' && <VitalsTab toast={toast} />}
        {tab === 'transport' && <TransportTab toast={toast} />}
        {tab === 'tasks' && <TasksTab toast={toast} />}
      </div>
    </div>
  );
}

// —— Tab 1: جولة الطابق ——
function FloorRoundTab({ toast }: { toast: (m: string) => void }) {
  const todayStr = todayDateStr();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [transportRequests, setTransportRequests] = useState<{ status?: string; patientId?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteModal, setNoteModal] = useState<{ appointmentId: string; patientName: string } | null>(null);
  const [quickNote, setQuickNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiGet<Appointment[]>(`/appointments?startDate=${todayStr}&endDate=${todayStr}`),
      apiGet<{ status?: string; patientId?: string }[]>('/transport/requests'),
    ])
      .then(([appts, reqs]) => {
        const list = Array.isArray(appts) ? appts : [];
        setAppointments(list.filter((a) => a.status === 'scheduled' || a.status === 'in_progress'));
        setTransportRequests(Array.isArray(reqs) ? reqs : []);
      })
      .catch(() => {
        setAppointments([]);
        setTransportRequests([]);
      })
      .finally(() => setLoading(false));
  }, [todayStr]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const inProgress = appointments.filter((a) => a.status === 'in_progress');
  const pendingTransport = transportRequests.filter(
    (r) => r.status === 'requested' || r.status === 'assigned'
  );
  const needsHelp = appointments.filter((a) => {
    const p = (a as { patient?: { mobilityAid?: string } }).patient;
    const aid = p?.mobilityAid;
    return aid && aid !== 'none' && aid !== '';
  }).length;

  const stats = [
    { label: 'مريض بالمركز', value: appointments.length },
    { label: 'جلسة جارية', value: inProgress.length },
    { label: 'بانتظار النقل', value: pendingTransport.length },
    { label: 'يحتاج مساعدة', value: needsHelp },
  ];

  const handleSaveNote = async () => {
    if (!noteModal?.appointmentId) return;
    setSavingNote(true);
    try {
      await apiPatch(`/appointments/${noteModal.appointmentId}/note`, { note: quickNote.trim() || 'ملاحظة سريعة' });
      toast('✓ تم حفظ الملاحظة');
      setNoteModal(null);
      setQuickNote('');
      load();
    } catch {
      toast('فشل الحفظ');
    } finally {
      setSavingNote(false);
    }
  };

  const getMobilityBadge = (a: Appointment) => {
    const p = (a as { patient?: { mobilityAid?: string } }).patient;
    const aid = p?.mobilityAid ?? '';
    if (!aid || aid === 'none') return null;
    return MOBILITY_LABELS[aid] ?? aid;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border p-4"
            style={{ background: SURFACE, borderColor: BORDER, borderTop: `3px solid ${GREEN}` }}
          >
            <p className="text-[11px] text-[#4b5875]">{s.label}</p>
            <p className="text-2xl font-bold font-mono" style={{ color: GREEN }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: SURFACE, borderColor: BORDER }}>
        <h3 className="border-b p-3 font-medium text-[#dde6f5]" style={{ borderColor: BORDER }}>
          المرضى بالمركز اليوم
        </h3>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-green-400" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="p-8 text-center text-[#4b5875]">لا يوجد مرضى بالمركز حالياً</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-right text-sm text-[#4b5875]" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th className="p-3">المريض</th>
                  <th className="p-3">الغرفة · الطبيب</th>
                  <th className="p-3">الوصول</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => {
                  const statusStyle = getStatusBadgeStyle(a.status);
                  const mobility = getMobilityBadge(a);
                  return (
                    <tr key={a.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium"
                            style={{ background: `${GREEN}22`, color: GREEN }}
                          >
                            {((a as { patient?: { nameAr?: string } }).patient?.nameAr ?? '—').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-[#dde6f5]">
                              {(a as { patient?: { nameAr?: string } }).patient?.nameAr ?? '—'}
                            </p>
                            {mobility && (
                              <span className="rounded px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-400">
                                {mobility}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-[#dde6f5]">
                        {(a as { room?: { name?: string } }).room?.name ?? '—'} · د. {(a as { doctor?: { nameAr?: string } }).doctor?.nameAr ?? '—'}
                      </td>
                      <td className="p-3">
                        {a.arrivalType === 'center_transport' ? '🚐' : '🚶'}
                      </td>
                      <td className="p-3">
                        <span className="rounded px-2 py-0.5 text-xs" style={statusStyle}>
                          {getStatusLabel(a.status, 'appointment')}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() =>
                            setNoteModal({
                              appointmentId: a.id,
                              patientName: (a as { patient?: { nameAr?: string } }).patient?.nameAr ?? '—',
                            })
                          }
                          className="rounded-lg bg-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/30"
                        >
                          مساعدة
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div
            className="w-full max-w-md rounded-2xl border p-6"
            style={{ background: SURFACE, borderColor: BORDER }}
          >
            <h3 className="mb-2 font-medium text-[#dde6f5]">ملاحظة سريعة — {noteModal.patientName}</h3>
            <textarea
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="ملاحظة سريعة..."
              rows={3}
              className="mb-4 w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]"
              style={{ borderColor: BORDER }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setNoteModal(null); setQuickNote(''); }}
                className="rounded-xl border px-4 py-2 text-sm text-[#dde6f5]"
                style={{ borderColor: BORDER }}
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={savingNote}
                onClick={handleSaveNote}
                className="rounded-xl px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                style={{ background: GREEN }}
              >
                {savingNote ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// —— Tab 2: العلامات الحيوية ——
interface VitalRow {
  id: string;
  heartRate?: number | null;
  bloodPressure?: string | null;
  oxygenSaturation?: number | null;
  temperature?: number | null;
  painLevel?: number | null;
  notes?: string | null;
  recordedAt: string;
  recordedBy?: { nameAr?: string | null };
}

function VitalsTab({ toast }: { toast: (m: string) => void }) {
  const todayStr = todayDateStr();
  const [todayPatients, setTodayPatients] = useState<{ id: string; nameAr?: string }[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [history, setHistory] = useState<VitalRow[]>([]);
  const [latest, setLatest] = useState<VitalRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    heartRate: '',
    bloodPressure: '',
    oxygenSaturation: '',
    temperature: '',
    painLevel: 5,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiGet<Appointment[]>(`/appointments?startDate=${todayStr}&endDate=${todayStr}`)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const ids = new Set<string>();
        const names: { id: string; nameAr?: string }[] = [];
        list.forEach((a) => {
          const pid = (a as { patientId?: string }).patientId ?? (a as { patient?: { id: string } }).patient?.id;
          const name = (a as { patient?: { nameAr?: string } }).patient?.nameAr;
          if (pid && !ids.has(pid)) {
            ids.add(pid);
            names.push({ id: pid, nameAr: name });
          }
        });
        setTodayPatients(names);
        if (names.length && !selectedPatientId) setSelectedPatientId(names[0].id);
      })
      .catch(() => setTodayPatients([]));
  }, [todayStr]);

  useEffect(() => {
    if (!selectedPatientId) {
      setHistory([]);
      setLatest(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      apiGet<VitalRow[]>(`/vitals/${selectedPatientId}?limit=10`),
      apiGet<VitalRow | null>(`/vitals/${selectedPatientId}/latest`),
    ])
      .then(([h, l]) => {
        setHistory(Array.isArray(h) ? h : []);
        setLatest(l ?? null);
      })
      .catch(() => {
        setHistory([]);
        setLatest(null);
      })
      .finally(() => setLoading(false));
  }, [selectedPatientId]);

  const handleSubmit = async () => {
    if (!selectedPatientId) return;
    setSubmitting(true);
    try {
      await apiPost('/vitals', {
        patientId: selectedPatientId,
        heartRate: form.heartRate ? Number(form.heartRate) : undefined,
        bloodPressure: form.bloodPressure || undefined,
        oxygenSaturation: form.oxygenSaturation ? Number(form.oxygenSaturation) : undefined,
        temperature: form.temperature ? Number(form.temperature) : undefined,
        painLevel: form.painLevel,
        notes: form.notes || undefined,
      });
      toast('✓ تم تسجيل القياسات');
      setForm({ heartRate: '', bloodPressure: '', oxygenSaturation: '', temperature: '', painLevel: 5, notes: '' });
      setFormOpen(false);
      setLatest(null);
      setHistory([]);
      const [h, l] = await Promise.all([
        apiGet<VitalRow[]>(`/vitals/${selectedPatientId}?limit=10`),
        apiGet<VitalRow | null>(`/vitals/${selectedPatientId}/latest`),
      ]);
      setHistory(Array.isArray(h) ? h : []);
      setLatest(l ?? null);
    } catch (e) {
      toast((e as Error).message ?? 'فشل الحفظ');
    } finally {
      setSubmitting(false);
    }
  };

  const vitalColor = (type: string, value: number | string | null | undefined) => {
    if (value == null || value === '') return BORDER;
    const n = typeof value === 'string' ? parseFloat(value) : value;
    if (type === 'heartRate') return n >= 60 && n <= 100 ? GREEN : AMBER;
    if (type === 'oxygen') return n >= 95 ? GREEN : n < 90 ? RED : AMBER;
    if (type === 'temp') return n >= 36 && n <= 37.5 ? GREEN : AMBER;
    if (type === 'pain') return n < 4 ? GREEN : n <= 7 ? AMBER : RED;
    return BORDER;
  };

  const painEmoji = (n: number) => (n <= 3 ? '😊' : n <= 6 ? '😐' : '😣');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-[#4b5875]">المريض:</label>
        <select
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          className="rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]"
          style={{ borderColor: BORDER }}
        >
          {todayPatients.map((p) => (
            <option key={p.id} value={p.id}>{p.nameAr ?? p.id}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-green-400" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: '💓 معدل القلب', value: latest?.heartRate, unit: 'bpm', type: 'heartRate' },
              { label: '🩸 ضغط الدم', value: latest?.bloodPressure, unit: '', type: '' },
              { label: '🫁 تشبع الأكسجين', value: latest?.oxygenSaturation, unit: '%', type: 'oxygen' },
              { label: '🌡️ درجة الحرارة', value: latest?.temperature, unit: '°C', type: 'temp' },
              { label: '😣 مستوى الألم', value: latest?.painLevel, unit: '', type: 'pain' },
              { label: '🕐 وقت القياس', value: latest?.recordedAt ? new Date(latest.recordedAt).toLocaleTimeString('ar-SA') : '—', unit: '', type: '' },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-2xl border p-3"
                style={{
                  background: SURFACE,
                  borderColor: c.type ? vitalColor(c.type, c.value) : BORDER,
                  borderTop: `3px solid ${c.type ? vitalColor(c.type, c.value) : GREEN}`,
                }}
              >
                <p className="text-[11px] text-[#4b5875]">{c.label}</p>
                <p className="text-xl font-bold font-mono text-[#dde6f5]">
                  {c.type === 'pain' && c.value != null ? painEmoji(Number(c.value)) + ' ' : ''}
                  {c.value != null && c.value !== '' ? String(c.value) + (c.unit || '') : '—'}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border overflow-hidden" style={{ background: SURFACE, borderColor: BORDER }}>
            <button
              type="button"
              onClick={() => setFormOpen(!formOpen)}
              className="flex w-full items-center justify-between border-b p-4 text-right font-medium text-[#dde6f5] hover:bg-white/5"
              style={{ borderColor: BORDER }}
            >
              تسجيل قياس جديد
              <span className="text-green-400">{formOpen ? '▼' : '▶'}</span>
            </button>
            {formOpen && (
              <div className="border-b p-4" style={{ borderColor: BORDER }}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-[#4b5875]">معدل القلب (bpm)</label>
                    <input
                      type="number"
                      value={form.heartRate}
                      onChange={(e) => setForm((f) => ({ ...f, heartRate: e.target.value }))}
                      className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]"
                      style={{ borderColor: BORDER }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#4b5875]">ضغط الدم (120/80)</label>
                    <input
                      type="text"
                      value={form.bloodPressure}
                      onChange={(e) => setForm((f) => ({ ...f, bloodPressure: e.target.value }))}
                      placeholder="120/80"
                      className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]"
                      style={{ borderColor: BORDER }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#4b5875]">تشبع الأكسجين (%)</label>
                    <input
                      type="number"
                      value={form.oxygenSaturation}
                      onChange={(e) => setForm((f) => ({ ...f, oxygenSaturation: e.target.value }))}
                      className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]"
                      style={{ borderColor: BORDER }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#4b5875]">درجة الحرارة (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.temperature}
                      onChange={(e) => setForm((f) => ({ ...f, temperature: e.target.value }))}
                      className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]"
                      style={{ borderColor: BORDER }}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-[#4b5875]">مستوى الألم 0-10 {painEmoji(form.painLevel)}</label>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={form.painLevel}
                      onChange={(e) => setForm((f) => ({ ...f, painLevel: Number(e.target.value) }))}
                      className="w-full"
                      style={{ accentColor: vitalColor('pain', form.painLevel) }}
                    />
                    <span className="font-mono text-[#dde6f5]">{form.painLevel}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-[#4b5875]">ملاحظات</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]"
                      style={{ borderColor: BORDER }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="mt-4 rounded-xl px-4 py-2 font-medium text-black disabled:opacity-50"
                  style={{ background: GREEN }}
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ القياسات'}
                </button>
              </div>
            )}

            <div className="p-4">
              <h4 className="mb-2 text-sm font-medium text-[#4b5875]">آخر 5 قياسات</h4>
              {history.length === 0 ? (
                <p className="text-sm text-[#4b5875]">لا توجد قياسات سابقة</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-right text-[#4b5875]">
                        <th className="p-2">التاريخ</th>
                        <th className="p-2">القلب</th>
                        <th className="p-2">الضغط</th>
                        <th className="p-2">الأكسجين</th>
                        <th className="p-2">الألم</th>
                        <th className="p-2">الممرض</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 5).map((v) => (
                        <tr key={v.id} className="text-[#dde6f5]">
                          <td className="p-2 font-mono">{new Date(v.recordedAt).toLocaleString('ar-SA')}</td>
                          <td className="p-2 font-mono">{v.heartRate ?? '—'}</td>
                          <td className="p-2 font-mono">{v.bloodPressure ?? '—'}</td>
                          <td className="p-2 font-mono">{v.oxygenSaturation ?? '—'}</td>
                          <td className="p-2 font-mono">{v.painLevel != null ? painEmoji(v.painLevel) + ' ' + v.painLevel : '—'}</td>
                          <td className="p-2">{v.recordedBy?.nameAr ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-2 flex gap-0.5">
                    {history.slice(0, 5).map((v) => (
                      <div
                        key={v.id}
                        className="h-6 flex-1 rounded-sm"
                        style={{
                          background: vitalColor('pain', v.painLevel),
                          opacity: 0.8,
                        }}
                        title={`الألم: ${v.painLevel ?? '—'}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// —— Tab 3: متابعة النقل ——
type TransportRow = {
  id: string;
  status?: string;
  pickupTime?: string;
  patientId?: string;
  patient?: { nameAr?: string };
  driver?: { user?: { nameAr?: string }; vehicle?: { plateNumber?: string } };
  mobilityNeed?: string | null;
};

function TransportTab({ toast }: { toast: (m: string) => void }) {
  const todayStr = todayDateStr();
  const [requests, setRequests] = useState<TransportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiGet<TransportRow[]>('/transport/requests')
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setRequests(list.filter((r) => {
          const t = (r.pickupTime ?? (r as { createdAt?: string }).createdAt ?? '').toString();
          return t.startsWith(todayStr);
        }));
      })
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [todayStr]);

  useEffect(() => {
    load();
  }, [load]);

  const inTransit = requests.filter((r) => r.status === 'en_route' || r.status === 'assigned');
  const needsHelp = requests.filter((r) => r.mobilityNeed && r.mobilityNeed !== 'walking').length;
  const unassigned = requests.filter((r) => !(r as { driverId?: string }).driverId && r.status === 'requested');

  const handleReceive = async (id: string, patientName: string, currentStatus?: string) => {
    setUpdating(id);
    try {
      const nextStatus = currentStatus === 'arrived_at_center' ? 'completed' : 'arrived_at_center';
      await apiPatch(`/transport/requests/${id}/status`, { status: nextStatus });
      toast(`✓ تم استقبال ${patientName}`);
      load();
    } catch {
      toast('فشل التحديث');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'رحلات اليوم', value: requests.length },
          { label: 'في الطريق', value: inTransit.length },
          { label: 'يحتاج مساعدة وصول', value: needsHelp },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border p-4"
            style={{ background: SURFACE, borderColor: BORDER, borderTop: `3px solid ${GREEN}` }}
          >
            <p className="text-[11px] text-[#4b5875]">{s.label}</p>
            <p className="text-2xl font-bold font-mono" style={{ color: GREEN }}>{s.value}</p>
          </div>
        ))}
      </div>

      {unassigned.length > 0 && (
        <div className="rounded-xl border p-4" style={{ background: 'rgba(251,191,36,0.1)', borderColor: AMBER }}>
          <span className="text-amber-400">⚠️ {unassigned.length} رحلات غير مسندة — تواصل مع الاستقبال</span>
        </div>
      )}

      <div className="rounded-2xl border overflow-hidden" style={{ background: SURFACE, borderColor: BORDER }}>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-green-400" /></div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-[#4b5875]">لا توجد رحلات اليوم</div>
        ) : (
          <ul>
            {requests.map((r) => {
              const hasMobility = r.mobilityNeed && r.mobilityNeed !== 'walking';
              const statusStyle = getStatusBadgeStyle(r.status ?? '');
              return (
                <li
                  key={r.id}
                  className={`flex flex-wrap items-center gap-3 border-b px-4 py-3 ${hasMobility ? 'bg-amber-500/5' : ''}`}
                  style={{ borderColor: BORDER }}
                >
                  <span className="font-mono text-sm" style={{ color: GREEN }}>
                    {r.pickupTime ? new Date(r.pickupTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                  <span className="font-medium text-[#dde6f5]">{r.patient?.nameAr ?? '—'}</span>
                  {hasMobility && (
                    <span className="rounded px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400">يحتاج مساعدة</span>
                  )}
                  <span className="text-sm text-[#4b5875]">
                    {r.driver?.user?.nameAr ?? '—'} · {r.driver?.vehicle?.plateNumber ?? '—'}
                  </span>
                  <span className="rounded px-2 py-0.5 text-xs" style={statusStyle}>
                    {getStatusLabel(r.status ?? '', 'transport')}
                  </span>
                  {(r.status === 'en_route' || r.status === 'arrived_at_center') && (
                    <button
                      type="button"
                      disabled={!!updating}
                      onClick={() => handleReceive(r.id, r.patient?.nameAr ?? 'المريض', r.status)}
                      className="mr-auto rounded-lg bg-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                    >
                      استقبال المريض ✓
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// —— Tab 4: مهامي (localStorage) ——
const DEFAULT_TASKS = [
  'استقبال المرضى القادمين بالسيارة',
  'قياس العلامات الحيوية قبل الجلسات',
  'تجهيز الغرف وتعقيمها',
  'مساعدة المرضى باحتياجات التنقل',
  'إعداد تقرير نهاية الوردية',
];

type TaskStatus = 'pending' | 'in_progress' | 'completed';
interface TaskItem {
  id: string;
  text: string;
  status: TaskStatus;
}

const TASK_KEY = (date: string) => `nurse-tasks-${date}`;

function TasksTab(_props: { toast: (m: string) => void }) {
  const todayStr = todayDateStr();
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const raw = localStorage.getItem(TASK_KEY(todayStr));
      if (raw) {
        const parsed = JSON.parse(raw) as TaskItem[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_TASKS.map((text, i) => ({
      id: `default-${i}-${todayStr}`,
      text,
      status: 'pending' as TaskStatus,
    }));
  });
  const [newTaskText, setNewTaskText] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(TASK_KEY(todayStr), JSON.stringify(tasks));
    } catch {}
  }, [tasks, todayStr]);

  const completed = tasks.filter((t) => t.status === 'completed').length;
  const progress = tasks.length ? (completed / tasks.length) * 100 : 0;

  const cycleStatus = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next: TaskStatus = t.status === 'pending' ? 'in_progress' : t.status === 'in_progress' ? 'completed' : 'pending';
        return { ...t, status: next };
      })
    );
  };

  const addTask = () => {
    const text = newTaskText.trim();
    if (!text) return;
    setTasks((prev) => [...prev, { id: `custom-${Date.now()}`, text, status: 'pending' }]);
    setNewTaskText('');
  };

  const statusLabel = (s: TaskStatus) => (s === 'pending' ? 'معلق' : s === 'in_progress' ? 'قيد التنفيذ' : 'مكتمل');

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border p-4" style={{ background: SURFACE, borderColor: BORDER }}>
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-[#4b5875]">{completed}/{tasks.length} مكتملة</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: BORDER }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: GREEN }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="إضافة مهمة..."
          className="flex-1 rounded-lg border bg-[#06080e] px-3 py-2 text-[#dde6f5]"
          style={{ borderColor: BORDER }}
        />
        <button
          type="button"
          onClick={addTask}
          className="rounded-xl px-4 py-2 font-medium text-black"
          style={{ background: GREEN }}
        >
          + إضافة مهمة
        </button>
      </div>

      <ul className="space-y-2">
        {tasks.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-3 rounded-2xl border p-4 transition-all"
            style={{
              background: SURFACE,
              borderColor: BORDER,
              textDecoration: t.status === 'completed' ? 'line-through' : 'none',
              opacity: t.status === 'completed' ? 0.8 : 1,
            }}
          >
            <button
              type="button"
              onClick={() => cycleStatus(t.id)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all"
              style={{
                borderColor: t.status === 'completed' ? GREEN : BORDER,
                background: t.status === 'completed' ? GREEN : 'transparent',
                color: t.status === 'completed' ? 'black' : '#4b5875',
              }}
            >
              {t.status === 'completed' ? '✓' : t.status === 'in_progress' ? '⋯' : '○'}
            </button>
            <span className="flex-1 text-[#dde6f5]">{t.text}</span>
            <span
              className="rounded px-2 py-0.5 text-xs"
              style={{
                background: t.status === 'completed' ? `${GREEN}22` : t.status === 'in_progress' ? `${AMBER}22` : 'rgba(255,255,255,0.06)',
                color: t.status === 'completed' ? GREEN : t.status === 'in_progress' ? AMBER : '#4b5875',
              }}
            >
              {statusLabel(t.status)}
            </span>
          </li>
        ))}
      </ul>

      {completed === tasks.length && tasks.length > 0 && (
        <div className="rounded-2xl border p-6 text-center" style={{ background: `${GREEN}15`, borderColor: GREEN }}>
          <p className="mb-4 text-lg font-medium text-green-400">✨ أكملت جميع مهام الوردية!</p>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl px-4 py-2 font-medium text-black"
            style={{ background: GREEN }}
          >
            تصدير ملخص الوردية
          </button>
        </div>
      )}
    </div>
  );
}
