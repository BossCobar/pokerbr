'use client';
import { useMemo } from 'react';
import { evaluateHand, getHandName } from '@/game/hand-evaluator';
import type { CardCode } from '@/game/types';

interface Props {
  holeCards: CardCode[];
  communityCards: CardCode[];
}

// Hand rank percentile (approximate — higher = rarer/better)
const handRank: Record<string, number> = {
  'Carta Alta':  8,
  'Par':         30,
  'Dois Pares':  50,
  'Trinca':      62,
  'Sequência':   72,
  'Flush':       80,
  'Full House':  88,
  'Quadra':      94,
  'Straight Flush': 98,
  'Royal Flush': 100,
};

const handColor: Record<string, string> = {
  'Royal Flush':    '#a78bfa',
  'Straight Flush': '#c084fc',
  'Quadra':         '#facc15',
  'Full House':     '#fb923c',
  'Flush':          '#60a5fa',
  'Sequência':      '#34d399',
  'Trinca':         '#67e8f9',
  'Dois Pares':     '#e2e8f0',
  'Par':            '#9ca3af',
  'Carta Alta':     '#6b7280',
};

const handIcon: Record<string, string> = {
  'Royal Flush':    '👑',
  'Straight Flush': '🌟',
  'Quadra':         '🎰',
  'Full House':     '🏠',
  'Flush':          '♠',
  'Sequência':      '📈',
  'Trinca':         '3️⃣',
  'Dois Pares':     '2️⃣',
  'Par':            '🤝',
  'Carta Alta':     '🃏',
};

export function HandStrength({ holeCards, communityCards }: Props) {
  const handName = useMemo(() => {
    if (holeCards.length < 2) return null;
    try {
      const result = evaluateHand([...holeCards, ...communityCards]);
      return getHandName(result.name);
    } catch {
      return null;
    }
  }, [holeCards, communityCards]);

  if (!handName) return null;

  const pct = handRank[handName] ?? 10;
  const color = handColor[handName] ?? '#9ca3af';
  const icon = handIcon[handName] ?? '🃏';

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{icon}</span>
          <span className="font-black text-sm" style={{ color }}>{handName}</span>
        </div>
        <span className="text-gray-500 text-[10px] font-medium">top {100 - pct}%</span>
      </div>
      {/* Strength bar */}
      <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}80` }}
        />
      </div>
    </div>
  );
}
