'use client';
import { useTimer } from '@/lib/hooks/useTimer';

interface Props { startedAt: number; limitSeconds: number; }

export function ActionTimer({ startedAt, limitSeconds }: Props) {
  const remaining = useTimer(startedAt, limitSeconds);
  const pct = (remaining / limitSeconds) * 100;
  const color = pct > 50 ? '#22c55e' : pct > 25 ? '#eab308' : '#ef4444';

  return (
    <div className="w-full h-1.5 rounded-full bg-gray-700 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-200"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}
