import type { GameMode } from '@/game/types';
import { GameSession } from './game-session';

const rooms = new Map<string, GameSession>();

// O(1) reverse map: socketId → room code.
// Updated on every join-room/create-room and cleared on disconnect.
const socketToRoom = new Map<string, string>();

export function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function createRoom(
  hostSocketId: string,
  hostToken: string,
  nickname: string,
  config: {
    bigBlind: number; startingChips: number; maxSeats: number;
    mode: GameMode; turnTimeLimit: number;
    cucuruchoAnteMultiplier?: number; allowRebuy?: boolean; rebuyAmount?: number;
  },
): GameSession {
  let code = generateCode();
  while (rooms.has(code)) code = generateCode();
  const session = new GameSession(code, hostSocketId, config);
  session.addPlayer(hostSocketId, hostToken, nickname, false);
  rooms.set(code, session);
  return session;
}

export function getRoom(code: string): GameSession | undefined {
  return rooms.get(code);
}

export function deleteRoom(code: string): void {
  rooms.delete(code);
}

/** O(1) lookup by current socket ID */
export function getRoomBySocketId(socketId: string): GameSession | undefined {
  const code = socketToRoom.get(socketId);
  return code ? rooms.get(code) : undefined;
}

/** @deprecated Use getRoomBySocketId */
export function getRoomByPlayerId(socketId: string): GameSession | undefined {
  return getRoomBySocketId(socketId);
}

/** Register a socket → room mapping. If the socket was in a different room, removes it from there first. */
export function registerSocket(socketId: string, roomCode: string): void {
  const oldCode = socketToRoom.get(socketId);
  if (oldCode && oldCode !== roomCode) {
    const oldSession = rooms.get(oldCode);
    if (oldSession) oldSession.removePlayer(socketId);
  }
  socketToRoom.set(socketId, roomCode);
}

export function unregisterSocket(socketId: string): void {
  socketToRoom.delete(socketId);
}

/**
 * Schedule room deletion after 5 minutes if all players remain disconnected.
 * Called after every disconnect. Does nothing while at least one player is connected.
 */
export function maybeCleanupRoom(code: string): void {
  const session = rooms.get(code);
  if (!session) return;
  if (session.players.some(p => p.isConnected)) return;

  setTimeout(() => {
    const s = rooms.get(code);
    if (s && !s.players.some(p => p.isConnected)) {
      rooms.delete(code);
    }
  }, 5 * 60 * 1000);
}

export function clearRooms(): void {
  rooms.clear();
  socketToRoom.clear();
}
