import type { Player, GameState, Street, ActionType, HandAction, GameMode, CardCode } from './types';
import { createDeck, shuffle, deal } from './deck';
import { evaluateHand, compareHands, getHandName } from './hand-evaluator';

interface GameConfig {
  bigBlind: number;
  startingChips: number;
  maxSeats: number;
  mode: GameMode;
  turnTimeLimit: number;
}

export function createInitialGameState(config: GameConfig): GameState {
  return {
    phase: 'waiting',
    mode: config.mode,
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentPlayerIndex: 0,
    dealerIndex: 0,
    cucuruchoIndex: config.maxSeats - 1,
    cucuruchoActive: false,
    cucuruchoPotSnapshot: 0,
    street: 'preflop',
    minRaise: config.bigBlind * 2,
    currentBet: 0,
    bigBlind: config.bigBlind,
    smallBlind: config.bigBlind / 2,
    startingChips: config.startingChips,
    actionHistory: [],
    lastResult: null,
    handNumber: 0,
    turnTimeLimit: config.turnTimeLimit,
    turnStartedAt: 0,
  };
}

export function getSeatedPlayers(players: Player[]): Player[] {
  return players.filter(p => p.seatIndex !== null && p.status !== 'spectating' && p.status !== 'sitting-out' && p.isConnected);
}

export function getActivePlayers(players: Player[]): Player[] {
  return players.filter(p => p.status === 'active' || p.status === 'allin');
}

export function getPlayersStillIn(players: Player[]): Player[] {
  return players.filter(p => p.status === 'active' || p.status === 'allin');
}

export function canCheck(player: Player, currentBet: number): boolean {
  return player.bet >= currentBet;
}

export function getCallAmount(player: Player, currentBet: number): number {
  return Math.min(currentBet - player.bet, player.chips);
}

export function dealHoleCards(players: Player[], deck: CardCode[]): { players: Player[]; deck: CardCode[] } {
  let remaining = deck;
  const updated = players.map(p => {
    if (p.seatIndex !== null && p.status === 'active') {
      const [cards, rest] = deal(remaining, 2);
      remaining = rest;
      return { ...p, holeCards: cards };
    }
    return p;
  });
  return { players: updated, deck: remaining };
}

export function dealCommunityCards(count: number, community: CardCode[], deck: CardCode[]): { community: CardCode[]; deck: CardCode[] } {
  const [cards, remaining] = deal(deck, count);
  return { community: [...community, ...cards], deck: remaining };
}

export function collectBetsIntoPot(players: Player[], pot: number): { players: Player[]; pot: number } {
  const collected = players.reduce((sum, p) => sum + p.bet, 0);
  const reset = players.map(p => ({ ...p, bet: 0 }));
  return { players: reset, pot: pot + collected };
}

export function postBlinds(players: Player[], sbIndex: number, bbIndex: number, sb: number, bb: number): Player[] {
  return players.map((p, i) => {
    if (i === sbIndex) {
      const amount = Math.min(sb, p.chips);
      return { ...p, chips: p.chips - amount, bet: amount, totalBet: amount, isSB: true, status: (amount >= p.chips ? 'allin' : p.status) as Player['status'] };
    }
    if (i === bbIndex) {
      const amount = Math.min(bb, p.chips);
      return { ...p, chips: p.chips - amount, bet: amount, totalBet: amount, isBB: true, status: (amount >= p.chips ? 'allin' : p.status) as Player['status'] };
    }
    return p;
  });
}

export function determineWinners(players: Player[], communityCards: CardCode[]): {
  winnerId: string; winnerNickname: string; potWon: number;
  handName: string; handCards: CardCode[];
  allHands: { playerId: string; nickname: string; cards: CardCode[]; handName: string }[];
} {
  const contestants = getPlayersStillIn(players);
  const evaluated = contestants.map(p => ({
    player: p,
    evaluated: evaluateHand([...p.holeCards, ...communityCards]),
  }));

  const allHands = evaluated.map(e => ({
    playerId: e.player.id,
    nickname: e.player.nickname,
    cards: e.player.holeCards,
    handName: getHandName(e.evaluated.name),
  }));

  const winners = compareHands(evaluated.map(e => e.evaluated));
  const winnerEntry = evaluated.find(e => winners.includes(e.evaluated))!;

  return {
    winnerId: winnerEntry.player.id,
    winnerNickname: winnerEntry.player.nickname,
    potWon: 0,
    handName: getHandName(winnerEntry.evaluated.name),
    handCards: winnerEntry.player.holeCards,
    allHands,
  };
}

export function getNextActiveIndex(players: Player[], currentIndex: number): number {
  const len = players.length;
  for (let i = 1; i <= len; i++) {
    const idx = (currentIndex + i) % len;
    if (players[idx].status === 'active') return idx;
  }
  return -1;
}

export function getNextPlayerIndex(players: Player[], fromIndex: number): number {
  return getNextActiveIndex(players, fromIndex);
}
