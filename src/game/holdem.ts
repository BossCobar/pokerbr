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
  return players.filter(p =>
    p.seatIndex !== null &&
    p.status !== 'spectating' &&
    p.status !== 'sitting-out' &&
    p.isConnected,
  );
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

// ADD to existing bet/totalBet (not overwrite) so antes survive into blind posting
export function postBlinds(players: Player[], sbIndex: number, bbIndex: number, sb: number, bb: number): Player[] {
  return players.map((p, i) => {
    if (i === sbIndex) {
      const amount = Math.min(sb, p.chips);
      const newChips = p.chips - amount;
      return {
        ...p,
        chips: newChips,
        bet: p.bet + amount,
        totalBet: p.totalBet + amount,
        isSB: true,
        status: (newChips <= 0 ? 'allin' : p.status) as Player['status'],
      };
    }
    if (i === bbIndex) {
      const amount = Math.min(bb, p.chips);
      const newChips = p.chips - amount;
      return {
        ...p,
        chips: newChips,
        bet: p.bet + amount,
        totalBet: p.totalBet + amount,
        isBB: true,
        status: (newChips <= 0 ? 'allin' : p.status) as Player['status'],
      };
    }
    return p;
  });
}

/**
 * Compute side pots from totalBet contributions.
 * Players who folded contribute chips but are not eligible to win.
 * Returns ordered list from main pot → side pots.
 */
export function buildSidePots(players: Player[]): { amount: number; eligiblePlayerIds: string[] }[] {
  const contributors = players
    .filter(p => p.totalBet > 0)
    .map(p => ({
      id: p.id,
      totalBet: p.totalBet,
      canWin: p.status !== 'folded' && p.status !== 'spectating' && p.status !== 'sitting-out',
    }))
    .sort((a, b) => a.totalBet - b.totalBet);

  if (contributors.length === 0) return [];

  const pots: { amount: number; eligiblePlayerIds: string[] }[] = [];
  let prev = 0;

  while (contributors.length > 0) {
    const level = contributors[0].totalBet;
    const amtPerPlayer = level - prev;
    const potAmount = amtPerPlayer * contributors.length;
    const eligible = contributors.filter(c => c.canWin).map(c => c.id);

    if (potAmount > 0 && eligible.length > 0) {
      pots.push({ amount: potAmount, eligiblePlayerIds: eligible });
    }

    prev = level;
    while (contributors.length > 0 && contributors[0].totalBet === level) {
      contributors.shift();
    }
  }

  return pots;
}

export interface ShowdownResult {
  winnerIds: string[];
  winnerNickname: string;
  handName: string;
  handCards: CardCode[];
  allHands: { playerId: string; nickname: string; cards: CardCode[]; handName: string }[];
}

/**
 * Determine winner(s) among a specific group of players.
 * Returns multiple winners when hands are tied.
 */
export function determineWinnersForGroup(players: Player[], communityCards: CardCode[]): ShowdownResult {
  const contestants = players.filter(p => p.status === 'active' || p.status === 'allin');

  if (contestants.length === 0) {
    return { winnerIds: [], winnerNickname: '', handName: '', handCards: [], allHands: [] };
  }
  if (contestants.length === 1) {
    const p = contestants[0];
    return { winnerIds: [p.id], winnerNickname: p.nickname, handName: '', handCards: p.holeCards, allHands: [] };
  }

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
  const winnerEntries = evaluated.filter(e => winners.includes(e.evaluated));
  const primary = winnerEntries[0];

  return {
    winnerIds: winnerEntries.map(e => e.player.id),
    winnerNickname: winnerEntries.map(e => e.player.nickname).join(' & '),
    handName: getHandName(primary.evaluated.name),
    handCards: primary.player.holeCards,
    allHands,
  };
}

// Legacy single-winner interface (kept for HandResult type compatibility)
export function determineWinners(players: Player[], communityCards: CardCode[]): {
  winnerId: string; winnerNickname: string; potWon: number;
  handName: string; handCards: CardCode[];
  allHands: { playerId: string; nickname: string; cards: CardCode[]; handName: string }[];
} {
  const result = determineWinnersForGroup(players, communityCards);
  return {
    winnerId: result.winnerIds[0] ?? '',
    winnerNickname: result.winnerNickname,
    potWon: 0,
    handName: result.handName,
    handCards: result.handCards,
    allHands: result.allHands,
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
