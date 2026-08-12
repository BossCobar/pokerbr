/**
 * 3-player automated Socket.io test for PokerBR
 * Tests: room creation, joining, sitting, game start, full hand play,
 * pot integrity, chat, and dealer rotation across 2 hands.
 *
 * Run against the dev server: node test-3players.mjs
 * Server must be running: npm run dev
 */

import { io } from 'socket.io-client';

const URL = 'http://localhost:3000';
const STARTING_CHIPS = 1000;
const BIG_BLIND = 20;
const TOTAL_CHIPS = STARTING_CHIPS * 3;

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}`);
    failed++;
    errors.push(label);
  }
}

function connect(name) {
  return new Promise((resolve, reject) => {
    const socket = io(URL, { transports: ['websocket'] });
    socket._name = name;
    socket.once('connect', () => {
      console.log(`  [${name}] connected (id: ${socket.id})`);
      resolve(socket);
    });
    socket.once('connect_error', (e) => reject(new Error(`${name} connect_error: ${e.message}`)));
    setTimeout(() => reject(new Error(`${name} connection timeout`)), 5000);
  });
}

function waitFor(socket, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`[${socket._name}] Timeout waiting for "${event}"`)), timeoutMs);
    socket.once(event, (data) => { clearTimeout(t); resolve(data); });
  });
}

function waitForState(socket, pred, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`[${socket._name}] Timeout waiting for room-state condition`)), timeoutMs);
    const handler = (state) => {
      try {
        if (pred(state)) { clearTimeout(t); socket.off('room-state', handler); resolve(state); }
      } catch (e) { /* pred threw, state not ready */ }
    };
    socket.on('room-state', handler);
  });
}

function seatedPlayers(state) {
  return state.players.filter(p => p.seatIndex !== null && p.status !== 'spectating' && p.isConnected);
}

// Returns total chips in play: chips + current bets + pot
// (totalBet tracks cumulative but isn't used in integrity check)
function chipsInPlay(state) {
  const playerChips = state.players
    .filter(p => p.seatIndex !== null)
    .reduce((sum, p) => sum + p.chips + p.bet, 0);
  return playerChips + (state.game?.pot ?? 0);
}

function debugState(state, label) {
  const seated = state.players.filter(p => p.seatIndex !== null);
  console.log(`  [debug:${label}] phase=${state.game?.phase} pot=${state.game?.pot} street=${state.game?.street}`);
  seated.forEach(p => {
    console.log(`    ${p.nickname}: chips=${p.chips} bet=${p.bet} totalBet=${p.totalBet} status=${p.status} lastAction=${p.lastAction ?? '-'}`);
  });
  console.log(`    → chipsInPlay = ${chipsInPlay(state)}`);
}

async function playStreet(label, sockets, startState, actionType = 'check') {
  const { p1, p2, p3 } = sockets;
  const allSockets = [p1, p2, p3];
  let state = startState;
  const phase = state.game?.phase;

  for (let i = 0; i < 8; i++) {
    const seated = seatedPlayers(state);
    const curr = seated[state.game.currentPlayerIndex];
    if (!curr) { console.log(`  [${label}] No current player at index ${state.game.currentPlayerIndex}`); break; }

    const actingSocket = allSockets.find(s => s.id === curr.id);
    if (!actingSocket) { console.log(`  [${label}] Socket not found for ${curr.nickname}`); break; }

    const callAmt = Math.min((state.game.currentBet ?? 0) - curr.bet, curr.chips);
    const action = callAmt > 0 ? 'call' : actionType;

    console.log(`  [${label}] ${curr.nickname} → ${action}`);
    actingSocket.emit('action', { type: action });

    try {
      state = await waitForState(p1, s =>
        s.game?.phase !== phase ||
        seatedPlayers(s)[s.game.currentPlayerIndex]?.id !== curr.id
      , 5000);
    } catch (e) {
      console.log(`  [${label}] Timeout after ${curr.nickname}'s ${action}: ${e.message}`);
      break;
    }

    if (state.game?.phase !== phase) break;
  }

  return state;
}

