'use client';
import { useEffect, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/lib/store';
import type { ActionType, CreateRoomPayload } from '@/game/types';

export function useGame() {
  const store = useGameStore();
  const socket = getSocket();

  useEffect(() => {
    socket.on('room-state', store.setRoomState);
    socket.on('your-cards', store.setMyCards);
    socket.on('cucurucho-pay-in', ({ potAmount }: { potAmount: number }) => {
      store.setCucuruchoPayIn(true, potAmount);
    });
    socket.on('chat-message', store.addChatMessage);
    return () => {
      socket.off('room-state', store.setRoomState);
      socket.off('your-cards', store.setMyCards);
      socket.off('cucurucho-pay-in');
      socket.off('chat-message', store.addChatMessage);
    };
  }, []);

  const createRoom = useCallback((payload: CreateRoomPayload) => {
    store.setNickname(payload.nickname);
    socket.emit('create-room', payload);
  }, []);

  const joinRoom = useCallback((code: string, nickname: string, asSpectator = false) => {
    store.setNickname(nickname);
    store.setRoomCode(code);
    socket.emit('join-room', { code, nickname, asSpectator });
  }, []);

  const sitDown = useCallback((seatIndex: number) => {
    socket.emit('sit-down', { seatIndex });
  }, []);

  const leaveSeat = useCallback(() => socket.emit('leave-seat'), []);
  const startGame = useCallback(() => socket.emit('start-game'), []);

  const sendAction = useCallback((type: ActionType, amount?: number) => {
    socket.emit('action', { type, amount });
  }, []);

  const sendCucuruchoDecision = useCallback((payIn: boolean) => {
    socket.emit('cucurucho-decision', { payIn });
    store.setCucuruchoPayIn(false, 0);
  }, []);

  const sendChat = useCallback((text: string) => {
    socket.emit('chat-message', { text });
  }, []);

  const requestRebuy = useCallback(() => socket.emit('request-rebuy'), []);

  return {
    ...store,
    createRoom, joinRoom, sitDown, leaveSeat, startGame,
    sendAction, sendCucuruchoDecision, sendChat, requestRebuy,
    myId: socket.id,
  };
}
