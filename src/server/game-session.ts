import { EventEmitter } from 'events';
import type { RoomState, RoomConfig, Player, GameState, GameMode, ActionType, ChatMessage } from '@/game/types';
import {
  createInitialGameState, getSeatedPlayers, postBlinds,
  dealHoleCards, dealCommunityCards, collectBetsIntoPot,
  determineWinners, getNextActiveIndex, getCallAmount,
} from '@/game/holdem';
import { createDeck, shuffle } from '@/game/deck';
import {
  isCucuruchoHand, applyCucuruchoAntes,
  advanceCucuruchoButton, getCucuruchoPayInAmount,
} from '@/game/cucurucho';

export class GameSession extends EventEmitter {
  code: string;
  hostId: string;
  players: Player[] = [];
  game: GameState;
  chatMessages: ChatMessage[] = [];
  maxSeats: number;
  config: RoomConfig;
  private deck: string[] = [];
  private currentBet = 0;
  private lastRaiseSize = 0;
  private turnTimer: ReturnType<typeof setTimeout> | null = null;
  // Tracks which active players have voluntarily acted this betting round.
  // Reset on each new street and when a raise reopens betting.
  private playersActedThisRound = new Set<string>();

  constructor(code: string, hostId: string, config: {
    bigBlind: number; startingChips: number; maxSeats: number;
    mode: GameMode; turnTimeLimit: number;
    cucuruchoAnteMultiplier?: number; allowRebuy?: boolean; rebuyAmount?: number;
  }) {
    super();
    this.code = code;
    this.hostId = hostId;
    this.maxSeats = config.maxSeats;
    this.config = {
      bigBlind: config.bigBlind,
      smallBlind: config.bigBlind / 2,
      startingChips: config.startingChips,
      maxSeats: config.maxSeats,
      mode: config.mode,
      turnTimeLimit: config.turnTimeLimit,
      cucuruchoAnteMultiplier: config.cucuruchoAnteMultiplier ?? 10,
      allowRebuy: config.allowRebuy ?? false,
      rebuyAmount: config.rebuyAmount ?? config.startingChips,
    };
    this.game = createInitialGameState(config);
  }

  getRoomState(): RoomState {
    const revealCards = this.game.phase === 'result' || this.game.phase === 'showdown';
    return {
      code: this.code,
      hostId: this.hostId,
      players: this.players.map(p => ({
        ...p,
        // Reveal all hole cards at showdown/result so players can see opponents' hands
        holeCards: revealCards ? p.holeCards : [],
      })),
      game: this.game,
      chatMessages: this.chatMessages,
      maxSeats: this.maxSeats,
      config: {
        bigBlind: this.game.bigBlind,
        smallBlind: this.game.smallBlind,
        startingChips: this.game.startingChips,
        maxSeats: this.maxSeats,
        mode: this.game.mode,
        turnTimeLimit: this.game.turnTimeLimit,
        cucuruchoAnteMultiplier: this.config.cucuruchoAnteMultiplier,
        allowRebuy: this.config.allowRebuy,
        rebuyAmount: this.config.rebuyAmount,
      },
    };
  }

  getPlayerCards(playerId: string): string[] {
    return this.players.find(p => p.id === playerId)?.holeCards ?? [];
  }

  hasPlayer(playerId: string): boolean {
    return this.players.some(p => p.id === playerId);
  }

  addPlayer(id: string, nickname: string, asSpectator: boolean): Player {
    const existing = this.players.find(p => p.id === id);
    if (existing) return existing;
    const player: Player = {
      id, nickname,
      seatIndex: null,
      chips: this.game.startingChips,
      status: asSpectator ? 'spectating' : 'waiting',
      bet: 0, totalBet: 0, holeCards: [],
      isDealer: false, isSB: false, isBB: false,
      isConnected: true,
      stats: { handsPlayed: 0, handsWon: 0, biggestPot: 0, totalWinnings: 0, vpipHands: 0 },
    };
    this.players.push(player);
    return player;
  }

  sitDown(playerId: string, seatIndex: number): boolean {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;
    const taken = this.players.some(p => p.seatIndex === seatIndex);
    if (taken || seatIndex >= this.maxSeats) return false;
    player.seatIndex = seatIndex;
    player.status = 'waiting';
    return true;
  }

  leaveSeat(playerId: string): void {
    const player = this.players.find(p => p.id === playerId);
    if (player) { player.seatIndex = null; player.status = 'spectating'; }
  }

