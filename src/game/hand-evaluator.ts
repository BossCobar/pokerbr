import { Hand } from 'pokersolver';
import type { CardCode } from './types';

export interface EvaluatedHand {
  hand: ReturnType<typeof Hand.solve>;
  name: string;
  cards: CardCode[];
}

const PT_HAND_NAMES: Record<string, string> = {
  'Royal Flush': 'Royal Flush',
  'Straight Flush': 'Straight Flush',
  'Four of a Kind': 'Quadra',
  'Full House': 'Full House',
  'Flush': 'Flush',
  'Straight': 'Sequência',
  'Three of a Kind': 'Trinca',
  'Two Pair': 'Dois Pares',
  'Pair': 'Par',
  'High Card': 'Carta Alta',
};

export function evaluateHand(cards: CardCode[]): EvaluatedHand {
  const hand = Hand.solve(cards);
  // pokersolver returns name='Straight Flush' + descr='Royal Flush' for royal flush
  const name: string = (hand.descr === 'Royal Flush') ? 'Royal Flush' : hand.name;
  return { hand, name, cards };
}

export function compareHands(hands: EvaluatedHand[]): EvaluatedHand[] {
  const solved = hands.map(h => h.hand);
  const winnersSolved = Hand.winners(solved);
  return hands.filter(h => winnersSolved.includes(h.hand));
}

export function getHandName(englishName: string): string {
  return PT_HAND_NAMES[englishName] ?? englishName;
}
