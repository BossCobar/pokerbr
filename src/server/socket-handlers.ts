import type { Server, Socket } from 'socket.io';
import { createRoom, getRoom, getRoomByPlayerId } from './room-manager';
import type { CreateRoomPayload, JoinRoomPayload, SitDownPayload, ActionPayload, ChatPayload } from '@/game/types';

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    const playerId = socket.id;

    function emitRoomState(code: string): void {
      const session = getRoom(code);
      if (!session) return;
      io.to(code).emit('room-state', session.getRoomState());
      session.players.forEach(p => {
        io.to(p.id).emit('your-cards', session.getPlayerCards(p.id));
      });
    }

    function attachSessionListeners(code: string): void {
      const session = getRoom(code);
      if (!session) return;
      if (session.listenerCount('state-updated') === 0) {
        session.on('state-updated', () => emitRoomState(code));
        session.on('cucurucho-pay-in', () => {
          io.to(code).emit('cucurucho-pay-in', { potAmount: session.game.cucuruchoPotSnapshot });
          emitRoomState(code);
        });
      }
    }

    socket.on('create-room', (payload: CreateRoomPayload) => {
      const session = createRoom(playerId, payload.nickname, {
        bigBlind: payload.bigBlind ?? 20,
        startingChips: payload.startingChips ?? 1000,
        maxSeats: payload.maxSeats ?? 9,
        mode: payload.mode ?? 'holdem',
        turnTimeLimit: payload.turnTimeLimit ?? 30,
        cucuruchoAnteMultiplier: payload.cucuruchoAnteMultiplier ?? 10,
        allowRebuy: payload.allowRebuy ?? false,
        rebuyAmount: payload.rebuyAmount ?? payload.startingChips ?? 1000,
      });
      socket.join(session.code);
      socket.join(playerId);
      attachSessionListeners(session.code);
      emitRoomState(session.code);
    });

    socket.on('join-room', (payload: JoinRoomPayload) => {
      const session = getRoom(payload.code);
      if (!session) { socket.emit('error', { message: 'Sala não encontrada' }); return; }
      session.addPlayer(playerId, payload.nickname, payload.asSpectator ?? false);
      socket.join(payload.code);
      socket.join(playerId);
      attachSessionListeners(payload.code);
      emitRoomState(payload.code);
    });

    socket.on('sit-down', (payload: SitDownPayload) => {
      const session = getRoomByPlayerId(playerId);
      if (!session) return;
      session.sitDown(playerId, payload.seatIndex);
      emitRoomState(session.code);
    });

    socket.on('leave-seat', () => {
      const session = getRoomByPlayerId(playerId);
      if (!session) return;
      session.leaveSeat(playerId);
      emitRoomState(session.code);
    });

    socket.on('start-game', () => {
      const session = getRoomByPlayerId(playerId);
      if (!session || session.hostId !== playerId) return;
      session.startHand();
    });

    socket.on('action', (payload: ActionPayload) => {
      const session = getRoomByPlayerId(playerId);
      if (!session) return;
      session.handleAction(playerId, payload.type, payload.amount);
    });

    socket.on('cucurucho-decision', (payload: { payIn: boolean }) => {
      const session = getRoomByPlayerId(playerId);
      if (!session) return;
      session.handleCucuruchoPayIn(playerId, payload.payIn);
      emitRoomState(session.code);
    });

    socket.on('chat-message', (payload: ChatPayload) => {
      const session = getRoomByPlayerId(playerId);
      if (!session) return;
      const msg = session.addChatMessage(playerId, payload.text);
      io.to(session.code).emit('chat-message', msg);
    });

    socket.on('request-rebuy', () => {
      const session = getRoomByPlayerId(playerId);
      if (!session) return;
      const ok = session.requestRebuy(playerId);
      if (ok) emitRoomState(session.code);
    });

    socket.on('disconnect', () => {
      const session = getRoomByPlayerId(playerId);
      if (!session) return;
      session.removePlayer(playerId);
      emitRoomState(session.code);
    });
  });
}
