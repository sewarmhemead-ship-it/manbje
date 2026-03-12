interface Point {
  date: string;
  recoveryScore: number;
}

export function RecoveryCurve({ data }: { data: Point[] }) {
  if (!data.length) {
    return <p className="py-8 text-center text-gray-400">No recovery data yet.</p>;
  }
  const scores = data.map((d) => d.recoveryScore);
  const min = Math.min(...scores, 0);
  const max = Math.max(...scores, 100);
  const range = max - min || 1;
  const w = 400;
  const h = 120;
  const pad = { left: 40, right: 20, top: 10, bottom: 30 };
  const xScale = (i: number) => pad.left + (i / (data.length - 1 || 1)) * (w - pad.left - pad.right);
  const yScale = (v: number) => pad.top + h - pad.top - pad.bottom - ((v - min) / range) * (h - pad.top - pad.bottom);
  const pathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.recoveryScore)}`).join(' ');
  const current = data[data.length - 1]?.recoveryScore ?? 0;
  const prev = data[data.length - 2]?.recoveryScore;
  const trend = prev != null ? ((current - prev) / prev) * 100 : 0;

  return (
    <div>
      <div className="mb-2 flex items-center gap-4">
        <span className="text-2xl font-bold text-cyan-400">{current}</span>
        <span className="text-sm text-gray-400">Current score</span>
        {prev != null && (
          <span className={trend >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% trend
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-full" preserveAspectRatio="xMidYMid meet">
        <path d={pathD} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <circle key={d.date} cx={xScale(i)} cy={yScale(d.recoveryScore)} r="3" fill="#22d3ee" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-gray-500">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
