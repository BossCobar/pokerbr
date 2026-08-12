'use client';
import { useMemo } from 'react';
import { evaluateHand, getHandName } from '@/game/hand-evaluator';
import type { CardCode } from '@/game/types';

interface Props {
  holeCards: CardCode[];
  communityCards: CardCode[];
}

const handStrengthColor: Record<string, string> = {
  'Royal Flush': 'text-purple-400',
  'Straight Flush': 'text-purple-300',
  'Quadra': 'text-yellow-400',
  'Full House': 'text-orange-400',
  'Flush': 'text-blue-400',
  'Sequência': 'text-green-400',
  'Trinca': 'text-blue-300',
  'Dois Pares': 'text-gray-200',
  'Par': 'text-gray-300',
  'Carta Alta': 'text-gray-400',
};

export function HandStrength({ holeCards, communityCards }: Props) {
  const handName = useMemo(() => {
    if (holeCards.length < 2) return null;
    try {
      const all = [...holeCards, ...communityCards];
      if (all.length < 2) return null;
      const result = evaluateHand(all);
      return getHandName(result.name);
    } catch {
      return null;
    }
  }, [holeCards, communityCards]);

  if (!handName) return null;

  const color = handStrengthColor[handName] ?? 'text-gray-300';

  return (
    <div className="flex items-center gap-2 bg-black/60 border border-[#c8a84b]/30 rounded-lg px-3 py-1.5 animate-fade-in">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Sua mão:</span>
      <span className={`font-bold text-sm ${color}`}>
        {handName}
      </span>
    </div>
  );
}
