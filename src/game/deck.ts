import type { CardCode, Rank, Suit } from './types';

const RANKS: Rank[] = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS: Suit[] = ['c','d','h','s'];

export function createDeck(): CardCode[] {
  const cards: CardCode[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      cards.push(`${rank}${suit}`);
    }
  }
  return cards;
}

export function shuffle(deck: CardCode[]): CardCode[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function deal(deck: CardCode[], count: number): [CardCode[], CardCode[]] {
  return [deck.slice(0, count), deck.slice(count)];
}

export function rankToDisplay(rank: string): string {
  return rank === 'T' ? '10' : rank;
}

export function suitToSymbol(suit: string): string {
  return { c: '♣', d: '♦', h: '♥', s: '♠' }[suit] ?? suit;
}

export function parseCard(code: CardCode): { rank: string; suit: string; display: string; symbol: string } {
  const rank = code.slice(0, -1);
  const suit = code.slice(-1);
  return { rank, suit, display: rankToDisplay(rank), symbol: suitToSymbol(suit) };
}
