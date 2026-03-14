import { type CSSProperties } from 'react';

interface SkeletonProps {
  w?: string | number;
  h?: number;
  r?: number;
  className?: string;
}

export function Skeleton({ w = '100%', h = 12, r = 6, className = '' }: SkeletonProps) {
  const style: CSSProperties = {
    width: typeof w === 'number' ? w : w,
    height: h,
    borderRadius: r,
    background:
      'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  };
  return <div className={className} style={style} aria-hidden />;
}

export function SkeletonCard() {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        background: '#0b0f1a',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-3">
        <Skeleton w={40} h={40} r={20} />
        <div className="flex-1 space-y-2">
          <Skeleton w="70%" h={14} r={4} />
          <Skeleton w="50%" h={12} r={4} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{ background: '#0b0f1a', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="flex border-b px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} w={`${100 / cols}%`} h={12} r={4} className="mx-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex px-4 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton key={colIdx} w={`${100 / cols}%`} h={10} r={4} className="mx-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonKPI({ count = 6 }: { count?: number } = {}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border p-4"
          style={{
            background: '#0b0f1a',
            borderColor: 'rgba(255,255,255,0.06)',
            animationDelay: `calc(${i} * 60ms)`,
          }}
        >
          <Skeleton w="40%" h={10} r={4} className="mb-2" />
          <Skeleton w="60%" h={28} r={6} />
        </div>
      ))}
    </div>
  );
}
