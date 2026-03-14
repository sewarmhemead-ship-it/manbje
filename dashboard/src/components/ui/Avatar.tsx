const AVATAR_COLORS = [
  { bg: 'rgba(34,211,238,0.15)', color: '#22d3ee' },
  { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
  { bg: 'rgba(52,211,153,0.15)', color: '#34d399' },
  { bg: 'rgba(244,114,182,0.15)', color: '#f472b6' },
  { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
];

export function getAvatarColor(name: string) {
  const i = (name || '?').charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export function Avatar({ name, size = 32, className = '' }: AvatarProps) {
  const { bg, color } = getAvatarColor(name || '?');
  const initials = (name || '?').trim().slice(0, 2) || '?';
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        color,
        fontSize: size * 0.35,
      }}
    >
      {initials}
    </div>
  );
}
