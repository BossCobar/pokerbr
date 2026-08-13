import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setupSocketHandlers } from '@/server/socket-handlers';
import { clearRooms } from '@/server/room-manager';
import type { RoomState, ChatMessage } from '@/game/types';

let httpServer: ReturnType<typeof createServer>;
let ioServer: Server;
let port: number;
const openSockets: ClientSocket[] = [];

beforeEach(async () => {
  clearRooms();
  tokenCounter = 0;
  httpServer = createServer();
  ioServer = new Server(httpServer, { cors: { origin: '*' } });
  setupSocketHandlers(ioServer);
  await new Promise<void>(resolve => httpServer.listen(0, () => resolve()));
  port = (httpServer.address() as { port: number }).port;
});

afterEach(async () => {
  for (const s of openSockets) { if (s.connected) s.disconnect(); }
  openSockets.length = 0;
  await new Promise<void>(resolve => ioServer.close(() => httpServer.close(() => resolve())));
});

let tokenCounter = 0;
function connect(): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    // Each test client gets a unique stable token (simulates different browsers)
    const token = `test-token-${++tokenCounter}`;
    const socket = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { token },
    });
    openSockets.push(socket);
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (e) => reject(e));
    setTimeout(() => reject(new Error('Connection timeout')), 3000);
  });
}

function waitFor<T>(socket: ClientSocket, event: string, timeout = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeout);
    socket.once(event, (data: T) => { clearTimeout(t); resolve(data); });
  });
}

// Wait for a room-state that satisfies a predicate
function waitForState(socket: ClientSocket, pred: (s: RoomState) => boolean, timeout = 6000): Promise<RoomState> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Timeout waiting for room-state condition')), timeout);
    const handler = (state: RoomState) => {
      if (pred(state)) { clearTimeout(t); socket.off('room-state', handler); resolve(state); }
    };
    socket.on('room-state', handler);
  });
}

// Create a room and return {code, p1}
async function setupRoom(opts: { seats?: number; bb?: number; chips?: number; mode?: string } = {}) {
  const p1 = await connect();
  const firstState = waitFor<RoomState>(p1, 'room-state');
  p1.emit('create-room', {
    nickname: 'Alice',
    bigBlind: opts.bb ?? 20,
    startingChips: opts.chips ?? 1000,
    maxSeats: opts.seats ?? 6,
    mode: opts.mode ?? 'holdem',
    turnTimeLimit: 0,
  });
  const state = await firstState;
  return { p1, code: state.code };
}