  removePlayer(playerId: string): void {
    if (this.game.phase !== 'waiting' && this.game.phase !== 'result') {
      const player = this.players.find(p => p.id === playerId);
      if (!player) return;

      // Snapshot seated array BEFORE removing this player (indices still valid)
      const seatedBefore = getSeatedPlayers(this.players);
      const disconnectedIdx = seatedBefore.findIndex(p => p.id === playerId);
      const wasCurrentTurn = disconnectedIdx !== -1 && disconnectedIdx === this.game.currentPlayerIndex;

      player.isConnected = false;
      player.status = 'folded';
      this.playersActedThisRound.add(playerId);

      if (wasCurrentTurn) {
        this.clearTurnTimer();
        const seatedNow = getSeatedPlayers(this.players);
        const stillIn = seatedNow.filter(p => p.status === 'active' || p.status === 'allin');

        if (stillIn.length <= 1) {
          this.resolveSingleWinner();
          return;
        }

        const active = seatedNow.filter(p => p.status === 'active');
        const allCalled = active.every(p => p.bet >= this.currentBet || p.chips === 0);
        const allActed = active.every(p => this.playersActedThisRound.has(p.id));

        if (active.length === 0 || (allCalled && allActed)) {
          this.advanceStreet(seatedNow);
          return;
        }

        // Find next active player from disconnected player's old position
        const startIdx = disconnectedIdx % Math.max(seatedNow.length, 1);
        let nextIdx = -1;
        for (let i = 0; i < seatedNow.length; i++) {
          const candidate = (startIdx + i) % seatedNow.length;
          if (seatedNow[candidate].status === 'active') { nextIdx = candidate; break; }
        }
        if (nextIdx !== -1) this.game.currentPlayerIndex = nextIdx;
        this.game.turnStartedAt = Date.now();
        this.emit('state-updated');
        this.startTurnTimer();
        return;
      }

      // Not their turn — fix index if disconnected player was before current in seated array
      if (disconnectedIdx !== -1 && disconnectedIdx < this.game.currentPlayerIndex) {
        this.game.currentPlayerIndex = Math.max(0, this.game.currentPlayerIndex - 1);
      }
    } else {
      this.players = this.players.filter(p => p.id !== playerId);
    }
  }

  addChatMessage(playerId: string, text: string): ChatMessage {
    const player = this.players.find(p => p.id === playerId);
    const msg: ChatMessage = {
      id: Date.now().toString(),
      playerId,
      nickname: player?.nickname ?? 'Anon',
      text: text.slice(0, 200),
      timestamp: Date.now(),
    };
    this.chatMessages = [...this.chatMessages.slice(-99), msg];
    return msg;
  }

  canStart(): boolean {
    const seated = getSeatedPlayers(this.players);
    return seated.length >= 2 && (this.game.phase === 'waiting' || this.game.phase === 'result');
  }

  startHand(): void {
    if (!this.canStart()) return;

    this.game = {
      ...this.game,
      phase: 'preflop',
      handNumber: this.game.handNumber + 1,
      communityCards: [],
      pot: 0,
      sidePots: [],
      actionHistory: [],
      lastResult: null,
      cucuruchoActive: false,
      currentBet: 0,
    };

    this.players = this.players.map(p => ({
      ...p,
      bet: 0, totalBet: 0, holeCards: [],
      isDealer: false, isSB: false, isBB: false,
      lastAction: undefined,
      status: (p.seatIndex !== null && p.isConnected && p.chips > 0 ? 'active' : p.status) as Player['status'],
    }));

    const seated = getSeatedPlayers(this.players);
    if (seated.length < 2) return;

    const dealerIdx = this.game.dealerIndex % seated.length;

    // Heads-up: dealer = SB (standard poker rules)
    let sbIdx: number;
    let bbIdx: number;
    if (seated.length === 2) {
      sbIdx = dealerIdx;
      bbIdx = (dealerIdx + 1) % 2;
    } else {
      sbIdx = (dealerIdx + 1) % seated.length;
      bbIdx = (dealerIdx + 2) % seated.length;
    }

    // Preflop: for heads-up, dealer/SB acts first. For 3+, UTG (left of BB) acts first.
    const utg = seated.length === 2 ? dealerIdx : (bbIdx + 1) % seated.length;

    seated[dealerIdx].isDealer = true;

    // Cucurucho check
    if (isCucuruchoHand(this.game)) {
      const anteAmount = this.game.bigBlind * this.config.cucuruchoAnteMultiplier;
      const { players: withAntes, totalAnte } = applyCucuruchoAntes(seated, anteAmount);
      withAntes.forEach(p => { const orig = this.players.find(o => o.id === p.id); if (orig) Object.assign(orig, p); });
      this.game.pot += totalAnte;
      this.game.cucuruchoActive = true;
    }

    // Post blinds
    const withBlinds = postBlinds(seated, sbIdx, bbIdx, this.game.smallBlind, this.game.bigBlind);
    withBlinds.forEach(p => { const orig = this.players.find(o => o.id === p.id); if (orig) Object.assign(orig, p); });

    this.currentBet = this.game.bigBlind;
    this.game.currentBet = this.currentBet;
    this.lastRaiseSize = this.game.bigBlind;

    // Deal hole cards
    this.deck = shuffle(createDeck());
    const { players: withCards, deck } = dealHoleCards(this.players, this.deck);
    this.players = withCards;
    this.deck = deck;

    this.game.currentPlayerIndex = utg;
    this.game.dealerIndex = dealerIdx;
    this.game.street = 'preflop';
    this.game.phase = 'preflop';
    this.game.turnStartedAt = Date.now();
    this.game.minRaise = this.game.bigBlind * 2;

    // Nobody has voluntarily acted yet (blind posts don't count)
    this.playersActedThisRound = new Set();

    this.emit('state-updated');
    this.startTurnTimer();
  }

