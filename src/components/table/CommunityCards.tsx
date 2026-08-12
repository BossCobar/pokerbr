'use client';
import { Card } from '@/components/cards/Card';
import type { CardCode } from '@/game/types';

const streetLabel: Record<string, string> = {
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Showdown',
};

interface Props {
  cards: CardCode[];
  street?: string;
}

export function CommunityCards({ cards, street }: Props) {
  return (
    <div className="flex flex-col items-center gap-1">
      {street && streetLabel[street] && (
        <div className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
          {streetLabel[street]}
        </div>
      )}
      <div className="flex gap-1.5 sm:gap-2 items-center justify-center">
        {cards.map((c, i) => (
          <Card key={c} card={c} delay={i * 0.1} size="md" />
        ))}
      </div>
    </div>
  );
}
