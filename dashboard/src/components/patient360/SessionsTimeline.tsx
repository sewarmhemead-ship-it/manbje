import { Badge } from '@/components/ui/badge';

const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';

interface Session {
  id: string;
  recoveryScore?: number | null;
  subjective?: string | null;
  appointment?: {
    startTime: string;
    doctor?: { nameAr?: string | null; nameEn?: string | null };
    room?: { name?: string; roomNumber?: string };
    equipment?: { name?: string } | null;
  };
}

export function SessionsTimeline({ sessions }: { sessions: unknown[] }) {
  const list = (sessions as Session[]).slice().sort((a, b) => {
    const tA = a.appointment?.startTime ?? '';
    const tB = b.appointment?.startTime ?? '';
    return tB.localeCompare(tA);
  });

  if (!list.length) {
    return <p className="py-6 text-center text-gray-400">لا توجد جلسات مسجلة بعد</p>;
  }

  return (
    <ul className="space-y-4">
      {list.map((s, i) => (
        <li key={s.id} className="rounded-2xl border p-4" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-400" style={{ fontFamily: "'Space Mono', monospace" }}>
              {list.length - i}
            </span>
            <span className="text-sm text-gray-400">
              {s.appointment?.startTime ? new Date(s.appointment.startTime).toLocaleDateString('ar-SA') : '—'}
            </span>
            {s.recoveryScore != null && (
              <Badge className="bg-cyan-500/20 text-cyan-400 text-xs" style={{ fontFamily: "'Space Mono', monospace" }}>{s.recoveryScore}%</Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-300">
            {(s.subjective ?? '—').slice(0, 80)}{(s.subjective?.length ?? 0) > 80 ? '…' : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {s.appointment?.doctor && (
              <Badge variant="outline" className="border-white/10 text-gray-400 text-xs">
                د. {s.appointment.doctor.nameAr ?? s.appointment.doctor.nameEn ?? '—'}
              </Badge>
            )}
            {(s.appointment?.room?.name || s.appointment?.room?.roomNumber) && (
              <Badge variant="outline" className="border-white/10 text-gray-400 text-xs">
                {s.appointment.room.name ?? `غرفة ${s.appointment.room.roomNumber}`}
              </Badge>
            )}
            {s.appointment?.equipment?.name && (
              <Badge variant="outline" className="border-white/10 text-gray-400 text-xs">
                {s.appointment.equipment.name}
              </Badge>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