  handleAction(playerId: string, type: ActionType, amount?: number): void {
    const seated = getSeatedPlayers(this.players);
    const currentPlayer = seated[this.game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return;
    if (currentPlayer.status !== 'active') return;

    this.clearTurnTimer();

    if (type === 'fold') {
      currentPlayer.status = 'folded';
      currentPlayer.lastAction = 'Fold';
      this.playersActedThisRound.add(playerId);
    } else if (type === 'check') {
      currentPlayer.lastAction = 'Check';
      this.playersActedThisRound.add(playerId);
    } else if (type === 'call') {
      const callAmt = getCallAmount(currentPlayer, this.currentBet);
      currentPlayer.chips -= callAmt;
      currentPlayer.bet += callAmt;
      currentPlayer.totalBet += callAmt;
      if (currentPlayer.chips === 0) currentPlayer.status = 'allin';
      currentPlayer.lastAction = `Call ${callAmt}`;
      currentPlayer.stats.vpipHands++;
      this.playersActedThisRound.add(playerId);
    } else if (type === 'raise') {
      const raiseTotal = amount ?? this.currentBet + this.lastRaiseSize;
      const diff = raiseTotal - currentPlayer.bet;
      const actual = Math.min(diff, currentPlayer.chips);
      currentPlayer.chips -= actual;
      currentPlayer.bet += actual;
      currentPlayer.totalBet += actual;
      if (currentPlayer.chips === 0) currentPlayer.status = 'allin';
      const prevBet = this.currentBet;
      this.currentBet = currentPlayer.bet;
      this.game.currentBet = this.currentBet;
      this.lastRaiseSize = Math.max(this.currentBet - prevBet, this.game.bigBlind);
      this.game.minRaise = this.currentBet + this.lastRaiseSize;
      currentPlayer.lastAction = `Raise ${currentPlayer.bet}`;
      currentPlayer.stats.vpipHands++;
      // Raise reopens betting: everyone else must act again
      this.playersActedThisRound = new Set([playerId]);
    } else if (type === 'allin') {
      const allInAmt = currentPlayer.chips;
      currentPlayer.bet += allInAmt;
      currentPlayer.totalBet += allInAmt;
      currentPlayer.chips = 0;
      currentPlayer.status = 'allin';
      currentPlayer.lastAction = 'All-in';
      if (currentPlayer.bet > this.currentBet) {
        const prevBet = this.currentBet;
        this.currentBet = currentPlayer.bet;
        this.game.currentBet = this.currentBet;
        this.lastRaiseSize = Math.max(this.currentBet - prevBet, this.game.bigBlind);
        this.game.minRaise = this.currentBet + this.lastRaiseSize;
        // All-in raise reopens betting
        this.playersActedThisRound = new Set([playerId]);
      } else {
        this.playersActedThisRound.add(playerId);
      }
    }

    this.game.actionHistory.push({
      playerId, nickname: currentPlayer.nickname, action: type,
      amount: amount ?? 0, street: this.game.street,
    });

    const active = seated.filter(p => p.status === 'active');
    const stillIn = seated.filter(p => p.status === 'active' || p.status === 'allin');

    // Hand over if only one player remains
    if (stillIn.length <= 1) {
      this.resolveSingleWinner();
      return;
    }

    // Betting round complete when all active players matched the bet AND all acted
    const allCalled = active.every(p => p.bet >= this.currentBet || p.chips === 0);
    const allActed = active.every(p => this.playersActedThisRound.has(p.id));

    if (allCalled && allActed) {
      this.advanceStreet(seated);
      return;
    }

    // Find next active player
    const nextIdx = getNextActiveIndex(seated, this.game.currentPlayerIndex);
    if (nextIdx === -1) {
      // All remaining are all-in — advance without more betting
      this.advanceStreet(seated);
      return;
    }

    this.game.currentPlayerIndex = nextIdx;
    this.game.turnStartedAt = Date.now();
    this.emit('state-updated');
    this.startTurnTimer();
  }

  private advanceStreet(seated: Player[]): void {
    // Collect all bets into pot (using this.players to catch all)
    const { players: allReset, pot } = collectBetsIntoPot(this.players, this.game.pot);
    this.players = allReset;
    this.game.pot = pot;
    this.currentBet = 0;
    this.game.currentBet = 0;
    this.lastRaiseSize = this.game.bigBlind;
    this.game.minRaise = this.game.bigBlind;
    this.playersActedThisRound = new Set();

    const streets: Record<string, string> = { preflop: 'flop', flop: 'turn', turn: 'river', river: 'showdown' };
    const nextStreet = streets[this.game.street];

    if (nextStreet === 'flop') {
      const { community, deck } = dealCommunityCards(3, [], this.deck);
      this.game.communityCards = community;
      this.deck = deck;
      this.game.street = 'flop';
      this.game.phase = 'flop';

      if (this.game.cucuruchoActive) {
        this.game.cucuruchoPotSnapshot = this.game.pot;
        this.emit('cucurucho-pay-in');
        this.emit('state-updated');
        return;
      }
    } else if (nextStreet === 'turn') {
      const { community, deck } = dealCommunityCards(1, this.game.communityCards, this.deck);
      this.game.communityCards = community;
      this.deck = deck;
      this.game.street = 'turn';
      this.game.phase = 'turn';
    } else if (nextStreet === 'river') {
      const { community, deck } = dealCommunityCards(1, this.game.communityCards, this.deck);
      this.game.communityCards = community;
      this.deck = deck;
      this.game.street = 'river';
      this.game.phase = 'river';
    } else if (nextStreet === 'showdown') {
      this.resolveShowdown();
      return;
    }

    const seatedNow = getSeatedPlayers(this.players);
    const activePlayers = seatedNow.filter(p => p.status === 'active');

    // All remaining players are all-in — run out remaining streets automatically
    if (activePlayers.length === 0) {
      this.emit('state-updated');
      setTimeout(() => this.runOutBoard(), 800);
      return;
    }

    const firstToAct = getNextActiveIndex(seatedNow, this.game.dealerIndex);
    this.game.currentPlayerIndex = firstToAct === -1 ? 0 : firstToAct;
    this.game.turnStartedAt = Date.now();
    this.emit('state-updated');
    this.startTurnTimer();
  }

  private runOutBoard(): void {
    const streetsLeft: Record<string, number> = { preflop: 3, flop: 1, turn: 1, river: 0 };
    const count = streetsLeft[this.game.street];

    if (count === undefined || this.game.street === 'river') {
      this.resolveShowdown();
      return;
    }

    if (count > 0) {
      const { community, deck } = dealCommunityCards(count, this.game.communityCards, this.deck);
      this.game.communityCards = community;
      this.deck = deck;
    }

    const nextStreet: Record<string, string> = { preflop: 'flop', flop: 'turn', turn: 'river' };
    const ns = nextStreet[this.game.street] as typeof this.game.street;
    this.game.street = ns;
    this.game.phase = ns;
    this.emit('state-updated');
    setTimeout(() => this.runOutBoard(), 800);
  }

  handleCucuruchoPayIn(playerId: string, payIn: boolean): void {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;

    if (payIn) {
      const amount = Math.min(getCucuruchoPayInAmount(this.game.cucuruchoPotSnapshot), player.chips);
      player.chips -= amount;
      player.bet += amount;   // tracked as street bet — collected later by collectBetsIntoPot
      player.totalBet += amount;
      if (player.chips === 0) player.status = 'allin';
    } else {
      player.status = 'folded';
    }

    const seated = getSeatedPlayers(this.players);
    const stillDeciding = seated.filter(p =>
      p.status === 'active' && p.bet < this.game.cucuruchoPotSnapshot
    );

    if (stillDeciding.length === 0) {
      // Collect all cucurucho pay-in bets into pot (no double counting)
      const { players: allReset, pot } = collectBetsIntoPot(this.players, this.game.pot);
      this.players = allReset;
      this.game.pot = pot;

      const { community: withTurn, deck: d1 } = dealCommunityCards(1, this.game.communityCards, this.deck);
      const { community: withRiver, deck: d2 } = dealCommunityCards(1, withTurn, d1);
      this.game.communityCards = withRiver;
      this.deck = d2;
      this.resolveShowdown();
    } else {
      this.emit('state-updated');
    }
  }

  private resolveSingleWinner(): void {
    const { players: allReset, pot } = collectBetsIntoPot(this.players, this.game.pot);
    this.players = allReset;
    this.game.pot = pot;

    const seated = getSeatedPlayers(this.players);
    const winner = seated.find(p => p.status === 'active') ?? seated.find(p => p.status === 'allin');
    if (!winner) { this.prepareNextHand(); return; }

    const potWon = this.game.pot;
    const winnerPlayer = this.players.find(p => p.id === winner.id)!;
    winnerPlayer.chips += potWon;
    winnerPlayer.stats.handsWon++;
    winnerPlayer.stats.totalWinnings += potWon;
    if (potWon > winnerPlayer.stats.biggestPot) winnerPlayer.stats.biggestPot = potWon;

    this.game.pot = 0; // distributed — reset so totals balance
    this.game.lastResult = {
      winnerId: winner.id, winnerNickname: winner.nickname,
      potWon, handName: '', handCards: [], allHands: [],
    };
    this.game.phase = 'result';
    this.clearTurnTimer();
    this.emit('state-updated');
    setTimeout(() => this.prepareNextHand(), 6000);
  }

  private resolveShowdown(): void {
    const { players: allReset, pot } = collectBetsIntoPot(this.players, this.game.pot);
    this.players = allReset;
    this.game.pot = pot;

    const result = determineWinners(this.players, this.game.communityCards);
    const potWon = this.game.pot;
    const winner = this.players.find(p => p.id === result.winnerId)!;
    winner.chips += potWon;
    winner.stats.handsWon++;
    winner.stats.totalWinnings += potWon;
    if (potWon > winner.stats.biggestPot) winner.stats.biggestPot = potWon;

    const seated = getSeatedPlayers(this.players);
    seated.forEach(p => { p.stats.handsPlayed++; });

    this.game.pot = 0; // distributed — reset so totals balance
    this.game.lastResult = { ...result, potWon };
    this.game.phase = 'result';
    this.clearTurnTimer();
    this.emit('state-updated');
    setTimeout(() => this.prepareNextHand(), 7000);
  }

  private prepareNextHand(): void {
    const seated = getSeatedPlayers(this.players);
    this.game.dealerIndex = (this.game.dealerIndex + 1) % Math.max(seated.length, 1);
    if (this.game.mode === 'cucurucho') {
      this.game = advanceCucuruchoButton(this.game, this.maxSeats);
    }
    this.players = this.players.map(p => {
      if (p.chips <= 0 && p.seatIndex !== null) {
        if (this.config.allowRebuy) {
          // Rebuy enabled: sit them out so they must manually rebuy
          return { ...p, status: 'sitting-out' as const };
        }
        // No rebuy: auto-restore chips so game continues
        return { ...p, chips: this.game.startingChips, status: 'waiting' as const };
      }
      return p;
    });
    this.game.phase = 'waiting';
    this.emit('state-updated');
    if (this.canStart()) setTimeout(() => this.startHand(), 2000);
  }

  requestRebuy(playerId: string): boolean {
    if (!this.config.allowRebuy) return false;
    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;
    if (player.chips > 0 && player.seatIndex !== null) return false;
    player.chips = this.config.rebuyAmount || this.game.startingChips;
    player.status = 'waiting';
    this.emit('state-updated');
    if (this.canStart()) setTimeout(() => this.startHand(), 2000);
    return true;
  }

  private startTurnTimer(): void {
    if (this.game.turnTimeLimit <= 0) return;
    this.turnTimer = setTimeout(() => {
      const seated = getSeatedPlayers(this.players);
      const current = seated[this.game.currentPlayerIndex];
      if (current) this.handleAction(current.id, 'fold');
    }, this.game.turnTimeLimit * 1000);
  }

  private clearTurnTimer(): void {
    if (this.turnTimer) { clearTimeout(this.turnTimer); this.turnTimer = null; }
  }
}
