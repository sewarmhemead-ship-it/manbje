import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '@/lib/api';
import type { PatientRecord } from '@/pages/Patient360';
import { BodyMap } from './BodyMap';
import { RecoveryBarChart } from './RecoveryBarChart';
import { SessionsTimeline } from './SessionsTimeline';

const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';
const GRADIENTS = ['from-cyan-500/30 to-cyan-600/20', 'from-green-500/30 to-green-600/20', 'from-amber-500/30 to-amber-600/20', 'from-purple-500/30 to-purple-600/20', 'from-pink-500/30 to-pink-600/20'];

function patientIdDisplay(id: string, createdAt: string): string {
  const y = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  return `PT-${y}-${id.replace(/-/g, '').slice(0, 4).toUpperCase()}`;
}

interface OverviewTabProps {
  patientId: string;
  patient: PatientRecord;
}

export function OverviewTab({ patientId, patient }: OverviewTabProps) {
  const [progress, setProgress] = useState<{ date: string; recoveryScore: number }[]>([]);
  const [sessions, setSessions] = useState<unknown[]>([]);
  const [attachments, setAttachments] = useState<unknown[]>([]);
  const [exercises, setExercises] = useState<unknown[]>([]);
  const [nextAppointment, setNextAppointment] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<{ date: string; recoveryScore: number }[]>(`/patients/${patientId}/progress`).catch(() => []),
      apiGet<unknown[]>(`/patients/${patientId}/sessions`).catch(() => []),
      apiGet<unknown[]>(`/attachments/patient/${patientId}`).catch(() => []),
      apiGet<unknown[]>(`/patients/${patientId}/exercises`).catch(() => []),
      apiGet<unknown[]>(`/appointments/patient/${patientId}`).then((list) => {
        const arr = Array.isArray(list) ? list : [];
        const upcoming = arr.filter((a: unknown) => {
          const x = a as { startTime?: string; status?: string };
          return x.startTime && new Date(x.startTime) >= new Date() && x.status !== 'cancelled';
        });
        return upcoming.length ? (upcoming[0] as Record<string, unknown>) : null;
      }).catch(() => null),
    ]).then(([p, s, a, e, next]) => {
      setProgress(Array.isArray(p) ? p : []);
      setSessions(Array.isArray(s) ? s : []);
      setAttachments(Array.isArray(a) ? a : []);
      setExercises(Array.isArray(e) ? e : []);
      setNextAppointment(next);
    });
  }, [patientId]);

  const sessionsCount = sessions.length;
  const lastScore = progress.length ? progress[progress.length - 1]?.recoveryScore : null;
  const xraysCount = attachments.length;
  const exercisesCount = exercises.length;
  const gradient = GRADIENTS[patientId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 5];

  return (
    <div className="grid gap-6 lg:grid-cols-[2.2fr_1fr]">
      <div className="space-y-6">
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader>
            <CardTitle className="text-base text-white">خريطة الألم</CardTitle>
          </CardHeader>
          <CardContent>
            <BodyMap />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader>
            <CardTitle className="text-base text-white">منحنى التعافي</CardTitle>
          </CardHeader>
          <CardContent>
            <RecoveryBarChart data={progress} />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader>
            <CardTitle className="text-base text-white">جدول الجلسات</CardTitle>
          </CardHeader>
          <CardContent>
            <SessionsTimeline sessions={sessions} />
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-lg font-bold text-white`}>
                {(patient.nameAr ?? '؟').slice(0, 2)}
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-white">{patient.nameAr}</h2>
                <p className="text-sm text-gray-400" style={{ fontFamily: "'Space Mono', monospace" }}>{patientIdDisplay(patient.id, patient.createdAt)}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {patient.diagnosis && <Badge className="bg-cyan-500/20 text-cyan-400">{patient.diagnosis}</Badge>}
                <Badge variant="outline" className="border-white/10 text-gray-400">
                  {patient.arrivalPreference === 'center_transport' ? '🚐 نقل' : '🚶 ذاتي'}
                </Badge>
              </div>
              <div className="grid w-full grid-cols-2 gap-2 text-center">
                <div className="rounded-lg p-2" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-xl font-bold text-cyan-400" style={{ fontFamily: "'Space Mono', monospace" }}>{sessionsCount}</p>
                  <p className="text-xs text-gray-400">جلسات</p>
                </div>
                <div className="rounded-lg p-2" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-xl font-bold text-emerald-400" style={{ fontFamily: "'Space Mono', monospace" }}>{lastScore ?? '—'}%</p>
                  <p className="text-xs text-gray-400">تعافي</p>
                </div>
                <div className="rounded-lg p-2" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-xl font-bold text-amber-400" style={{ fontFamily: "'Space Mono', monospace" }}>{xraysCount}</p>
                  <p className="text-xs text-gray-400">أشعة</p>
                </div>
                <div className="rounded-lg p-2" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-xl font-bold text-cyan-400" style={{ fontFamily: "'Space Mono', monospace" }}>{exercisesCount}</p>
                  <p className="text-xs text-gray-400">تمارين</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader>
            <CardTitle className="text-base text-white">المعلومات الطبية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="التشخيص" value={patient.diagnosis ?? '—'} />
            <Row label="الطبيب المعيّن" value={patient.assignedDoctor?.nameAr ?? patient.assignedDoctor?.nameEn ?? '—'} />
            <Row label="التأمين" value={patient.insuranceCompany ?? '—'} />
            <Row label="نوع الوصول" value={patient.arrivalPreference === 'center_transport' ? 'نقل المركز' : 'ذاتي'} />
            <Row label="الحساسية" value={patient.notes?.slice(0, 80) ?? '—'} />
            <Row label="الهاتف" value={patient.phone ?? '—'} />
            <Row label="البريد" value={patient.email ?? '—'} />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <CardHeader>
            <CardTitle className="text-base text-white">الموعد القادم</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {nextAppointment ? (
              <>
                <p className="text-gray-300">
                  {nextAppointment.startTime ? new Date(nextAppointment.startTime as string).toLocaleString('ar-SA') : '—'}
                </p>
                <p className="mt-1 text-gray-400">{(nextAppointment.doctor as { nameAr?: string })?.nameAr ?? '—'}</p>
                <p className="text-gray-400">{(nextAppointment.room as { roomNumber?: string; name?: string })?.roomNumber ?? (nextAppointment.room as { name?: string })?.name ?? '—'}</p>
                {nextAppointment.arrivalType === 'center_transport' && (
                  <p className="mt-2 text-cyan-400">
                    🚐 لوحة: {((nextAppointment.transportRequest as { vehicle?: { plateNumber?: string } })?.vehicle?.plateNumber) ?? '—'}
                    {(nextAppointment.transportRequest as { pickupTime?: string })?.pickupTime && ` — استلام ${new Date((nextAppointment.transportRequest as { pickupTime: string }).pickupTime).toLocaleTimeString('ar-SA')}`}
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-500">لا يوجد موعد قادم</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