async function runTest() {
  console.log('\n====================================================');
  console.log('  PokerBR 3-Player Automated Test');
  console.log('====================================================\n');

  // ─── Connect 3 players ───────────────────────────────────────────────────
  console.log('[ Step 1: Connect 3 players ]');
  let p1, p2, p3;
  try {
    [p1, p2, p3] = await Promise.all([connect('Alice'), connect('Bob'), connect('Charlie')]);
  } catch (e) {
    console.error('FATAL: Could not connect to server:', e.message);
    console.error('Make sure the dev server is running: npm run dev');
    process.exit(1);
  }

  // ─── Create room with p1 ─────────────────────────────────────────────────
  console.log('\n[ Step 2: Create room ]');
  const p1FirstState = waitFor(p1, 'room-state');
  p1.emit('create-room', {
    nickname: 'Alice',
    bigBlind: BIG_BLIND,
    startingChips: STARTING_CHIPS,
    maxSeats: 6,
    mode: 'holdem',
    turnTimeLimit: 0, // no timer for automated test
  });
  const createState = await p1FirstState;
  const code = createState.code;
  assert(code && /^[A-Z0-9]{6}$/.test(code), `Room created with code: ${code}`);

  // ─── p2 and p3 join ──────────────────────────────────────────────────────
  console.log('\n[ Step 3: p2 and p3 join room ]');
  const p2JoinState = waitFor(p2, 'room-state');
  p2.emit('join-room', { code, nickname: 'Bob', asSpectator: false });
  const p2State = await p2JoinState;
  assert(p2State.players.length >= 2, 'p2 joined — 2 players in room');

  const p3JoinState = waitFor(p3, 'room-state');
  p3.emit('join-room', { code, nickname: 'Charlie', asSpectator: false });
  const p3State = await p3JoinState;
  assert(p3State.players.length >= 3, 'p3 joined — 3 players in room');

  // ─── Test chat ───────────────────────────────────────────────────────────
  console.log('\n[ Step 4: Chat test ]');
  const chatPromise = waitFor(p2, 'chat-message');
  p1.emit('chat-message', { text: 'Boa sorte a todos!' });
  const chatMsg = await chatPromise;
  assert(chatMsg.text === 'Boa sorte a todos!', 'Chat message received by p2');
  assert(chatMsg.nickname === 'Alice', 'Chat sender is Alice');

  // ─── All 3 sit down ──────────────────────────────────────────────────────
  console.log('\n[ Step 5: All 3 sit down ]');
  p1.emit('sit-down', { seatIndex: 0 });
  await waitFor(p1, 'room-state');
  p2.emit('sit-down', { seatIndex: 1 });
  await waitFor(p1, 'room-state');
  p3.emit('sit-down', { seatIndex: 2 });
  const afterSit = await waitFor(p1, 'room-state');
  const sat = afterSit.players.filter(p => p.seatIndex !== null);
  assert(sat.length === 3, '3 players seated');

  // ─── Host starts game ────────────────────────────────────────────────────
  console.log('\n[ Step 6: Start game ]');
  p1.emit('start-game');
  const preflopState = await waitForState(p1, s => s.game?.phase === 'preflop', 5000);
  assert(preflopState.game.phase === 'preflop', 'Game phase is preflop');

  debugState(preflopState, 'preflop-start');

  // Verify blinds were posted
  const seatedInPreflop = seatedPlayers(preflopState);
  const totalBets = seatedInPreflop.reduce((sum, p) => sum + p.bet, 0);
  assert(totalBets > 0, `Blinds posted (total bets: ${totalBets})`);
  assert(totalBets === BIG_BLIND + BIG_BLIND / 2, `Correct blind amounts (SB=${BIG_BLIND/2}, BB=${BIG_BLIND})`);

  // Check pot integrity at preflop
  const potIntegrity1 = chipsInPlay(preflopState);
  assert(potIntegrity1 === TOTAL_CHIPS, `Pot integrity at preflop: ${potIntegrity1} === ${TOTAL_CHIPS}`);

  // Dealer/SB/BB assigned
  const dealer = preflopState.players.find(p => p.isDealer);
  const sb = preflopState.players.find(p => p.isSB);
  const bb = preflopState.players.find(p => p.isBB);
  assert(!!dealer, `Dealer assigned: ${dealer?.nickname}`);
  assert(!!sb, `SB assigned: ${sb?.nickname}`);
  assert(!!bb, `BB assigned: ${bb?.nickname}`);

  // ─── Preflop: UTG calls, SB calls, BB checks ─────────────────────────────
  console.log('\n[ Step 7: Preflop betting — UTG calls, SB calls, BB checks ]');
  let state = preflopState;

  // Act through preflop: everyone calls/checks to see flop
  for (let i = 0; i < 6; i++) {
    const seatd = seatedPlayers(state);
    const curr = seatd[state.game.currentPlayerIndex];
    if (!curr) break;
    const actSocket = [p1, p2, p3].find(s => s.id === curr.id);
    if (!actSocket) break;

    const callAmt = Math.min((state.game.currentBet ?? 0) - curr.bet, curr.chips);
    const action = callAmt > 0 ? 'call' : 'check';
    console.log(`  [preflop] ${curr.nickname} → ${action}${callAmt > 0 ? ' ' + callAmt : ''}`);
    actSocket.emit('action', { type: action });

    try {
      state = await waitForState(p1, s =>
        s.game?.phase !== 'preflop' ||
        seatedPlayers(s)[s.game.currentPlayerIndex]?.id !== curr.id
      , 5000);
    } catch { break; }
    if (state.game?.phase !== 'preflop') break;
  }

  const phaseAfterPreflop = state.game?.phase;
  debugState(state, `after-preflop(${phaseAfterPreflop})`);
  assert(
    ['flop', 'result'].includes(phaseAfterPreflop),
    `After preflop: phase is ${phaseAfterPreflop}`
  );
  assert(chipsInPlay(state) === TOTAL_CHIPS, `Pot integrity after preflop: ${chipsInPlay(state)} === ${TOTAL_CHIPS}`);

  // ─── Flop ────────────────────────────────────────────────────────────────
  if (phaseAfterPreflop === 'flop') {
    assert(state.game.communityCards.length === 3, `Flop dealt (${state.game.communityCards.length} community cards)`);
    console.log('\n[ Step 8: Flop betting — all check ]');
    state = await playStreet('flop', { p1, p2, p3 }, state, 'check');
    debugState(state, `after-flop(${state.game?.phase})`);
    assert(['turn', 'result'].includes(state.game?.phase), `After flop: phase is ${state.game?.phase}`);
    assert(chipsInPlay(state) === TOTAL_CHIPS, `Pot integrity after flop: ${chipsInPlay(state)}`);
  }

  // ─── Turn ────────────────────────────────────────────────────────────────
  if (state.game?.phase === 'turn') {
    assert(state.game.communityCards.length === 4, `Turn dealt (${state.game.communityCards.length} community cards)`);
    console.log('\n[ Step 9: Turn betting — all check ]');
    state = await playStreet('turn', { p1, p2, p3 }, state, 'check');
    debugState(state, `after-turn(${state.game?.phase})`);
    assert(['river', 'result'].includes(state.game?.phase), `After turn: phase is ${state.game?.phase}`);
    assert(chipsInPlay(state) === TOTAL_CHIPS, `Pot integrity after turn: ${chipsInPlay(state)}`);
  }

  // ─── River ───────────────────────────────────────────────────────────────
  if (state.game?.phase === 'river') {
    assert(state.game.communityCards.length === 5, `River dealt (${state.game.communityCards.length} community cards)`);
    console.log('\n[ Step 10: River betting — all check ]');
    state = await playStreet('river', { p1, p2, p3 }, state, 'check');
    debugState(state, `after-river(${state.game?.phase})`);
    assert(['result', 'showdown'].includes(state.game?.phase), `After river: phase is ${state.game?.phase}`);
    assert(chipsInPlay(state) === TOTAL_CHIPS, `Pot integrity after river: ${chipsInPlay(state)} === ${TOTAL_CHIPS}`);
  }

  // ─── Result ──────────────────────────────────────────────────────────────
  // If state already has phase='result', use it. Otherwise wait for it.
  let resultState = state;
  if (state.game?.phase !== 'result') {
    console.log('\n[ Step 11: Waiting for result ]');
    resultState = await waitForState(p1, s => s.game?.phase === 'result', 10000);
  }

  console.log('\n[ Step 11: Result / winner ]');
  debugState(resultState, 'result');
  assert(resultState.game.phase === 'result', 'Result phase reached');
  assert(!!resultState.game.lastResult, 'lastResult is set');
  assert(!!resultState.game.lastResult?.winnerId, 'Winner ID set');
  assert(resultState.game.lastResult?.potWon > 0, `Pot won: ${resultState.game.lastResult?.potWon}`);
  assert(chipsInPlay(resultState) === TOTAL_CHIPS, `Pot integrity at result: ${chipsInPlay(resultState)} === ${TOTAL_CHIPS}`);

  // Verify lastAction is set for players
  const playersWithActions = resultState.players.filter(p => p.seatIndex !== null && p.lastAction);
  console.log(`  [lastAction] Players with lastAction: ${playersWithActions.map(p => `${p.nickname}:${p.lastAction}`).join(', ')}`);
  assert(playersWithActions.length > 0, 'Some players have lastAction set');

  // Verify cards are revealed at showdown if it was a showdown
  const hand1 = resultState.game.lastResult;
  const winner = resultState.players.find(p => p.id === hand1.winnerId);
  assert(!!winner, `Winner found: ${winner?.nickname}`);

  // ─── Second hand — verify dealer rotation ────────────────────────────────
  console.log('\n[ Step 12: Second hand — dealer rotation ]');
  const hand1DealerIndex = resultState.game.dealerIndex;

  const preflop2 = await waitForState(p1, s => s.game?.phase === 'preflop' && s.game.handNumber === 2, 9000);
  assert(preflop2.game.handNumber === 2, `Second hand started (hand #${preflop2.game.handNumber})`);

  const hand2DealerIndex = preflop2.game.dealerIndex;
  const seatedCount = seatedPlayers(preflop2).length;
  const expectedDealerIndex = (hand1DealerIndex + 1) % seatedCount;
  assert(hand2DealerIndex === expectedDealerIndex, `Dealer rotated: ${hand1DealerIndex} → ${hand2DealerIndex} (expected ${expectedDealerIndex})`);

  // Pot integrity at start of hand 2
  debugState(preflop2, 'hand2-preflop');
  assert(chipsInPlay(preflop2) === TOTAL_CHIPS, `Pot integrity at hand 2 preflop: ${chipsInPlay(preflop2)}`);

  // Verify lastAction was reset for new hand
  const hand2PlayersWithActions = preflop2.players.filter(p => p.seatIndex !== null && p.lastAction);
  assert(hand2PlayersWithActions.length === 0, 'lastAction reset at new hand start');

  // Quick fold x2 to end hand 2 (need 2 folds in 3-player to leave 1 winner)
  let hand2State = preflop2;
  for (let fold = 0; fold < 2; fold++) {
    const seated2 = seatedPlayers(hand2State);
    const curr2 = seated2[hand2State.game.currentPlayerIndex];
    const actingSocket2 = [p1, p2, p3].find(s => s.id === curr2?.id);
    if (!actingSocket2 || !curr2) break;
    console.log(`  [hand2] ${curr2.nickname} → fold`);
    actingSocket2.emit('action', { type: 'fold' });
    // Wait for the next meaningful state: either result (2nd fold) or next player's turn (1st fold)
    hand2State = await waitForState(p1, s =>
      (s.game?.phase === 'result' && s.game.handNumber === 2) ||
      (s.game?.phase === 'preflop' && s.game.handNumber === 2 &&
       seatedPlayers(s)[s.game.currentPlayerIndex]?.id !== curr2.id),
      5000
    );
    if (hand2State.game?.phase === 'result') break;
  }
  const result2 = hand2State.game?.phase === 'result'
    ? hand2State
    : await waitForState(p1, s => s.game?.phase === 'result' && s.game.handNumber === 2, 5000);
  assert(result2.game.phase === 'result', 'Hand 2 ended with result');
  debugState(result2, 'hand2-result');
  assert(chipsInPlay(result2) === TOTAL_CHIPS, `Pot integrity after hand 2: ${chipsInPlay(result2)}`);

  // Verify fold lastAction is set
  const foldedPlayer = result2.players.find(p => p.seatIndex !== null && p.lastAction === 'Fold');
  assert(!!foldedPlayer, `Fold lastAction set: ${foldedPlayer?.nickname}`);

  // ─── Disconnect cleanly ──────────────────────────────────────────────────
  console.log('\n[ Step 13: Cleanup ]');
  p1.disconnect();
  p2.disconnect();
  p3.disconnect();
  console.log('  All sockets disconnected');
}

runTest()
  .then(() => {
    console.log('\n====================================================');
    console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
    if (errors.length > 0) {
      console.log('\n  FAILED ASSERTIONS:');
      errors.forEach(e => console.log(`    - ${e}`));
    }
    console.log('====================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch(e => {
    console.error('\n====================================================');
    console.error('  FATAL ERROR:', e.message);
    console.error('====================================================\n');
    process.exit(1);
  });
