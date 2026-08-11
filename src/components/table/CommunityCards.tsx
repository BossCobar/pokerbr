'use client';
import { Card } from '@/components/cards/Card';
import type { CardCode } from '@/game/types';

export function CommunityCards({ cards }: { cards: CardCode[] }) {
  return (
    <div className="flex gap-2 items-center justify-center">
      {cards.map((c, i) => (
        <Card key={c} card={c} delay={i * 0.1} size="md" />
      ))}
    </div>
  );
}
