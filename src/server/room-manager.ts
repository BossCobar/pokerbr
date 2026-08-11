import type { GameMode } from '@/game/types';
import { GameSession } from './game-session';

const rooms = new Map<string, GameSession>();

export function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function createRoom(hostId: string, nickname: string, config: {
  bigBlind: number; startingChips: number; maxSeats: number;
  mode: GameMode; turnTimeLimit: number;
  cucuruchoAnteMultiplier?: number; allowRebuy?: boolean; rebuyAmount?: number;
}): GameSession {
  let code = generateCode();
  while (rooms.has(code)) code = generateCode();
  const session = new GameSession(code, hostId, config);
  session.addPlayer(hostId, nickname, false);
  rooms.set(code, session);
  return session;
}

export function getRoom(code: string): GameSession | undefined {
  return rooms.get(code);
}

export function deleteRoom(code: string): void {
  rooms.delete(code);
}

export function getRoomByPlayerId(playerId: string): GameSession | undefined {
  for (const session of rooms.values()) {
    if (session.hasPlayer(playerId)) return session;
  }
  return undefined;
}