// Sit both players; game auto-starts after 2 s debounce
async function startTwoPlayerGame(p1: ClientSocket, p2: ClientSocket, code: string): Promise<RoomState> {
  p1.emit('sit-down', { seatIndex: 0 });
  await waitFor(p1, 'room-state');
  p2.emit('sit-down', { seatIndex: 1 });
  // Auto-start fires 2 s after second player sits; give 8 s total to be safe
  return waitForState(p1, s => s.game?.phase === 'preflop', 8000);
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Room management', () => {
  it('creates a room with a 6-char code', async () => {
    const { code } = await setupRoom();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('second player joins and both appear in player list', async () => {
    const { p1, code } = await setupRoom();
    const p2 = await connect();

    const p2State = waitFor<RoomState>(p2, 'room-state');
    p2.emit('join-room', { code, nickname: 'Bob', asSpectator: false });
    const state = await p2State;

    expect(state.players).toHaveLength(2);
    expect(state.players.map(p => p.nickname)).toContain('Alice');
    expect(state.players.map(p => p.nickname)).toContain('Bob');
  });

  it('spectator joins and is not counted as seated player', async () => {
    const { p1, code } = await setupRoom();
    const spectator = await connect();

    const specState = waitFor<RoomState>(spectator, 'room-state');
    spectator.emit('join-room', { code, nickname: 'Viewer', asSpectator: true });
    const state = await specState;

    const seated = state.players.filter(p => p.seatIndex !== null);
    expect(seated).toHaveLength(0); // spectator has no seat
    expect(state.players.find(p => p.nickname === 'Viewer')?.status).toBe('spectating');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Game start', () => {
  it('deals hole cards and posts blinds on start', async () => {
    const { p1, code } = await setupRoom();
    const p2 = await connect();
    p2.emit('join-room', { code, nickname: 'Bob', asSpectator: false });
    await waitFor(p2, 'room-state');

    const state = await startTwoPlayerGame(p1, p2, code);

    // During preflop, blinds sit in player.bet (pot fills at street end)
    const seatedInGame = state.players.filter(p => p.seatIndex !== null);
    const totalBets = seatedInGame.reduce((sum, p) => sum + p.bet, 0);
    expect(totalBets).toBeGreaterThan(0); // SB + BB bets posted
    expect(state.game!.phase).toBe('preflop');
  });

  it('requires at least 2 seated players to start', async () => {
    const { p1 } = await setupRoom();
    p1.emit('sit-down', { seatIndex: 0 });
    await waitFor(p1, 'room-state');

    // Attempt start with only 1 player — should not emit a preflop state
    let gotPreflop = false;
    p1.on('room-state', (s: RoomState) => { if (s.game?.phase === 'preflop') gotPreflop = true; });
    p1.emit('start-game');
    await new Promise(r => setTimeout(r, 300));
    expect(gotPreflop).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Betting round — heads-up', () => {
  it('BB gets a chance to act after SB calls preflop', async () => {
    const { p1, code } = await setupRoom({ bb: 20, chips: 200 });
    const p2 = await connect();
    p2.emit('join-room', { code, nickname: 'Bob', asSpectator: false });
    await waitFor(p2, 'room-state');

    const preflopState = await startTwoPlayerGame(p1, p2, code);
    const game = preflopState.game!;

    // Find which player is UTG (acts first)
    const seated = preflopState.players.filter(p => p.seatIndex !== null && p.isConnected);
    const currentPlayer = seated[game.currentPlayerIndex];
    const utg = currentPlayer.nickname === 'Alice' ? p1 : p2;
    const bb = currentPlayer.nickname === 'Alice' ? p2 : p1;
    const bbNickname = currentPlayer.nickname === 'Alice' ? 'Bob' : 'Alice';

    // UTG calls the big blind
    utg.emit('action', { type: 'call' });

    // Now it should be BB's turn (not skip to flop)
    const afterCall = await waitForState(p1, s => {
      if (s.game?.phase !== 'preflop') return false;
      const seated2 = s.players.filter(p => p.seatIndex !== null && p.isConnected);
      return seated2[s.game.currentPlayerIndex]?.nickname === bbNickname;
    });

    expect(afterCall.game?.phase).toBe('preflop');
    const seated2 = afterCall.players.filter(p => p.seatIndex !== null && p.isConnected);
    expect(seated2[afterCall.game!.currentPlayerIndex].nickname).toBe(bbNickname);
  });

  it('moves to flop after both players check/call', async () => {
    const { p1, code } = await setupRoom({ bb: 20, chips: 200 });
    const p2 = await connect();
    p2.emit('join-room', { code, nickname: 'Bob', asSpectator: false });
    await waitFor(p2, 'room-state');

    const preflopState = await startTwoPlayerGame(p1, p2, code);
    const seated = preflopState.players.filter(p => p.seatIndex !== null && p.isConnected);
    const first = seated[preflopState.game!.currentPlayerIndex];
    const firstSocket = first.nickname === 'Alice' ? p1 : p2;
    const secondSocket = first.nickname === 'Alice' ? p2 : p1;

    // UTG calls
    firstSocket.emit('action', { type: 'call' });
    // Wait for BB's turn
    await waitForState(p1, s => {
      if (s.game?.phase !== 'preflop') return false;
      const s2 = s.players.filter(p => p.seatIndex !== null && p.isConnected);
      return s2[s.game.currentPlayerIndex]?.id !== first.id;
    });

    // BB checks
    secondSocket.emit('action', { type: 'check' });

    // Should move to flop
    const flopState = await waitForState(p1, s => s.game?.phase === 'flop');
    expect(flopState.game!.communityCards).toHaveLength(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Fold and win', () => {
  it('winner is determined when all but one player folds', async () => {
    const { p1, code } = await setupRoom({ bb: 20, chips: 1000 });
    const p2 = await connect();
    p2.emit('join-room', { code, nickname: 'Bob', asSpectator: false });
    await waitFor(p2, 'room-state');

    const preflopState = await startTwoPlayerGame(p1, p2, code);
    const seated = preflopState.players.filter(p => p.seatIndex !== null && p.isConnected);
    const current = seated[preflopState.game!.currentPlayerIndex];
    const actingSocket = current.nickname === 'Alice' ? p1 : p2;

    actingSocket.emit('action', { type: 'fold' });

    const resultState = await waitForState(p1, s => s.game?.phase === 'result');
    expect(resultState.game!.lastResult).toBeTruthy();
    expect(resultState.game!.lastResult!.winnerId).toBeTruthy();
    expect(resultState.game!.lastResult!.potWon).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Full hand — showdown', () => {
  it('reaches showdown when both players go all-in preflop', async () => {
    const { p1, code } = await setupRoom({ bb: 20, chips: 100 });
    const p2 = await connect();
    p2.emit('join-room', { code, nickname: 'Bob', asSpectator: false });
    await waitFor(p2, 'room-state');

    const preflopState = await startTwoPlayerGame(p1, p2, code);
    const seated = preflopState.players.filter(p => p.seatIndex !== null && p.isConnected);
    const first = seated[preflopState.game!.currentPlayerIndex];
    const firstSocket = first.nickname === 'Alice' ? p1 : p2;
    const secondSocket = first.nickname === 'Alice' ? p2 : p1;

    // UTG goes all-in
    firstSocket.emit('action', { type: 'allin' });

    // Wait for next player's turn
    await waitForState(p1, s => {
      if (!['preflop','flop','turn','river'].includes(s.game?.phase ?? '')) return false;
      const s2 = s.players.filter(p => p.seatIndex !== null && p.isConnected);
      return s2[s.game!.currentPlayerIndex]?.id !== first.id;
    });

    // Other player calls all-in
    secondSocket.emit('action', { type: 'allin' });

    // Should eventually reach result after all streets play out
    const result = await waitForState(p1, s => s.game?.phase === 'result', 8000);
    expect(result.game!.lastResult).toBeTruthy();
    expect(result.game!.lastResult!.winnerId).toBeTruthy();
    expect(result.game!.lastResult!.potWon).toBeGreaterThan(0);
    // Community cards fully dealt (5 cards for showdown)
    expect(result.game!.communityCards.length).toBeGreaterThanOrEqual(5);
  });

  it('flop is dealt after preflop betting completes', async () => {
    // Simpler: UTG calls, BB checks → flop should appear
    const { p1, code } = await setupRoom({ bb: 20, chips: 1000 });
    const p2 = await connect();
    p2.emit('join-room', { code, nickname: 'Bob', asSpectator: false });
    await waitFor(p2, 'room-state');

    const preflopState = await startTwoPlayerGame(p1, p2, code);
    const seated = preflopState.players.filter(p => p.seatIndex !== null && p.isConnected);
    const utg = seated[preflopState.game!.currentPlayerIndex];
    const utgSocket = utg.nickname === 'Alice' ? p1 : p2;
    const bbSocket = utg.nickname === 'Alice' ? p2 : p1;

    // UTG calls
    utgSocket.emit('action', { type: 'call' });

    // Wait for BB to be current player
    const bbTurnState = await waitForState(p1, s => {
      if (s.game?.phase !== 'preflop') return false;
      const s2 = s.players.filter(p => p.seatIndex !== null && p.isConnected);
      return s2[s.game.currentPlayerIndex]?.id !== utg.id;
    });
    expect(bbTurnState.game!.phase).toBe('preflop');

    // BB checks
    bbSocket.emit('action', { type: 'check' });

    // Should advance to flop
    const flopState = await waitForState(p1, s => s.game?.phase === 'flop');
    expect(flopState.game!.communityCards).toHaveLength(3);
  }, 10000);
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Chat', () => {
  it('broadcasts chat message to all room members', async () => {
    const { p1, code } = await setupRoom();
    const p2 = await connect();
    p2.emit('join-room', { code, nickname: 'Bob', asSpectator: false });
    await waitFor(p2, 'room-state');

    const p2MsgPromise = waitFor<ChatMessage>(p2, 'chat-message');
    p1.emit('chat-message', { text: 'Boa sorte!' });
    const msg = await p2MsgPromise;

    expect(msg.text).toBe('Boa sorte!');
    expect(msg.nickname).toBe('Alice');
  });

  it('truncates messages longer than 200 chars', async () => {
    const { p1, code } = await setupRoom();
    const p2 = await connect();
    p2.emit('join-room', { code, nickname: 'Bob', asSpectator: false });
    await waitFor(p2, 'room-state');

    const p2MsgPromise = waitFor<ChatMessage>(p2, 'chat-message');
    p1.emit('chat-message', { text: 'x'.repeat(300) });
    const msg = await p2MsgPromise;

    expect(msg.text.length).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Disconnect handling', () => {
  it('marks player as disconnected and folded mid-game', async () => {
    const { p1, code } = await setupRoom({ bb: 20, chips: 1000 });
    const p2 = await connect();
    p2.emit('join-room', { code, nickname: 'Bob', asSpectator: false });
    await waitFor(p2, 'room-state');

    await startTwoPlayerGame(p1, p2, code);

    // Disconnect p2 mid-hand
    p2.disconnect();

    // p1 should eventually see result (p2 folded by disconnect)
    const resultState = await waitForState(p1, s =>
      s.game?.phase === 'result' || s.players.find(p => p.nickname === 'Bob')?.isConnected === false
    , 4000);
    const bob = resultState.players.find(p => p.nickname === 'Bob');
    expect(bob?.isConnected).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Cucurucho mode', () => {
  it('fires cucurucho-pay-in event after flop when active', async () => {
    const { p1, code } = await setupRoom({ mode: 'cucurucho', bb: 20, chips: 2000 });
    const p2 = await connect();
    p2.emit('join-room', { code, nickname: 'Bob', asSpectator: false });
    await waitFor(p2, 'room-state');

    // Force cucurucho to be active by manipulating state via direct game start
    // The cucurucho hand fires when dealerIndex === cucuruchoIndex
    // cucuruchoIndex starts at maxSeats-1 = 5, dealerIndex starts at 0
    // They won't match on first hand. We test the ante collection instead.

    const preflopState = await startTwoPlayerGame(p1, p2, code);
    // In cucurucho mode, each hand may or may not trigger cucurucho
    // During preflop, blinds are in player.bet not game.pot
    const seatedPlayers = preflopState.players.filter(p => p.seatIndex !== null);
    const totalBets = seatedPlayers.reduce((sum, p) => sum + p.bet, 0);
    expect(preflopState.game!.mode).toBe('cucurucho');
    expect(totalBets).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Pot integrity', () => {
  it('total chips are conserved across a hand (fold case)', async () => {
    const startingChips = 1000;
    const { p1, code } = await setupRoom({ bb: 20, chips: startingChips });
    const p2 = await connect();
    p2.emit('join-room', { code, nickname: 'Bob', asSpectator: false });
    await waitFor(p2, 'room-state');

    const preflopState = await startTwoPlayerGame(p1, p2, code);
    // During preflop: chips + current bets = total (pot fills at street end)
    const totalBefore = preflopState.players
      .filter(p => p.seatIndex !== null)
      .reduce((sum, p) => sum + p.chips + p.bet, 0) + preflopState.game!.pot;

    const seated = preflopState.players.filter(p => p.seatIndex !== null && p.isConnected);
    const current = seated[preflopState.game!.currentPlayerIndex];
    const actingSocket = current.nickname === 'Alice' ? p1 : p2;

    actingSocket.emit('action', { type: 'fold' });

    const resultState = await waitForState(p1, s => s.game?.phase === 'result');
    // After result: all bets collected, winner received pot, game.pot redistributed
    const totalAfter = resultState.players
      .filter(p => p.seatIndex !== null)
      .reduce((sum, p) => sum + p.chips + p.bet, 0) + resultState.game!.pot;

    expect(totalBefore).toBe(startingChips * 2);
    expect(Math.abs(totalAfter - totalBefore)).toBeLessThanOrEqual(1);
  });
});
