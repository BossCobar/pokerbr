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
    setRaiseAmt(minRaise);
  }, [minRaise]);

  function act(type: ActionType, amount?: number) {
    playSound(type === 'fold' ? 'fold' : type === 'check' ? 'check' : type === 'call' ? 'call' : 'raise');
    onAction(type, amount);
  }

  const presets = [
    { label: '1/3', value: Math.floor(pot / 3) },
    { label: '½', value: Math.floor(pot / 2) },
    { label: 'Pote', value: pot },
  ];

  const potOdds = callAmount > 0 && pot > 0
    ? `${Math.round((pot + callAmount) / callAmount)}:1`
    : null;

  const raiseValid = raiseAmt >= minRaise && myChips > 0;

  return (
    <div className="flex flex-col gap-2 w-full max-w-lg">

      {/* Timer row */}
      {turnTimeLimit > 0 && (
        <div className="flex items-center gap-3">
          <ActionTimer startedAt={turnStartedAt} limitSeconds={turnTimeLimit} />
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[10px] text-gray-600 font-medium uppercase tracking-wider">Sua vez</span>
        </div>
      )}

      {/* Raise control */}
      <div className="rounded-xl px-3 py-2.5 flex flex-col gap-2 border border-white/5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={minRaise}
            max={Math.max(myChips, minRaise)}
            step={Math.max(1, Math.floor(pot / 100) || 1)}
            value={raiseAmt}
            onChange={e => setRaiseAmt(Number(e.target.value))}
            className="flex-1 h-2 accent-yellow-400 cursor-pointer"
          />
          <div className="text-right min-w-[72px]">
            <div className="text-[#c8a84b] font-black text-sm leading-none">{raiseAmt.toLocaleString('pt-BR')}</div>
            {pot > 0 && <div className="text-gray-600 text-[9px] mt-0.5">{Math.round((raiseAmt / pot) * 100)}% pote</div>}
          </div>
        </div>

        {/* Preset chips */}
        <div className="flex gap-1.5">
          {presets.map(p => (
            <button
              key={p.label}
              onClick={() => setRaiseAmt(Math.min(Math.max(p.value, minRaise), myChips))}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all touch-manipulation border border-white/5 hover:border-[#c8a84b]/40 text-gray-300 hover:text-[#c8a84b]"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setRaiseAmt(myChips)}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all touch-manipulation border border-purple-500/20 text-purple-400 hover:border-purple-500/60"
            style={{ background: 'rgba(168,85,247,0.08)' }}
          >
            Max
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {/* Fold */}
        <button
          onClick={() => act('fold')}
          className="py-4 sm:py-3.5 rounded-xl font-black text-sm transition-all touch-manipulation active:scale-95 border border-red-900/40"
          style={{ background: 'linear-gradient(135deg, #7f1d1d, #991b1b)', color: '#fca5a5' }}
        >
          Fold
        </button>

        {/* Check / Call */}
        {canCheck ? (
          <button
            onClick={() => act('check')}
            className="py-4 sm:py-3.5 rounded-xl font-black text-sm transition-all touch-manipulation active:scale-95 border border-white/10"
            style={{ background: 'linear-gradient(135deg, #1f2937, #374151)', color: '#d1d5db' }}
          >
            Check
          </button>
        ) : (
          <button
            onClick={() => act('call')}
            className="py-4 sm:py-3.5 rounded-xl font-black text-sm transition-all touch-manipulation active:scale-95 border border-blue-700/40 flex flex-col items-center justify-center leading-tight"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: '#bfdbfe' }}
          >
            <span className="text-white font-black">Call</span>
            <span className="text-blue-200 text-xs font-semibold opacity-90">{callAmount.toLocaleString('pt-BR')}</span>
            {potOdds && <span className="text-blue-300 text-[9px] opacity-60">{potOdds}</span>}
          </button>
        )}

        {/* Raise */}
        <button
          onClick={() => act('raise', raiseAmt)}
          disabled={!raiseValid}
          className="py-4 sm:py-3.5 rounded-xl font-black text-sm transition-all touch-manipulation active:scale-95 disabled:opacity-30"
          style={{ background: raiseValid ? 'linear-gradient(135deg, #b45309, #c8a84b)' : undefined, color: '#000' }}
        >
          Raise
        </button>

        {/* All-in */}
        <button
          onClick={() => act('allin')}
          className="py-4 sm:py-3.5 rounded-xl font-black text-sm transition-all touch-manipulation active:scale-95 border border-purple-700/40"
          style={{ background: 'linear-gradient(135deg, #581c87, #7c3aed)', color: '#e9d5ff' }}
        >
          All-in
        </button>
      </div>
    </div>
  );
}
