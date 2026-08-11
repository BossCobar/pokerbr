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
    { label: '1/3 Pote', value: Math.floor(pot / 3) },
    { label: '1/2 Pote', value: Math.floor(pot / 2) },
    { label: 'Pote', value: pot },
  ];

  return (
    <div className="flex flex-col gap-2 w-full max-w-md">
      {turnTimeLimit > 0 && (
        <ActionTimer startedAt={turnStartedAt} limitSeconds={turnTimeLimit} />
      )}

      {/* Raise slider */}
      <div className="bg-black/50 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={minRaise}
            max={myChips}
            step={1}
            value={raiseAmt}
            onChange={e => setRaiseAmt(Number(e.target.value))}
            className="flex-1 accent-yellow-400"
          />
          <span className="text-[#c8a84b] font-bold text-sm min-w-[60px] text-right">
            {raiseAmt.toLocaleString('pt-BR')}
          </span>
        </div>
        <div className="flex gap-2">
          {presets.map(p => (
            <button
              key={p.label}
              onClick={() => setRaiseAmt(Math.min(Math.max(p.value, minRaise), myChips))}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => act('fold')}
          className="flex-1 py-3 bg-red-800 hover:bg-red-700 text-white font-bold rounded-xl transition-colors"
        >
          Fold
        </button>
        {canCheck ? (
          <button
            onClick={() => act('check')}
            className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-xl transition-colors"
          >
            Check
          </button>
        ) : (
          <button
            onClick={() => act('call')}
            className="flex-1 py-3 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors"
          >
            Call {callAmount.toLocaleString('pt-BR')}
          </button>
        )}
        <button
          onClick={() => act('raise', raiseAmt)}
          disabled={myChips <= 0}
          className="flex-1 py-3 bg-[#c8a84b] hover:bg-yellow-400 text-black font-bold rounded-xl transition-colors disabled:opacity-40"
        >
          Raise
        </button>
        <button
          onClick={() => act('allin')}
          className="flex-1 py-3 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-xl transition-colors"
        >
          All-in
        </button>
      </div>
    </div>
  );
}
