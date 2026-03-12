import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';
const GREEN = '#34d399';
const AMBER = '#fbbf24';
const RED = '#f87171';

function getScoreColor(score: number) {
  if (score > 70) return GREEN;
  if (score >= 40) return AMBER;
  return RED;
}

interface Point {
  date: string;
  recoveryScore: number;
}

export function RecoveryBarChart({ data }: { data: Point[] }) {
  if (!data.length) {
    return <p className="py-8 text-center text-gray-400">لا توجد بيانات بعد</p>;
  }

  const current = data[data.length - 1]?.recoveryScore ?? 0;
  const prev = data[data.length - 2]?.recoveryScore;
  const trend = prev != null && prev !== 0 ? (((current - prev) / prev) * 100) : 0;
  const chartData = data.map((d) => ({
    name: d.date.slice(0, 10),
    score: d.recoveryScore,
    fullDate: d.date,
  }));

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <span className="text-2xl font-bold text-cyan-400" style={{ fontFamily: "'Space Mono', monospace" }}>{current}</span>
        <span className="text-sm text-gray-400">النسبة الحالية</span>
        {prev != null && (
          <span className={trend >= 0 ? 'text-emerald-400' : 'text-red-400'} style={{ fontFamily: "'Space Mono', monospace" }}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% اتجاه
          </span>
        )}
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} stroke={BORDER} />
            <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} stroke={BORDER} />
            <Tooltip
              contentStyle={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8 }}
              labelStyle={{ color: '#fff' }}
              formatter={(value) => [value, 'تعافي']}
              labelFormatter={(_, payload) => (payload?.[0]?.payload as { fullDate?: string })?.fullDate ?? ''}
            />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={getScoreColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
