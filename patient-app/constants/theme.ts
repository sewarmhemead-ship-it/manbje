import { Platform } from 'react-native';

export const C = {
  bg: '#06080e',
  s1: '#0b0f1a',
  s2: '#101622',
  s3: '#161e2e',
  border: 'rgba(255,255,255,0.06)',
  cyan: '#22d3ee',
  green: '#34d399',
  amber: '#fbbf24',
  red: '#f87171',
  purple: '#a78bfa',
  text: '#dde6f5',
  muted: '#4b5875',
} as const;

export const radius = {
  card: 16,
  button: 12,
  badge: 20,
  small: 8,
} as const;

export const fontMono = Platform.select({
  ios: 'Courier New',
  android: 'monospace',
}) as string;
