'use client';
import { useEffect, useState } from 'react';

export function useTimer(startedAt: number, limitSeconds: number): number {
  const [remaining, setRemaining] = useState(limitSeconds);

  useEffect(() => {
    if (!startedAt || !limitSeconds) return;
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setRemaining(Math.max(0, limitSeconds - elapsed));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [startedAt, limitSeconds]);

  return remaining;
}
