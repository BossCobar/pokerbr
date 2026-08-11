import { describe, it, expect } from 'vitest';
import { createInitialGameState, getActivePlayers, getNextPlayerIndex, canCheck, getCallAmount } from '@/game/holdem';
import type { Player } from '@/game/types';

function makePlayer(id: string, chips: number, seatIndex: number): Player {
  return {
    id, nickname: id, seatIndex, chips, status: 'active',
    bet: 0, totalBet: 0, holeCards: [], isDealer: false, isSB: false, isBB: false,
    isConnected: true,
    stats: { handsPlayed: 0, handsWon: 0, biggestPot: 0, totalWinnings: 0, vpipHands: 0 },
  };
}

describe('holdem engine', () => {
  it('createInitialGameState sets correct blinds', () => {
    const state = createInitialGameState({ bigBlind: 20, startingChips: 1000, maxSeats: 9, mode: 'holdem', turnTimeLimit: 30 });
    expect(state.bigBlind).toBe(20);
    expect(state.smallBlind).toBe(10);
    expect(state.phase).toBe('waiting');
  });

  it('getActivePlayers excludes folded/sitting-out', () => {
    const players: Player[] = [
      { ...makePlayer('a', 100, 0), status: 'active' },
      { ...makePlayer('b', 100, 1), status: 'folded' },
      { ...makePlayer('c', 100, 2), status: 'active' },
    ];
    expect(getActivePlayers(players)).toHaveLength(2);
  });

  it('canCheck is true when no one has bet', () => {
    const p = makePlayer('a', 100, 0);
    expect(canCheck(p, 0)).toBe(true);
  });

  it('canCheck is false when someone has bet more', () => {
    const p = { ...makePlayer('a', 100, 0), bet: 5 };
    expect(canCheck(p, 20)).toBe(false);
  });

  it('getCallAmount returns difference between current bet and player bet', () => {
    const p = { ...makePlayer('a', 100, 0), bet: 10 };
    expect(getCallAmount(p, 30)).toBe(20);
  });

  it('getCallAmount is capped at player chips', () => {
    const p = { ...makePlayer('a', 15, 0), bet: 10 };
    expect(getCallAmount(p, 100)).toBe(15);
  });
});
