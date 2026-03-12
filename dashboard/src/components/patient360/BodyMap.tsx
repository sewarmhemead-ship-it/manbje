import { useState } from 'react';

const BORDER = 'rgba(255,255,255,0.06)';
const RED = '#f87171';
const AMBER = '#fbbf24';
const GREEN = '#34d399';

interface PainPoint {
  id: string;
  x: number;
  y: number;
  severity: number;
  area: string;
}

const AREAS = [
  { id: 'head', name: 'الرأس', cx: 50, cy: 12, r: 8 },
  { id: 'neck', name: 'الرقبة', cx: 50, cy: 22, r: 6 },
  { id: 'shoulder-l', name: 'الكتف الأيسر', cx: 28, cy: 24, r: 6 },
  { id: 'shoulder-r', name: 'الكتف الأيمن', cx: 72, cy: 24, r: 6 },
  { id: 'chest', name: 'الصدر', cx: 50, cy: 35, r: 10 },
  { id: 'back', name: 'أعلى الظهر', cx: 50, cy: 42, r: 8 },
  { id: 'elbow-l', name: 'المرفق الأيسر', cx: 22, cy: 45, r: 5 },
  { id: 'elbow-r', name: 'المرفق الأيمن', cx: 78, cy: 45, r: 5 },
  { id: 'wrist-l', name: 'المعصم الأيسر', cx: 18, cy: 58, r: 4 },
  { id: 'wrist-r', name: 'المعصم الأيمن', cx: 82, cy: 58, r: 4 },
  { id: 'low-back', name: 'أسفل الظهر', cx: 50, cy: 52, r: 8 },
  { id: 'hip-l', name: 'الورك الأيسر', cx: 38, cy: 58, r: 6 },
  { id: 'hip-r', name: 'الورك الأيمن', cx: 62, cy: 58, r: 6 },
  { id: 'knee-l', name: 'الركبة اليسرى', cx: 36, cy: 72, r: 5 },
  { id: 'knee-r', name: 'الركبة اليمنى', cx: 64, cy: 72, r: 5 },
  { id: 'ankle-l', name: 'الكاحل الأيسر', cx: 34, cy: 88, r: 4 },
  { id: 'ankle-r', name: 'الكاحل الأيمن', cx: 66, cy: 88, r: 4 },
];

function getColor(severity: number) {
  if (severity <= 3) return GREEN;
  if (severity <= 6) return AMBER;
  return RED;
}

export function BodyMap() {
  const [points, setPoints] = useState<PainPoint[]>([]);
  const [severity, setSeverity] = useState(5);

  const addPoint = (areaId: string, areaName: string, cx: number, cy: number) => {
    setPoints((prev) => [
      ...prev.filter((p) => p.area !== areaName),
      { id: areaId + Date.now(), x: cx, y: cy, severity, area: areaName },
    ]);
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <div className="flex-1">
        <svg viewBox="0 0 100 100" className="mx-auto h-auto max-h-[320px] w-full" style={{ maxWidth: 280 }}>
          <ellipse cx="50" cy="18" rx="14" ry="12" fill="none" stroke={BORDER} strokeWidth="1.5" />
          <path d="M 38 28 L 36 50 L 32 75 L 30 92 M 62 28 L 64 50 L 68 75 L 70 92" fill="none" stroke={BORDER} strokeWidth="1.5" />
          <path d="M 36 50 Q 50 55 64 50" fill="none" stroke={BORDER} strokeWidth="1.5" />
          <path d="M 32 75 Q 50 78 68 75" fill="none" stroke={BORDER} strokeWidth="1.5" />
          {AREAS.map((a) => (
            <circle
              key={a.id}
              cx={a.cx}
              cy={a.cy}
              r={a.r}
              fill="transparent"
              stroke={points.some((p) => p.area === a.name) ? getColor(points.find((p) => p.area === a.name)!.severity) : 'rgba(255,255,255,0.2)'}
              strokeWidth="1"
              className="cursor-pointer hover:opacity-80"
              onClick={() => addPoint(a.id, a.name, a.cx, a.cy)}
            />
          ))}
          {points.map((p) => {
            const isSevere = p.severity >= 7;
            return (
              <g key={p.id}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="5"
                  fill={getColor(p.severity)}
                  stroke="#0b0f1a"
                  strokeWidth="0.5"
                  className={isSevere ? 'animate-painPulse' : ''}
                />
                <text x={p.x} y={p.y + 0.8} textAnchor="middle" fill="#0b0f1a" fontSize="3" fontWeight="bold">{p.severity}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="w-full space-y-2 md:w-52">
        <p className="text-xs font-medium text-gray-400">شدة الألم (1–10)</p>
        <input
          type="range"
          min="1"
          max="10"
          value={severity}
          onChange={(e) => setSeverity(Number(e.target.value))}
          className="w-full accent-cyan-500"
        />
        <p className="text-sm text-cyan-400">{severity} — {severity <= 3 ? 'خفيف' : severity <= 6 ? 'متوسط' : 'شديد'}</p>
        <div className="mt-2 space-y-1 text-xs text-gray-400">
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> أخضر (1–3)</div>
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" /> كهرماني (4–6)</div>
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" /> أحمر (7–10)</div>
        </div>
        <div className="mt-3 space-y-2">
          {points.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="text-xs text-white">{p.area}</span>
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${p.severity * 10}%`, backgroundColor: getColor(p.severity) }} />
              </div>
              <span className="text-xs text-gray-400" style={{ fontFamily: "'Space Mono', monospace" }}>{p.severity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
