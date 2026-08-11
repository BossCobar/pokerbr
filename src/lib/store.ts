import { create } from 'zustand';
import type { RoomState, CardCode, ChatMessage } from '@/game/types';

interface GameStore {
  roomState: RoomState | null;
  myCards: CardCode[];
  nickname: string;
  roomCode: string;
  cucuruchoPayInActive: boolean;
  cucuruchoPayInAmount: number;
  setRoomState: (state: RoomState) => void;
  setMyCards: (cards: CardCode[]) => void;
  setNickname: (n: string) => void;
  setRoomCode: (c: string) => void;
  setCucuruchoPayIn: (active: boolean, amount: number) => void;
  addChatMessage: (msg: ChatMessage) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  roomState: null,
  myCards: [],
  nickname: '',
  roomCode: '',
  cucuruchoPayInActive: false,
  cucuruchoPayInAmount: 0,
  setRoomState: (roomState) => set({ roomState }),
  setMyCards: (myCards) => set({ myCards }),
  setNickname: (nickname) => set({ nickname }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setCucuruchoPayIn: (cucuruchoPayInActive, cucuruchoPayInAmount) =>
    set({ cucuruchoPayInActive, cucuruchoPayInAmount }),
  addChatMessage: (msg) =>
    set((s) => ({
      roomState: s.roomState
        ? { ...s.roomState, chatMessages: [...(s.roomState.chatMessages ?? []).slice(-99), msg] }
        : null,
    })),
}));
