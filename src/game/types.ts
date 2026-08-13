export type Suit = 'c' | 'd' | 'h' | 's';
export type Rank = '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'T'|'J'|'Q'|'K'|'A';
export type CardCode = string; // e.g. 'As', 'Kh', '2c'

export type GameMode = 'holdem' | 'cucurucho';

export type PlayerStatus = 'waiting' | 'active' | 'folded' | 'allin' | 'sitting-out' | 'spectating';

export interface Player {
  id: string;    // socket.id — changes on every reconnect
  token: string; // stable UUID from localStorage — survives reconnects
  nickname: string;
  seatIndex: number | null; // null = spectator
  chips: number;
  status: PlayerStatus;
  bet: number;           // current street bet
  totalBet: number;      // total bet this hand
  holeCards: CardCode[]; // empty until dealt (server only sends own cards to client)
  isDealer: boolean;
  isSB: boolean;
  isBB: boolean;
  stats: PlayerStats;
  isConnected: boolean;
  lastAction?: string;   // e.g. "Fold", "Call 20", "Raise 60", "Check", "All-in"
}

export interface PlayerStats {
  handsPlayed: number;
  handsWon: number;
  biggestPot: number;
  totalWinnings: number;
  vpipHands: number; // voluntarily put $ in pre-flop
}

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'allin' | 'ante';

export interface HandAction {
  playerId: string;
  nickname: string;
  action: ActionType;
  amount: number;
  street: Street;
}

export interface HandResult {
  winnerId: string;
  winnerNickname: string;
  potWon: number;
  handName: string;
  handCards: CardCode[];
  allHands: { playerId: string; nickname: string; cards: CardCode[]; handName: string }[];
}

export type GamePhase =
  | 'waiting'      // not enough players
  | 'starting'     // countdown before hand
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'result';      // showing result before next hand

export interface GameState {
  phase: GamePhase;
  mode: GameMode;
  communityCards: CardCode[];
  pot: number;
  sidePots: { amount: number; eligiblePlayerIds: string[] }[];
  currentPlayerIndex: number; // index into seated players
  dealerIndex: number;
  cucuruchoIndex: number;
  cucuruchoActive: boolean;
  cucuruchoPotSnapshot: number; // pot at flop reveal for cucurucho pay-in
  street: Street;
  minRaise: number;
  currentBet: number;
  bigBlind: number;
  smallBlind: number;
  startingChips: number;
  actionHistory: HandAction[];
  lastResult: HandResult | null;
  handNumber: number;
  turnTimeLimit: number; // seconds
  turnStartedAt: number; // Date.now()
}

export interface RoomConfig {
  bigBlind: number;
  smallBlind: number;
  startingChips: number;
  maxSeats: number;
  mode: GameMode;
  turnTimeLimit: number;
  cucuruchoAnteMultiplier: number;
  allowRebuy: boolean;
  rebuyAmount: number;
}

export interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  game: GameState | null;
  chatMessages: ChatMessage[];
  maxSeats: number;
  config: RoomConfig;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  text: string;
  timestamp: number;
}

// Socket event payloads
export interface JoinRoomPayload { code: string; nickname: string; asSpectator?: boolean }
export interface SitDownPayload { seatIndex: number }
export interface ActionPayload { type: ActionType; amount?: number }
export interface ChatPayload { text: string }
export interface CreateRoomPayload {
  nickname: string;
  bigBlind: number;
  startingChips: number;
  maxSeats: number;
  mode: GameMode;
  turnTimeLimit: number;
  cucuruchoAnteMultiplier?: number;
  allowRebuy?: boolean;
  rebuyAmount?: number;
}
