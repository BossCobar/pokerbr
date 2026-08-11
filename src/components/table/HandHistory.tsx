'use client';
import { useState } from 'react';
import type { HandAction } from '@/game/types';

const actionLabel: Record<string, string> = {
  fold: 'Fold', check: 'Check', call: 'Call', raise: 'Raise', allin: 'All-in',
};
const streetLabel: Record<string, string> = {
  preflop: 'Pré-flop', flop: 'Flop', turn: 'Turn', river: 'River',
};

export function HandHistory({ actions }: { actions: HandAction[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-black/60 rounded-xl border border-gray-700">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2 text-xs text-gray-400 font-bold uppercase tracking-wider flex justify-between border-b border-gray-700"
      >
        Histórico {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="max-h-48 overflow-y-auto p-2 space-y-0.5">
          {actions.map((a, i) => (
            <div key={i} className="text-xs text-gray-400">
              <span className="text-gray-600">[{streetLabel[a.street] ?? a.street}]</span>{' '}
              <span className="text-white font-medium">{a.nickname}</span>{' '}
              <span className="text-[#c8a84b]">{actionLabel[a.action] ?? a.action}</span>
              {a.amount > 0 && <span className="text-gray-400"> {a.amount.toLocaleString('pt-BR')}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
