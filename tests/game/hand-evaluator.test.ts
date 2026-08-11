import { describe, it, expect } from 'vitest';
import { evaluateHand, compareHands, getHandName } from '@/game/hand-evaluator';

describe('hand-evaluator', () => {
  it('identifies royal flush', () => {
    const hand = evaluateHand(['As','Ks','Qs','Js','Ts']);
    expect(hand.name).toBe('Royal Flush');
  });

  it('identifies two pair', () => {
    const hand = evaluateHand(['As','Ah','Ks','Kh','2c','3d','4s']);
    expect(hand.name).toBe('Two Pair');
  });

  it('royal flush beats two pair', () => {
    const rf = evaluateHand(['As','Ks','Qs','Js','Ts']);
    const tp = evaluateHand(['As','Ah','Ks','Kh','2c']);
    const winners = compareHands([rf, tp]);
    expect(winners[0]).toBe(rf);
  });

  it('getHandName returns Portuguese for known hands', () => {
    expect(getHandName('Royal Flush')).toBe('Royal Flush');
    expect(getHandName('Two Pair')).toBe('Dois Pares');
  });
});
