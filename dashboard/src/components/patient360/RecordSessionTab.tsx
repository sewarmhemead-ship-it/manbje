import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiGet, apiPost } from '@/lib/api';

const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';
const GREEN = '#34d399';
const AMBER = '#fbbf24';
const RED = '#f87171';

interface Appointment {
  id: string;
  startTime: string;
  status: string;
  doctor?: { nameAr?: string | null };
  room?: { name?: string };
}

export function RecordSessionTab({
  patientId,
  toast,
  onSuccess,
}: {
  patientId: string;
  toast: (m: string) => void;
  onSuccess: () => void;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentId, setAppointmentId] = useState('');
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [recoveryScore, setRecoveryScore] = useState(50);
  const [therapistNotes, setTherapistNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lachman, setLachman] = useState<'positive' | 'negative' | null>(null);
  const [mcMurray, setMcMurray] = useState<'positive' | 'negative' | null>(null);
  const [anteriorDrawer, setAnteriorDrawer] = useState<'positive' | 'negative' | null>(null);
  const [pivotShift, setPivotShift] = useState<'positive' | 'negative' | null>(null);
  const [valgusStress, setValgusStress] = useState<'positive' | 'negative' | null>(null);
  const [varusStress, setVarusStress] = useState<'positive' | 'negative' | null>(null);
  const [flexion, setFlexion] = useState(90);
  const [extension, setExtension] = useState(0);
  const [quadStrength, setQuadStrength] = useState(3);
  const [hamstringStrength, setHamstringStrength] = useState(3);
  const [gastroStrength, setGastroStrength] = useState(3);
  const [equipment, setEquipment] = useState<Record<string, boolean>>({});

  useEffect(() => {
    apiGet<Appointment[]>(`/appointments/patient/${patientId}`)
      .then((r) => {
        const list = Array.isArray(r) ? r : [];
        const scheduled = list.filter((a) => a.status === 'scheduled' || a.status === 'in_progress');
        setAppointments(scheduled);
        if (scheduled[0]) setAppointmentId(scheduled[0].id);
      })
      .catch(() => setAppointments([]));
  }, [patientId]);

  const recoveryColor = recoveryScore > 70 ? GREEN : recoveryScore >= 40 ? AMBER : RED;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentId) {
      toast('اختر الموعد');
      return;
    }
    setSubmitting(true);
    try {
      await apiPost('/clinical-sessions', {
        appointmentId,
        subjective: subjective || undefined,
        objective: objective || undefined,
        assessment: assessment || undefined,
        plan: plan || undefined,
        recoveryScore,
        therapistNotes: therapistNotes || undefined,
      });
      toast('تم حفظ الجلسة');
      onSuccess();
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEquipment = (key: string) => setEquipment((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
        <CardHeader>
          <CardTitle className="text-base text-white">تسجيل جلسة (SOAP)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">الموعد</label>
              <select value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white focus:border-cyan-500" style={{ borderColor: BORDER }} required>
                <option value="">اختر الموعد</option>
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>{new Date(a.startTime).toLocaleString('ar-SA')} — {a.doctor?.nameAr ?? '—'}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="mb-1 inline-block rounded px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400">S</span>
              <label className="sr-only">ذاتي (Subjective)</label>
              <textarea value={subjective} onChange={(e) => setSubjective(e.target.value)} rows={3} placeholder="ماذا يقول المريض..." className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white placeholder:text-gray-500 focus:border-cyan-500" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <span className="mb-1 inline-block rounded px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400">O</span>
              <label className="sr-only">موضوعي (Objective)</label>
              <textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={3} placeholder="الملاحظات الموضوعية..." className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white placeholder:text-gray-500 focus:border-cyan-500" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <span className="mb-1 inline-block rounded px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400">A</span>
              <label className="sr-only">تقييم (Assessment)</label>
              <textarea value={assessment} onChange={(e) => setAssessment(e.target.value)} rows={2} placeholder="التشخيص/التقييم..." className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white placeholder:text-gray-500 focus:border-cyan-500" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <span className="mb-1 inline-block rounded px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400">P</span>
              <label className="sr-only">خطة (Plan)</label>
              <textarea value={plan} onChange={(e) => setPlan(e.target.value)} rows={2} placeholder="الخطة العلاجية..." className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white placeholder:text-gray-500 focus:border-cyan-500" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400">نسبة التعافي (0–100)</label>
                <span className="text-sm font-medium" style={{ color: recoveryColor, fontFamily: "'Space Mono', monospace" }}>{recoveryScore}</span>
              </div>
              <input type="range" min="0" max="100" value={recoveryScore} onChange={(e) => setRecoveryScore(Number(e.target.value))} className="mt-1 w-full accent-cyan-500" style={{ accentColor: recoveryColor }} />
            </div>
            <div>
              <label className="text-sm text-gray-400">ملاحظات المعالج (اختياري)</label>
              <textarea value={therapistNotes} onChange={(e) => setTherapistNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white focus:border-cyan-500" style={{ borderColor: BORDER }} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30">
              {submitting ? 'جاري الحفظ…' : 'حفظ الجلسة'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-6">
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader>
            <CardTitle className="text-base text-white">الفحوصات السريرية السريعة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Lachman Test', value: lachman, set: setLachman },
              { label: 'McMurray Test', value: mcMurray, set: setMcMurray },
              { label: 'Anterior Drawer', value: anteriorDrawer, set: setAnteriorDrawer },
              { label: 'Pivot Shift', value: pivotShift, set: setPivotShift },
              { label: 'Valgus Stress', value: valgusStress, set: setValgusStress },
              { label: 'Varus Stress', value: varusStress, set: setVarusStress },
            ].map(({ label, value, set }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{label}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => set('positive')} className={`rounded px-2 py-1 text-xs ${value === 'positive' ? 'bg-red-500/20 text-red-400' : 'border border-white/10 text-gray-400'}`}>موجب</button>
                  <button type="button" onClick={() => set('negative')} className={`rounded px-2 py-1 text-xs ${value === 'negative' ? 'bg-emerald-500/20 text-emerald-400' : 'border border-white/10 text-gray-400'}`}>سالب</button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader>
            <CardTitle className="text-base text-white">مدى الحركة (ROM)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">الثني (Flexion) 0–180°</p>
              <div className="flex items-center gap-2">
                <input type="range" min="0" max="180" value={flexion} onChange={(e) => setFlexion(Number(e.target.value))} className="flex-1 accent-cyan-500" />
                <span className="text-sm text-cyan-400" style={{ fontFamily: "'Space Mono', monospace" }}>{flexion}°</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-400">الامتداد (Extension) -30° إلى 10°</p>
              <div className="flex items-center gap-2">
                <input type="range" min="-30" max="10" value={extension} onChange={(e) => setExtension(Number(e.target.value))} className="flex-1 accent-cyan-500" />
                <span className="text-sm text-cyan-400" style={{ fontFamily: "'Space Mono', monospace" }}>{extension}°</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader>
            <CardTitle className="text-base text-white">قوة العضلات (0–5)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Quadriceps', value: quadStrength, set: setQuadStrength },
              { label: 'Hamstrings', value: hamstringStrength, set: setHamstringStrength },
              { label: 'Gastrocnemius', value: gastroStrength, set: setGastroStrength },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <p className="text-sm text-gray-400">{label}</p>
                <div className="flex items-center gap-2">
                  <input type="range" min="0" max="5" step="0.5" value={value} onChange={(e) => set(Number(e.target.value))} className="flex-1 accent-cyan-500" />
                  <span className="text-sm text-cyan-400" style={{ fontFamily: "'Space Mono', monospace" }}>{value}/5</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader>
            <CardTitle className="text-base text-white">الأجهزة المستخدمة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {['TENS', 'Ultrasound', 'Hot Pack', 'Cold Pack', 'Resistance Band', 'Balance Board'].map((name) => (
              <label key={name} className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={equipment[name] ?? false} onChange={() => toggleEquipment(name)} className="rounded border-white/20 text-cyan-500" />
                <span className="text-sm text-gray-300">{name}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
