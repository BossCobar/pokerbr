import { describe, it, expect } from 'vitest';
import { createDeck, shuffle, deal } from '@/game/deck';

describe('deck', () => {
  it('creates 52 unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck).size).toBe(52);
  });

  it('shuffle changes order (very likely)', () => {
    const a = createDeck();
    const b = shuffle([...a]);
    expect(a).not.toEqual(b);
  });

  it('deal removes cards from deck', () => {
    const deck = createDeck();
    const [cards, remaining] = deal(deck, 5);
    expect(cards).toHaveLength(5);
    expect(remaining).toHaveLength(47);
  });
});
