import type { GameState, Player } from './types';

export function isCucuruchoHand(state: GameState): boolean {
  if (state.mode !== 'cucurucho') return false;
  return state.dealerIndex === state.cucuruchoIndex;
}

export function advanceCucuruchoButton(state: GameState, totalSeats: number): GameState {
  return {
    ...state,
    cucuruchoIndex: (state.cucuruchoIndex + 1) % totalSeats,
  };
}

export function cucuruchoAnteAmount(bigBlind: number): number {
  return bigBlind * 10;
}

export function applyCucuruchoAntes(players: Player[], anteAmount: number): { players: Player[]; totalAnte: number } {
  let totalAnte = 0;
  const updated = players.map(p => {
    if (p.seatIndex === null || p.status === 'spectating') return p;
    const amount = Math.min(anteAmount, p.chips);
    totalAnte += amount;
    return {
      ...p,
      chips: p.chips - amount,
      bet: p.bet + amount,
      totalBet: p.totalBet + amount,
      status: (p.chips - amount <= 0 ? 'allin' : p.status) as Player['status'],
    };
  });
  return { players: updated, totalAnte };
}

export function getCucuruchoPayInAmount(potSnapshot: number): number {
  return potSnapshot;
}
