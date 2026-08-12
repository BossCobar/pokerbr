'use client';
import { useState, useEffect } from 'react';
import { ActionTimer } from './ActionTimer';
import type { ActionType } from '@/game/types';
import { playSound } from '@/lib/sounds';

interface Props {
  canCheck: boolean;
  callAmount: number;
  minRaise: number;
  myChips: number;
  pot: number;
  turnStartedAt: number;
  turnTimeLimit: number;
  onAction: (type: ActionType, amount?: number) => void;
}

export function BettingControls({
  canCheck, callAmount, minRaise, myChips, pot, turnStartedAt, turnTimeLimit, onAction,
}: Props) {
  const [raiseAmt, setRaiseAmt] = useState(minRaise);

  useEffect(() => {
    setRaiseAmt(prev => Math.max(prev, minRaise));
  }, [minRaise]);

  function act(type: ActionType, amount?: number) {
    playSound(type === 'fold' ? 'fold' : type === 'check' ? 'check' : type === 'call' ? 'call' : 'raise');
    onAction(type, amount);
  }

  const presets = [
    { label: '1/3', value: Math.floor(pot / 3) },
    { label: '1/2', value: Math.floor(pot / 2) },
    { label: 'Pote', value: pot },
  ];

  // Compute pot odds for the Call button: ratio of (pot + call) to call
  const potOdds = callAmount > 0 && pot > 0
    ? `${Math.round((pot + callAmount) / callAmount)}:1`
    : null;

  return (
    <div className="flex flex-col gap-2 w-full max-w-lg">
      {turnTimeLimit > 0 && (
        <ActionTimer startedAt={turnStartedAt} limitSeconds={turnTimeLimit} />
      )}

      {/* Raise slider */}
      <div className="bg-black/50 rounded-xl px-3 py-2 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={minRaise}
            max={myChips}
            step={1}
            value={raiseAmt}
            onChange={e => setRaiseAmt(Number(e.target.value))}
            className="flex-1 h-2 accent-yellow-400 cursor-pointer"
          />
          <span className="text-[#c8a84b] font-bold text-sm min-w-[64px] text-right">
            {raiseAmt.toLocaleString('pt-BR')}
          </span>
        </div>
        <div className="flex gap-1.5">
          {presets.map(p => (
            <button
              key={p.label}
              onClick={() => setRaiseAmt(Math.min(Math.max(p.value, minRaise), myChips))}
              className="flex-1 text-xs bg-gray-700 active:bg-gray-500 hover:bg-gray-600 text-white px-2 py-1.5 rounded-lg touch-manipulation"
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setRaiseAmt(myChips)}
            className="flex-1 text-xs bg-gray-700 active:bg-gray-500 hover:bg-gray-600 text-white px-2 py-1.5 rounded-lg touch-manipulation"
          >
            Max
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        <button
          onClick={() => act('fold')}
          className="py-3.5 sm:py-3 bg-red-800 active:bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors touch-manipulation text-sm"
        >
          Fold
        </button>
        {canCheck ? (
          <button
            onClick={() => act('check')}
            className="py-3.5 sm:py-3 bg-gray-600 active:bg-gray-400 hover:bg-gray-500 text-white font-bold rounded-xl transition-colors touch-manipulation text-sm"
          >
            Check
          </button>
        ) : (
          <button
            onClick={() => act('call')}
            className="py-3.5 sm:py-3 bg-blue-700 active:bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors touch-manipulation text-sm leading-tight"
          >
            <span className="block">Call</span>
            <span className="block text-xs font-normal opacity-90">{callAmount.toLocaleString('pt-BR')}</span>
            {potOdds && (
              <span className="block text-[10px] font-normal opacity-60">{potOdds}</span>
            )}
          </button>
        )}
        <button
          onClick={() => act('raise', raiseAmt)}
          disabled={myChips <= 0}
          className="py-3.5 sm:py-3 bg-[#c8a84b] active:bg-yellow-300 hover:bg-yellow-400 text-black font-bold rounded-xl transition-colors disabled:opacity-40 touch-manipulation text-sm"
        >
          Raise
        </button>
        <button
          onClick={() => act('allin')}
          className="py-3.5 sm:py-3 bg-purple-700 active:bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl transition-colors touch-manipulation text-sm"
        >
          All-in
        </button>
      </div>
    </div>
  );
}
