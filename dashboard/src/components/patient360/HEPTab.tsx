import { useState, useEffect } from 'react';
import { Dumbbell, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiGet, apiPost } from '@/lib/api';

const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';
const DAYS_AR = ['سبت', 'أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];

interface PatientExercise {
  id: string;
  frequency?: string | null;
  isCompleted: boolean;
  completions?: { completedAt: string }[];
  exercise?: { name: string; targetMuscles?: string | null };
}

export function HEPTab({ patientId, toast }: { patientId: string; toast: (m: string) => void }) {
  const [list, setList] = useState<PatientExercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<PatientExercise[]>(`/patients/${patientId}/exercises`)
      .then((r) => setList(Array.isArray(r) ? r : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [patientId]);

  const markComplete = async (id: string) => {
    try {
      await apiPost(`/patient-exercises/${id}/complete`, {});
      toast('تم تسجيل الإكمال');
      setList((prev) => prev.map((pe) => (pe.id === id ? { ...pe, isCompleted: true, completions: [...(pe.completions ?? []), { completedAt: new Date().toISOString() }] } : pe)));
    } catch (err) {
      toast((err as Error).message);
    }
  };

  if (loading) return <p className="text-gray-400">جاري التحميل…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">💪 برنامج التمارين المنزلية</h2>
        <Button size="sm" variant="outline" className="border-cyan-500/30 text-cyan-400">
          <Send className="mr-2 h-4 w-4" /> 📩 إرسال للمريض
        </Button>
      </div>
      {!list.length ? (
        <p className="rounded-2xl border py-12 text-center text-gray-400" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>لا توجد تمارين محددة بعد</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((pe) => {
            const weekCompletions = (pe.completions ?? []).filter((c) => {
              const d = new Date(c.completedAt);
              const now = new Date();
              const weekStart = new Date(now);
              weekStart.setDate(now.getDate() - now.getDay() + 1);
              return d >= weekStart;
            });
            const dayDots = [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
              const hasCompletion = weekCompletions.some((c) => new Date(c.completedAt).getDay() === (dayIndex + 6) % 7);
              return { day: DAYS_AR[dayIndex], done: hasCompletion };
            });
            const weekProgress = dayDots.filter((d) => d.done).length / 7 * 100;
            return (
              <Card key={pe.id} className="rounded-2xl border transition-all hover:border-cyan-500/30" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20">
                      <Dumbbell className="h-5 w-5 text-cyan-400" />
                    </div>
                    <CardTitle className="text-base text-white">{pe.exercise?.name ?? 'تمرين'}</CardTitle>
                  </div>
                  <p className="text-xs text-gray-400">{pe.exercise?.targetMuscles ?? '—'}</p>
                  <p className="text-xs text-cyan-400">التكرار: {pe.frequency ?? '—'}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-gray-400">
                    {dayDots.map((d, i) => (
                      <span key={i} className={d.done ? 'text-emerald-400' : ''} title={d.day}>{d.done ? '✓' : '○'}</span>
                    ))}
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-cyan-500/50 transition-all" style={{ width: `${weekProgress}%` }} />
                  </div>
                  <p className="text-xs text-gray-400" style={{ fontFamily: "'Space Mono', monospace" }}>{weekProgress.toFixed(0)}% هذا الأسبوع</p>
                  <Button size="sm" className="w-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" onClick={() => markComplete(pe.id)} disabled={pe.isCompleted}>
                    ✅ {pe.isCompleted ? 'تم' : 'تم'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
