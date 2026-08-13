import type { Server, Socket } from 'socket.io';
import {
  createRoom, getRoom, getRoomBySocketId,
  registerSocket, unregisterSocket, maybeCleanupRoom,
} from './room-manager';
import type { CreateRoomPayload, JoinRoomPayload, SitDownPayload, ActionPayload, ChatPayload } from '@/game/types';

const VALID_ACTIONS = new Set(['fold', 'check', 'call', 'raise', 'allin', 'ante']);

function validateCreateRoom(p: unknown): p is CreateRoomPayload {
  if (!p || typeof p !== 'object') return false;
  const { nickname, bigBlind, startingChips, maxSeats } = p as Record<string, unknown>;
  if (typeof nickname !== 'string' || nickname.trim().length === 0 || nickname.length > 30) return false;
  if (bigBlind !== undefined && (typeof bigBlind !== 'number' || bigBlind < 2 || bigBlind > 100000 || !isFinite(bigBlind))) return false;
  if (startingChips !== undefined && (typeof startingChips !== 'number' || startingChips < 10 || startingChips > 10_000_000 || !isFinite(startingChips))) return false;
  if (maxSeats !== undefined && (typeof maxSeats !== 'number' || maxSeats < 2 || maxSeats > 9)) return false;
  return true;
}

function validateAction(p: unknown): p is ActionPayload {
  if (!p || typeof p !== 'object') return false;
  const { type, amount } = p as Record<string, unknown>;
  if (typeof type !== 'string' || !VALID_ACTIONS.has(type)) return false;
  if (amount !== undefined && (typeof amount !== 'number' || amount < 0 || !isFinite(amount))) return false;
  return true;
}

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    const socketId = socket.id;
    // Stable client identity: UUID from localStorage, or fall back to socket ID for old clients / tests
    const clientToken = (socket.handshake.auth as { token?: string }).token?.trim() || socketId;

    function emitRoomState(code: string): void {
      const session = getRoom(code);
      if (!session) return;
      io.to(code).emit('room-state', session.getRoomState());
      // Send private hole cards to each connected player
      session.players.forEach(p => {
        if (p.isConnected) {
          io.to(p.id).emit('your-cards', session.getPlayerCards(p.id));
        }
      });
    }

    function attachSessionListeners(code: string): void {
      const session = getRoom(code);
      if (!session) return;
      // Guard against double-registration (only one set of listeners per session)
      if (session.listenerCount('state-updated') === 0) {
        session.on('state-updated', () => emitRoomState(code));
        session.on('cucurucho-pay-in', () => {
          io.to(code).emit('cucurucho-pay-in', { potAmount: session.game.cucuruchoPotSnapshot });
          emitRoomState(code);
        });
      }
    }

    socket.on('create-room', (payload: CreateRoomPayload) => {
      if (!validateCreateRoom(payload)) {
        socket.emit('error', { message: 'Configuração de sala inválida' });
        return;
      }
      const session = createRoom(socketId, clientToken, payload.nickname.trim(), {
        bigBlind: payload.bigBlind ?? 20,
        startingChips: payload.startingChips ?? 1000,
        maxSeats: payload.maxSeats ?? 9,
        mode: payload.mode ?? 'holdem',
        turnTimeLimit: payload.turnTimeLimit ?? 30,
        cucuruchoAnteMultiplier: payload.cucuruchoAnteMultiplier ?? 10,
        allowRebuy: payload.allowRebuy ?? false,
        rebuyAmount: payload.rebuyAmount ?? payload.startingChips ?? 1000,
      });
      registerSocket(socketId, session.code);
      socket.join(session.code);
      socket.join(socketId); // personal channel for hole cards
      attachSessionListeners(session.code);
      emitRoomState(session.code);
    });

    socket.on('join-room', (payload: JoinRoomPayload) => {
      if (!payload || typeof payload.code !== 'string' || typeof payload.nickname !== 'string') {
        socket.emit('error', { message: 'Payload de join inválido' });
        return;
      }
      const code = payload.code.toUpperCase().trim();
      const nickname = payload.nickname.trim().slice(0, 30) || 'Jogador';
      const session = getRoom(code);
      if (!session) {
        socket.emit('error', { message: 'Sala não encontrada' });
        return;
      }
      session.addPlayer(socketId, clientToken, nickname, payload.asSpectator ?? false);
      registerSocket(socketId, code);
      socket.join(code);
      socket.join(socketId);
      attachSessionListeners(code);
      emitRoomState(code);
    });

    socket.on('sit-down', (payload: SitDownPayload) => {
      if (!payload || typeof payload.seatIndex !== 'number' || payload.seatIndex < 0 || !isFinite(payload.seatIndex)) return;
      const session = getRoomBySocketId(socketId);
      if (!session) return;
      session.sitDown(socketId, Math.floor(payload.seatIndex));
      emitRoomState(session.code);
      if (session.canStart()) session.scheduleStartHand();
    });

    socket.on('leave-seat', () => {
      const session = getRoomBySocketId(socketId);
      if (!session) return;
      session.leaveSeat(socketId);
      emitRoomState(session.code);
    });

    socket.on('action', (payload: ActionPayload) => {
      if (!validateAction(payload)) return;
      const session = getRoomBySocketId(socketId);
      if (!session) return;
      session.handleAction(socketId, payload.type, payload.amount);
    });

    socket.on('cucurucho-decision', (payload: { payIn: boolean }) => {
      if (!payload || typeof payload.payIn !== 'boolean') return;
      const session = getRoomBySocketId(socketId);
      if (!session) return;
      session.handleCucuruchoPayIn(socketId, payload.payIn);
      emitRoomState(session.code);
    });

    socket.on('chat-message', (payload: ChatPayload) => {
      if (!payload || typeof payload.text !== 'string' || payload.text.trim().length === 0) return;
      const session = getRoomBySocketId(socketId);
      if (!session) return;
      const msg = session.addChatMessage(socketId, payload.text);
      io.to(session.code).emit('chat-message', msg);
    });

    socket.on('request-rebuy', () => {
      const session = getRoomBySocketId(socketId);
      if (!session) return;
      const ok = session.requestRebuy(socketId);
      if (ok) emitRoomState(session.code);
    });

    socket.on('disconnect', () => {
      const session = getRoomBySocketId(socketId);
      unregisterSocket(socketId);
      if (!session) return;
      session.removePlayer(socketId);
      emitRoomState(session.code);
      maybeCleanupRoom(session.code);
    });
  });
}
